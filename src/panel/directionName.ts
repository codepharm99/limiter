import type { Direction } from '../domain/types'
import type { Key } from '../i18n'

// The signup trigger seeds the system direction with the Russian literal. As long
// as the user has not renamed it, show the translated name instead of that literal.
const DEFAULTS = new Set(['другое', 'other'])

export function directionName(d: Direction, t: (k: Key) => string): string {
  return d.is_system && DEFAULTS.has(d.name.trim().toLowerCase()) ? t('other.name') : d.name
}
