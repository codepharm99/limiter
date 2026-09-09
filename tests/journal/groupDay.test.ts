import { describe, expect, it } from 'vitest'
import { groupDay, weeksSeries } from '../../src/domain/journal'
import { dir, session, task } from '../domain/fixtures'

describe('journal grouping', () => {
  it('counts finished work, ignores missing energy, and groups tasks', () => {
    const d = dir(); const tk = task({ direction_id: d.id })
    const result = groupDay([
      session({ direction_id: d.id, task_id: tk.id, energy: 4 }),
      session({ direction_id: d.id, energy: null }),
      session({ direction_id: d.id, energy: 9 }),
      session({ mode: 'break', energy: 1 }), session({ status: 'aborted' }),
    ], [d], [tk])
    expect(result.blocks).toBe(3)
    expect(result.hours).toBe(1.3)
    expect(result.energy).toBe(6.5)
    expect(result.groups[0].tasks[0].blocks).toBe(1)
  })
  it('calculates shares from seconds without rounding drift', () => {
    const a = dir(); const b = dir(); const c = dir()
    const result = groupDay([a,b,c].map((d) => session({ direction_id: d.id, actual_sec: 500 })), [a,b,c], [])
    expect(result.groups.reduce((sum, g) => sum + g.share, 0)).toBeCloseTo(1)
    expect(result.groups[0].share).toBeCloseTo(1/3)
  })
  it('keeps unknown and unassigned work in other', () => {
    const other = dir({ is_system: true })
    const result = groupDay([session(), session({ direction_id: 'archived' })], [other], [])
    expect(result.groups).toHaveLength(1)
    expect(result.groups[0].direction.id).toBe(other.id)
    expect(result.groups[0].blocks).toBe(2)
  })
  it('supports empty days and zero-duration sessions', () => {
    expect(groupDay([], [], [])).toEqual({ blocks: 0, hours: 0, energy: null, groups: [] })
    expect(groupDay([session({ actual_sec: 0 })], [], []).groups[0].share).toBe(0)
  })
  it('uses local Monday boundaries and includes empty weeks', () => {
    const d = dir()
    const points = weeksSeries([
      session({ direction_id: d.id, started_at: new Date(2026,8,6,23,59).toISOString() }),
      session({ direction_id: d.id, started_at: new Date(2026,8,7).toISOString() }),
      session({ direction_id: d.id, started_at: new Date(2026,8,14).toISOString() }),
      session({ mode: 'break' }),
    ], [d], [new Date(2026,8,7), new Date(2026,8,14), new Date(2026,8,21)])
    expect(points.map((p) => p.total)).toEqual([1,1,0])
    expect(points[0][d.id]).toBe(1)
    expect(points[0].week).toBe('2026-09-07')
  })
  it('aggregates split seconds before rounding', () => {
    const points = weeksSeries([session({ actual_sec: 751 }), session({ actual_sec: 750 })], [], [new Date(2026,8,7)])
    expect(points[0].other).toBe(1)
    expect(points[0].total).toBe(1)
  })
})
