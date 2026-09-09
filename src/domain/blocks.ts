export const BLOCK_SEC = 1500

/** Seconds of focus as blocks, rounded to 2 decimal places. */
export function secToBlocks(sec: number): number {
  return Math.round((sec / BLOCK_SEC) * 100) / 100
}

/** Blocks for display: 1 decimal place, no trailing `.0`, locale decimal separator. */
export function formatBlocks(b: number, locale: 'ru' | 'en'): string {
  const rounded = Math.round(b * 10) / 10
  const s = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  return locale === 'ru' ? s.replace('.', ',') : s
}

/** A formatted block count with a full, grammatically correct unit. */
export function formatBlockCount(blocks: number, locale: 'ru' | 'en'): string {
  const value = formatBlocks(blocks, locale)
  if (locale === 'en') return `${value} ${blocks === 1 ? 'block' : 'blocks'}`
  if (!Number.isInteger(blocks)) return `${value} блока`
  const lastTwo = Math.abs(blocks) % 100
  const last = Math.abs(blocks) % 10
  if (lastTwo >= 11 && lastTwo <= 14) return `${value} блоков`
  if (last === 1) return `${value} блок`
  if (last >= 2 && last <= 4) return `${value} блока`
  return `${value} блоков`
}
