import { describe, it, expect } from 'vitest'
import { BLOCK_SEC, formatBlocks, secToBlocks } from '../../src/domain/blocks'

describe('secToBlocks', () => {
  it('has a 1500 s block', () => {
    expect(BLOCK_SEC).toBe(1500)
  })
  it('converts seconds to blocks rounded to 2 dp', () => {
    expect(secToBlocks(1500)).toBe(1)
    expect(secToBlocks(750)).toBe(0.5)
    expect(secToBlocks(1000)).toBe(0.67)
    expect(secToBlocks(0)).toBe(0)
  })
})

describe('formatBlocks', () => {
  it('drops a trailing zero decimal', () => {
    expect(formatBlocks(4, 'ru')).toBe('4')
    expect(formatBlocks(4, 'en')).toBe('4')
  })
  it('uses a comma in ru and a dot in en', () => {
    expect(formatBlocks(4.5, 'ru')).toBe('4,5')
    expect(formatBlocks(4.5, 'en')).toBe('4.5')
  })
  it('rounds to 1 dp', () => {
    expect(formatBlocks(26.25, 'en')).toBe('26.3')
    expect(formatBlocks(26.25, 'ru')).toBe('26,3')
    expect(formatBlocks(0.67, 'ru')).toBe('0,7')
  })
})
