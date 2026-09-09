import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { isoDate } from '../domain/week'
import type { Mode } from '../domain/types'

export interface PendingCompletion {
  actualSec: number
  directionIds: string[]
  taskId: string | null
  /** Running row of the block being closed; save() finishes it. Null when none was created. */
  rowId: string | null
}

export interface TimerState {
  mode: Mode
  durations: Record<Mode, number>
  status: 'idle' | 'running' | 'paused'
  endsAt: number | null
  remainingSec: number
  /** Duration the current run was started with. Preset changes mid-run never touch it. */
  plannedSec: number
  sessionNo: number
  sessionNoDate: string
  directionIds: string[]
  taskId: string | null
  parallel: boolean
  sessionRowId: string | null
  /** Row of a work session that was thrown away; the sync hook deletes it and clears this. */
  discardedRowId: string | null
  pendingCompletion: PendingCompletion | null
}

export interface TimerActions {
  setMode(m: Mode): void
  setDuration(m: Mode, sec: number): void
  start(): void
  pause(): void
  resume(): void
  skip(): void
  tick(now: number): void
  setTarget(directionIds: string[], taskId: string | null): void
  /** Confirm a mid-run focus change: close the block, queue its dialog, start the new direction. */
  switchTarget(directionIds: string[], taskId: string | null): void
  toggleParallel(): void
  setSessionRowId(id: string | null): void
  clearCompletion(): void
  clearDiscarded(): void
}

export const initialState: TimerState = {
  mode: 'work',
  durations: { work: 1500, break: 300 },
  status: 'idle',
  endsAt: null,
  remainingSec: 1500,
  plannedSec: 1500,
  sessionNo: 0,
  sessionNoDate: '',
  directionIds: [],
  taskId: null,
  parallel: false,
  sessionRowId: null,
  discardedRowId: null,
  pendingCompletion: null,
}

/**
 * v1 snapshots predate `plannedSec`; v3 predates the merged break mode.
 */
export function migrateTimerState(persisted: unknown, version: number): Partial<TimerState> {
  const st = (persisted ?? {}) as { mode?: string; durations?: Record<string, number | undefined>; plannedSec?: number; pendingCompletion?: PendingCompletion & { rowId?: string | null }; discardedRowId?: string | null }
  if (version >= 4) return st as Partial<TimerState>
  const durations = st.durations ?? {}
  const mode: Mode = st.mode === 'short' || st.mode === 'long' ? 'break' : (st.mode as Mode) ?? initialState.mode
  const merged = { work: durations.work ?? 1500, break: durations.break ?? durations.short ?? durations.long ?? 300 }
  const stored = st.pendingCompletion
  const pending = stored ? { ...stored, rowId: stored.rowId ?? null } : null
  return {
    ...(st as Partial<TimerState>),
    mode,
    durations: merged,
    plannedSec: st.plannedSec ?? merged[mode] ?? initialState.plannedSec,
    pendingCompletion: pending,
    discardedRowId: st.discardedRowId ?? null,
  }
}

