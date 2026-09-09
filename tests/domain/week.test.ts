import { describe, it, expect } from 'vitest'
import { isoDate, weekDays, weekEnd, weekStart } from '../../src/domain/week'

describe('week', () => {
  it('starts the week on Monday', () => {
    expect(isoDate(weekStart(new Date(2026, 8, 9)))).toBe('2026-09-07')
    expect(isoDate(weekStart(new Date(2026, 8, 7)))).toBe('2026-09-07')
  })
  it('puts Sunday in the previous week', () => {
    expect(isoDate(weekStart(new Date(2026, 8, 6)))).toBe('2026-08-31')
  })
  it('ends the week at the next Monday, exclusive', () => {
    expect(isoDate(weekEnd(new Date(2026, 8, 9)))).toBe('2026-09-14')
    expect(weekEnd(new Date(2026, 8, 9)).getHours()).toBe(0)
  })
  it('lists 7 days Monday through Sunday', () => {
    const days = weekDays(new Date(2026, 8, 9)).map(isoDate)
    expect(days).toHaveLength(7)
    expect(days[0]).toBe('2026-09-07')
    expect(days[6]).toBe('2026-09-13')
  })
  it('formats local dates', () => {
    expect(isoDate(new Date(2026, 0, 1, 23, 30))).toBe('2026-01-01')
  })
})
