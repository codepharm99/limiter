import { useEffect, useRef, useState } from 'react'

// A fitted column = capped cell (26px) + gap (4px); the rest is the weekday
// column plus the layout gap. Below 5 weeks the card would stop making sense.
const COLUMN = 30
const RESERVE = 50
const MIN_WEEKS = 5

/** How many week columns fit the container without scrolling: wide cards show
    the full history, narrow ones drop the oldest weeks instead of shrinking
    cells below readability. */
export function useFittedWeeks(max: number, ready = true) {
  const ref = useRef<HTMLDivElement>(null)
  const [weeks, setWeeks] = useState(max)
  useEffect(() => {
    const el = ref.current
    // `ready` re-runs observation once a loading skeleton swaps to the real grid.
    if (!ready || !el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([entry]) => {
      const fit = Math.floor((entry.contentRect.width - RESERVE) / COLUMN)
      setWeeks(Math.max(MIN_WEEKS, Math.min(max, fit)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [max, ready])
  return { ref, weeks }
}
