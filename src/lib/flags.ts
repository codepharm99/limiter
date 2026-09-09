/**
 * Stage-2 features (accounts + Pro billing) ship hidden. Everything works
 * like stage 1 — silent anonymous sessions, no auth page, no checkout —
 * unless the flag is on.
 *
 * Backdoor: open the site with `?stage2=1` once (persists in localStorage),
 * or set `localStorage.setItem('lim.stage2', '1')` from the console.
 * `?stage2=0` hides it again.
 */
const KEY = 'lim.stage2'

export function initStage2Flag(): void {
  const value = new URLSearchParams(window.location.search).get('stage2')
  if (value === '1') localStorage.setItem(KEY, '1')
  if (value === '0') localStorage.removeItem(KEY)
}

export function isStage2Enabled(): boolean {
  return localStorage.getItem(KEY) === '1'
}
