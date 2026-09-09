/** Split one session's seconds across parallel directions. Remainder goes to the first. */
export function splitParallel(
  actualSec: number,
  directionIds: string[],
): { direction_id: string; actual_sec: number }[] {
  if (directionIds.length === 0) return []
  const share = Math.floor(actualSec / directionIds.length)
  const remainder = actualSec - share * directionIds.length
  return directionIds.map((direction_id, i) => ({
    direction_id,
    actual_sec: i === 0 ? share + remainder : share,
  }))
}
