import { weekStart } from './week'

/** Earliest journal date a user may see. `null` means unlimited history. */
export function visibleFrom(isPro: boolean, now: Date): Date | null {
  return isPro ? null : weekStart(now)
}