export const useTimerStore = create<TimerState & TimerActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setMode(m) {
        const st = get()
        set({
          mode: m,
          status: 'idle',
          endsAt: null,
          remainingSec: st.durations[m],
          plannedSec: st.durations[m],
          ...discardRun(st),
        })
      },

      setDuration(m, sec) {
        const st = get()
        const durations = { ...st.durations, [m]: sec }
        const retarget = st.mode === m && st.status === 'idle'
        set({ durations, ...(retarget ? { remainingSec: sec, plannedSec: sec } : null) })
      },

      start() {
        const st = get()
        set({
          status: 'running',
          endsAt: Date.now() + st.remainingSec * 1000,
          plannedSec: st.status === 'idle' ? st.durations[st.mode] : st.plannedSec,
        })
      },

      pause() {
        const { status, endsAt } = get()
        if (status !== 'running' || endsAt === null) return
        set({
          status: 'paused',
          endsAt: null,
          remainingSec: Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)),
        })
      },

      resume() {
        get().start()
      },

      skip() {
        const st = get()
        if (st.status === 'idle') return
        if (st.mode !== 'work') {
          set({
            mode: 'work',
            status: 'idle',
            endsAt: null,
            remainingSec: st.durations.work,
            plannedSec: st.durations.work,
          })
          return
        }
        const elapsed = Math.max(0, st.plannedSec - st.remainingSec)
        if (elapsed <= 0) {
          // Nothing elapsed, so there is no result to log.
          set({
            status: 'idle',
            endsAt: null,
            remainingSec: st.durations.work,
            plannedSec: st.durations.work,
            ...discardRun(st),
          })
          return
        }
        finishWork(set, st, elapsed)
      },

      tick(now) {
        const st = get()
        if (st.status !== 'running' || st.endsAt === null) return
        const remaining = Math.max(0, Math.ceil((st.endsAt - now) / 1000))
        if (remaining > 0) {
          set({ remainingSec: remaining })
          return
        }
        if (st.mode !== 'work') {
          set({
            mode: 'work',
            status: 'idle',
            endsAt: null,
            remainingSec: st.durations.work,
            plannedSec: st.durations.work,
          })
          return
        }
        finishWork(set, st, st.plannedSec)
      },

      setTarget(directionIds, taskId) {
        set({ directionIds, taskId })
      },

      switchTarget(directionIds, taskId) {
        const st = get()
        if (st.mode !== 'work' || st.status === 'idle') {
          set({ directionIds, taskId })
          return
        }
        const elapsed = Math.max(0, st.plannedSec - st.remainingSec)
        // Hand the running row over so save() can finish it instead of leaving it dangling.
        const rowId = st.sessionRowId
        set({
          status: 'running',
          endsAt: Date.now() + st.durations.work * 1000,
          remainingSec: st.durations.work,
          plannedSec: st.durations.work,
          sessionRowId: null,
          directionIds,
          taskId,
          ...(elapsed > 0
            ? {
                pendingCompletion: {
                  actualSec: elapsed,
                  directionIds: st.directionIds,
                  taskId: st.taskId,
                  rowId,
                },
              }
            : { ...discardRun(st) }),
        })
      },

      toggleParallel() {
        const st = get()
        const parallel = !st.parallel
        set({ parallel, directionIds: parallel ? st.directionIds : st.directionIds.slice(0, 1) })
      },

      setSessionRowId(id) {
        set({ sessionRowId: id })
      },

      clearCompletion() {
        set({ pendingCompletion: null, sessionRowId: null })
      },

      clearDiscarded() {
        set({ discardedRowId: null })
      },
    }),
    {
      name: 'lim.timer',
      version: 4,
      migrate: migrateTimerState,
      partialize: ({
        mode,
        durations,
        status,
        endsAt,
        remainingSec,
        plannedSec,
        sessionNo,
        sessionNoDate,
        directionIds,
        taskId,
        parallel,
        sessionRowId,
        discardedRowId,
        pendingCompletion,
      }) => ({
        mode,
        durations,
        status,
        endsAt,
        remainingSec,
        plannedSec,
        sessionNo,
        sessionNoDate,
        directionIds,
        taskId,
        parallel,
        sessionRowId,
        discardedRowId,
        pendingCompletion,
      }),
    },
  ),
)

/** Hand the running work row over for deletion when its run is abandoned. */
function discardRun(st: TimerState): Partial<TimerState> {
  if (st.status === 'idle' || st.mode !== 'work' || !st.sessionRowId) return {}
  return { sessionRowId: null, discardedRowId: st.sessionRowId }
}

/** Close a work session: count it, queue the dialog, move on to the earned break. */
function finishWork(
  set: (partial: Partial<TimerState>) => void,
  st: TimerState,
  actualSec: number,
) {
  const today = isoDate(new Date())
  const sessionNo = st.sessionNoDate === today ? st.sessionNo + 1 : 1
  set({
    status: 'idle',
    endsAt: null,
    mode: 'break',
    remainingSec: st.durations.break,
    plannedSec: st.durations.break,
    sessionNo,
    sessionNoDate: today,
    pendingCompletion: {
      actualSec,
      directionIds: st.directionIds,
      taskId: st.taskId,
      rowId: st.sessionRowId,
    },
  })
}
