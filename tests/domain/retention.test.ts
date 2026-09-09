import { describe, it, expect } from 'vitest'
import { visibleFrom } from '../../src/domain/retention'
import { isoDate } from '../../src/domain/week'

describe('visibleFrom', () => {
  it('is unlimited for pro', () => {
    expect(visibleFrom(true, new Date(2026, 8, 9))).toBeNull()
  })
  it('is the current week start for free', () => {
    expect(isoDate(visibleFrom(false, new Date(2026, 8, 9))!)).toBe('2026-09-07')
  })
})
