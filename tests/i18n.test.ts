import { describe, it, expect } from 'vitest'
import { ru } from '../src/i18n/ru'
import { en } from '../src/i18n/en'
import { format, normalizeLocale } from '../src/i18n'

describe('i18n', () => {
  it('en has every ru key', () => {
    const missing = Object.keys(ru).filter(k => !(k in en))
    expect(missing).toEqual([])
  })
  it('interpolates vars', () => {
    expect(format('{done} / {total} блоков', { done: 4, total: 10 })).toBe('4 / 10 блоков')
  })
  it('falls back to ru for an unknown persisted locale', () => {
    expect(normalizeLocale('en')).toBe('en')
    expect(normalizeLocale('ru')).toBe('ru')
    expect(normalizeLocale('kk')).toBe('ru')
    expect(normalizeLocale(null)).toBe('ru')
  })
})
