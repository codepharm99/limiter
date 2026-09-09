import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useDirections } from '../data/useDirections'
import { useSessions } from '../data/useSessions'
import type { Session } from '../domain/types'
import { splitParallel } from '../domain/parallel'
import { weekEnd, weekStart } from '../domain/week'
import { useTimerStore } from './timerStore'

/**
 * Mirrors the timer into the `sessions` table: a running row on start, a finished
 * one (or a parallel pair) when the completion dialog is saved.
 */
export function useSessionSync() {
  const [from, to] = useMemo(() => {
    const now = new Date()
    return [weekStart(now), weekEnd(now)] as const
  }, [])
  const { start, finish, insertMany, remove } = useSessions(from, to)
  const { other } = useDirections()
  const status = useTimerStore((s) => s.status)
  const mode = useTimerStore((s) => s.mode)
  const sessionRowId = useTimerStore((s) => s.sessionRowId)
  const discardedRowId = useTimerStore((s) => s.discardedRowId)
  const creating = useRef<Promise<Session> | null>(null)

  useEffect(() => {
    if (status !== 'running' || mode !== 'work' || sessionRowId || creating.current) return
    const st = useTimerStore.getState()
    const request = start({
      direction_id: st.directionIds[0] ?? other?.id ?? null,
      task_id: st.taskId,
      mode: 'work',
      planned_sec: st.plannedSec,
    })
    creating.current = request
    request
      .then((row) => useTimerStore.getState().setSessionRowId(row.id))
      .catch((e) => console.error(e))
      .finally(() => {
        creating.current = null
      })
  }, [status, mode, sessionRowId, start, other?.id])

  // A work session dropped before 5 minutes leaves no trace: its running row goes away.
  // Only an explicit mark from the store counts, so a reload mid-dialog cannot delete a real block.
  useEffect(() => {
    if (!discardedRowId) return
    useTimerStore.getState().clearDiscarded()
    remove(discardedRowId).catch((e) => console.error(e))
  }, [discardedRowId, remove])

  const save = useCallback(
    async (note: string | null, energy: number | null) => {
      const st = useTimerStore.getState()
      const pending = st.pendingCompletion
      let id = st.sessionRowId ?? pending?.rowId ?? null
      if (pending && !id) {
        const row = await (creating.current ?? start({
          direction_id: pending.directionIds[0] ?? other?.id ?? null,
          task_id: pending.taskId,
          mode: 'work',
          planned_sec: pending.actualSec,
        }))
        id = row.id
        useTimerStore.getState().setSessionRowId(id)
      }
      if (pending && id) {
        if (pending.directionIds.length > 1) {
          const parts = splitParallel(pending.actualSec, pending.directionIds)
          const startedAt = new Date(Date.now() - pending.actualSec * 1000).toISOString()
          await finish(id, {
            actual_sec: parts[0].actual_sec,
            status: 'done',
            note,
            energy,
          })
          await insertMany([
            {
              direction_id: parts[1].direction_id,
              task_id: pending.taskId,
              mode: 'work',
              planned_sec: parts[1].actual_sec,
              actual_sec: parts[1].actual_sec,
              note,
              energy,
              parallel_group: id,
              started_at: startedAt,
              ended_at: new Date().toISOString(),
              status: 'done',
            },
          ])
        } else {
          await finish(id, { actual_sec: pending.actualSec, status: 'done', note, energy })
        }
      }
      useTimerStore.getState().clearCompletion()
    },
    [finish, insertMany, start, other?.id],
  )

  return { save }
}
