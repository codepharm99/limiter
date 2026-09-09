import { describe, it, expect } from 'vitest'
import { splitParallel } from '../../src/domain/parallel'

describe('splitParallel', () => {
  it('splits evenly', () => {
    expect(splitParallel(1500, ['a', 'b'])).toEqual([
      { direction_id: 'a', actual_sec: 750 },
      { direction_id: 'b', actual_sec: 750 },
    ])
  })
  it('gives the remainder to the first direction', () => {
    const out = splitParallel(1501, ['a', 'b'])
    expect(out[0].actual_sec).toBe(751)
    expect(out[1].actual_sec).toBe(750)
  })
  it('keeps the total', () => {
    const out = splitParallel(1000, ['a', 'b', 'c'])
    expect(out.reduce((s, x) => s + x.actual_sec, 0)).toBe(1000)
    expect(out[0].actual_sec).toBe(334)
  })
  it('returns nothing for no directions', () => {
    expect(splitParallel(1500, [])).toEqual([])
  })
})
