import { describe, it, expect } from 'vitest'
import { aggregateWeek } from '../../src/domain/limiter'
import { dir, plan, session, task } from './fixtures'

const today = new Date(2026, 8, 9) // Wednesday
const at = (d: Date) => d.toISOString()
const base = { directions: [], tasks: [], sessions: [], dayPlans: [], today, cap: 40 }

describe('aggregateWeek', () => {
  it('fills done, partial and left cells', () => {
    const d = dir({ budget_blocks: 4 })
    const week = aggregateWeek({
      ...base,
      directions: [d],
      sessions: [
        session({ direction_id: d.id, actual_sec: 1500 }),
        session({ direction_id: d.id, actual_sec: 1500 }),
        session({ direction_id: d.id, actual_sec: 750 }),
      ],
    })
    const agg = week.directions[0]
    expect(agg.done).toBe(2.5)
    expect(agg.budget).toBe(4)
    expect(agg.cells.map(c => c.state)).toEqual(['done', 'done', 'partial', 'left'])
    expect(agg.cells[2].fill).toBe(0.5)
    expect(week.total).toBe(2.5)
    expect(week.cap).toBe(40)
  })

  it("marks today's planned cells", () => {
    const d = dir({ budget_blocks: 4 })
    const week = aggregateWeek({
      ...base,
      directions: [d],
      sessions: [
        session({ direction_id: d.id, actual_sec: 1500 }),
        session({ direction_id: d.id, actual_sec: 1500 }),
        session({ direction_id: d.id, actual_sec: 750 }),
      ],
      dayPlans: [plan({ direction_id: d.id, date: '2026-09-09', planned_blocks: 1 })],
    })
    expect(week.directions[0].cells.map(c => c.state)).toEqual(['done', 'done', 'partial', 'today'])
  })

  it('ignores day plans of other days', () => {
    const d = dir({ budget_blocks: 2 })
    const week = aggregateWeek({
      ...base,
      directions: [d],
      dayPlans: [plan({ direction_id: d.id, date: '2026-09-10', planned_blocks: 2 })],
    })
    expect(week.directions[0].cells.map(c => c.state)).toEqual(['left', 'left'])
  })

  it('adds over cells past the budget', () => {
    const d = dir({ budget_blocks: 2 })
    const week = aggregateWeek({
      ...base,
      directions: [d],
      sessions: [
        session({ direction_id: d.id }),
        session({ direction_id: d.id }),
        session({ direction_id: d.id }),
      ],
    })
    const agg = week.directions[0]
    expect(agg.done).toBe(3)
    expect(agg.cells.map(c => c.state)).toEqual(['done', 'done', 'over'])
    expect(agg.cells[2].fill).toBe(1)
  })

  it('puts sessions without a direction into other, without a budget', () => {
    const other = dir({ name: 'другое', is_system: true, budget_blocks: 0 })
    const d = dir({ budget_blocks: 2 })
    const week = aggregateWeek({
      ...base,
      directions: [other, d],
      sessions: [
        session({ direction_id: null, actual_sec: 750 }),
        session({ direction_id: other.id, actual_sec: 750 }),
      ],
    })
    expect(week.directions.map(x => x.direction.id)).toEqual([d.id])
    expect(week.other.direction.id).toBe(other.id)
    expect(week.other.done).toBe(1)
    expect(week.other.budget).toBe(0)
    expect(week.other.cells.map(c => c.state)).toEqual(['done'])
    expect(week.total).toBe(1)
  })

  it('never marks the system direction as over', () => {
    const other = dir({ is_system: true, budget_blocks: 0 })
    const week = aggregateWeek({
      ...base,
      directions: [other],
      sessions: [session({ direction_id: other.id, actual_sec: 750 })],
    })
    expect(week.other.done).toBe(0.5)
    expect(week.other.cells).toEqual([{ state: 'partial', fill: 0.5 }])
    expect(week.total).toBe(0.5)
  })

  it('gives an empty other when no system direction exists', () => {
    const week = aggregateWeek({ ...base, sessions: [session({ direction_id: null })] })
    expect(week.other.done).toBe(1)
    expect(week.other.direction.is_system).toBe(true)
    expect(week.total).toBe(1)
  })

  it('ignores break modes and unfinished sessions', () => {
    const d = dir({ budget_blocks: 4 })
    const week = aggregateWeek({
      ...base,
      directions: [d],
      sessions: [
        session({ direction_id: d.id, mode: 'break' }),
        session({ direction_id: d.id, mode: 'break' }),
        session({ direction_id: d.id, status: 'aborted' }),
        session({ direction_id: d.id, status: 'running' }),
        session({ direction_id: d.id, status: 'skipped', actual_sec: 1500 }),
      ],
    })
    expect(week.directions[0].done).toBe(0)
    expect(week.total).toBe(0)
  })

  it('ignores sessions outside the week', () => {
    const d = dir({ budget_blocks: 4 })
    const week = aggregateWeek({
      ...base,
      directions: [d],
      sessions: [
        session({ direction_id: d.id, started_at: at(new Date(2026, 8, 6, 23, 59)) }),
        session({ direction_id: d.id, started_at: at(new Date(2026, 8, 14, 0, 0)) }),
        session({ direction_id: d.id, started_at: at(new Date(2026, 8, 13, 23, 59)) }),
      ],
    })
    expect(week.directions[0].done).toBe(1)
  })

  it('sums blocks per task', () => {
    const d = dir({ budget_blocks: 4 })
    const t1 = task({ direction_id: d.id })
    const t2 = task({ direction_id: d.id })
    const week = aggregateWeek({
      ...base,
      directions: [d],
      tasks: [t1, t2],
      sessions: [
        session({ direction_id: d.id, task_id: t1.id }),
        session({ direction_id: d.id, task_id: t1.id, actual_sec: 750 }),
        session({ direction_id: d.id, task_id: t2.id, actual_sec: 0 }),
      ],
    })
    const tasks = week.directions[0].tasks
    expect(tasks.map(x => x.task.id)).toEqual([t1.id, t2.id])
    expect(tasks[0].done).toBe(1.5)
    expect(tasks[1].done).toBe(0)
  })

  it('skips archived directions', () => {
    const d = dir({ budget_blocks: 2, archived_at: '2026-09-01T00:00:00.000Z' })
    const week = aggregateWeek({ ...base, directions: [d] })
    expect(week.directions).toEqual([])
  })
})
