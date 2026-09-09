import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { useTimerStore, initialState, migrateTimerState } from '../../src/timer/timerStore'

const s = useTimerStore.getState

vi.useFakeTimers()
vi.setSystemTime(new Date('2026-09-07T09:00:00'))
afterAll(() => vi.useRealTimers())

describe('timerStore', () => {
  beforeEach(() => {
    useTimerStore.setState(initialState)
  })

  it('counts down from endsAt', () => {
    s().start()
    const t0 = Date.now()
    s().tick(t0 + 5000)
    expect(s().remainingSec).toBe(1495)
    expect(s().status).toBe('running')
  })

  it('pauses and resumes from the remaining time', () => {
    s().start()
    vi.advanceTimersByTime(5000)
    s().tick(Date.now())
    s().pause()
    expect(s().status).toBe('paused')
    expect(s().endsAt).toBeNull()
    expect(s().remainingSec).toBe(1495)
    s().resume()
    expect(s().status).toBe('running')
    expect(s().endsAt).toBe(Date.now() + 1495 * 1000)
  })

  it('completes work and queues completion', () => {
    s().start()
    s().tick(Date.now() + 1500_000 + 10)
    expect(s().pendingCompletion?.actualSec).toBe(1500)
    expect(s().mode).toBe('break')
    expect(s().sessionNo).toBe(1)
    expect(s().status).toBe('idle')
  })

  it('completing work queues a break', () => {
    for (let i = 0; i < 4; i++) {
      s().setMode('work')
      s().start()
      s().tick(Date.now() + 1500_000 + 10)
      s().clearCompletion()
    }
    expect(s().mode).toBe('break')
    expect(s().sessionNo).toBe(4)
  })

  it('finishing a break returns to work without a completion', () => {
    s().setMode('break')
    s().start()
    s().tick(Date.now() + 300_000 + 10)
    expect(s().mode).toBe('work')
    expect(s().pendingCompletion).toBeNull()
    expect(s().sessionNo).toBe(0)
  })

  it('skip records a task that finished early', () => {
    s().start()
    s().tick(Date.now() + 60_000)
    s().skip()
    expect(s().pendingCompletion?.actualSec).toBe(60)
    expect(s().sessionNo).toBe(1)
    expect(s().status).toBe('idle')
  })

  it('skip over 5 minutes keeps partial', () => {
    s().start()
    s().tick(Date.now() + 600_000)
    s().skip()
    expect(s().pendingCompletion?.actualSec).toBe(600)
    expect(s().sessionNo).toBe(1)
    expect(s().mode).toBe('break')
  })

  it('carries the target into the completion', () => {
    s().setTarget(['d1'], 't1')
    s().start()
    s().tick(Date.now() + 1500_000)
    expect(s().pendingCompletion).toEqual({ actualSec: 1500, directionIds: ['d1'], taskId: 't1', rowId: null })
  })

  it('resets the session counter on a new day', () => {
    s().start()
    s().tick(Date.now() + 1500_000)
    s().clearCompletion()
    expect(s().sessionNo).toBe(1)
    vi.setSystemTime(new Date('2026-09-08T09:00:00'))
    s().setMode('work')
    s().start()
    s().tick(Date.now() + 1500_000)
    expect(s().sessionNo).toBe(1)
    vi.setSystemTime(new Date('2026-09-07T09:00:00'))
  })

  it('setDuration retargets an idle timer', () => {
    s().setDuration('work', 2700)
    expect(s().remainingSec).toBe(2700)
    s().start()
    expect(s().endsAt).toBe(Date.now() + 2700_000)
  })

  it('toggleParallel drops the second direction when turned off', () => {
    s().setTarget(['d1', 'd2'], null)
    s().toggleParallel()
    expect(s().parallel).toBe(true)
    s().toggleParallel()
    expect(s().parallel).toBe(false)
    expect(s().directionIds).toEqual(['d1'])
  })

  it('keeps the planned duration when the preset changes mid-run', () => {
    s().start()
    const t0 = Date.now()
    s().tick(t0 + 60_000)
    s().setDuration('work', 3000)
    expect(s().plannedSec).toBe(1500)
    s().tick(t0 + 1500_000)
    expect(s().pendingCompletion?.actualSec).toBe(1500)
  })

  it('keeps the real elapsed time when skipping after a preset change', () => {
    useTimerStore.setState({ sessionRowId: 'row-kept' })
    s().start()
    s().tick(Date.now() + 1200_000)
    s().setDuration('work', 300)
    s().skip()
    expect(s().pendingCompletion?.actualSec).toBe(1200)
    expect(s().sessionRowId).toBe('row-kept')
    expect(s().discardedRowId).toBeNull()
  })

  it('migrates a v1 snapshot to the stored work duration', () => {
    const v1 = {
      mode: 'work' as const,
      durations: { work: 3000, short: 300, long: 900 },
      status: 'running' as const,
      endsAt: Date.now() + 3000_000,
      remainingSec: 2400,
      sessionNo: 2,
      sessionNoDate: '2026-09-07',
      directionIds: [],
      taskId: null,
      parallel: false,
      sessionRowId: 'row-v1',
    }
    const migrated = migrateTimerState(v1, 1)
    expect(migrated.plannedSec).toBe(3000)
    expect(migrated.pendingCompletion).toBeNull()
    expect(migrated.discardedRowId).toBeNull()
    expect(migrated.remainingSec).toBe(2400)
    expect(migrated.sessionRowId).toBe('row-v1')
    expect(migrateTimerState({ mode: 'short', durations: { work: 1500, short: 300 } }, 1).plannedSec).toBe(300)
    expect(migrateTimerState(undefined, 1).plannedSec).toBe(initialState.plannedSec)
  })

  it('merges short and long breaks into one break mode', () => {
    const migrated = migrateTimerState({ mode: 'long', durations: { work: 1500, short: 300, long: 900 } }, 3)
    expect(migrated.mode).toBe('break')
    expect(migrated.durations).toEqual({ work: 1500, break: 300 })
  })

  it('leaves a v4 snapshot untouched', () => {
    const v4 = { plannedSec: 2700, mode: 'work' as const }
    expect(migrateTimerState(v4, 4)).toEqual(v4)
  })

  it('persists pendingCompletion so the dialog survives a reload', () => {
    s().start()
    s().tick(Date.now() + 1500_000)
    const raw = JSON.parse(localStorage.getItem('lim.timer')!)
    expect(raw.state.pendingCompletion.actualSec).toBe(1500)
    expect(raw.state.plannedSec).toBe(300)
    expect(raw.state.sessionNo).toBe(1)
  })

  it('keeps the row on an early finish and on a full completion', () => {
    useTimerStore.setState({ sessionRowId: 'row-1' })
    s().start()
    s().tick(Date.now() + 60_000)
    s().skip()
    expect(s().discardedRowId).toBeNull()
    expect(s().sessionRowId).toBe('row-1')
    s().clearDiscarded()
    expect(s().discardedRowId).toBeNull()

    useTimerStore.setState({ sessionRowId: 'row-2' })
    s().setMode('work')
    s().start()
    s().tick(Date.now() + 1500_000)
    expect(s().discardedRowId).toBeNull()
    expect(s().sessionRowId).toBe('row-2')
  })

  it('discards the row when the mode changes mid-run', () => {
    useTimerStore.setState({ sessionRowId: 'row-3' })
    s().start()
    s().tick(Date.now() + 60_000)
    s().setMode('break')
    expect(s().discardedRowId).toBe('row-3')
    expect(s().sessionRowId).toBeNull()
  })
})

describe('persist migration integration', () => {
  it('rehydrates a legacy unversioned custom timer', async () => {
    localStorage.setItem('lim.timer', JSON.stringify({ version: 0, state: { ...initialState, plannedSec: undefined, durations: { work: 2700, break: 300 }, status: 'paused', remainingSec: 2400 } }))
    await useTimerStore.persist.rehydrate()
    expect(s().plannedSec).toBe(2700)
    expect(s().remainingSec).toBe(2400)
    expect(JSON.parse(localStorage.getItem("lim.timer")!).version).toBe(4)
  })
  it('preserves a pinned duration from the first fix round', () => {
    expect(migrateTimerState({ plannedSec: 2700, durations: { work: 1500, break: 300 } }, 0).plannedSec).toBe(2700)
  })
})
