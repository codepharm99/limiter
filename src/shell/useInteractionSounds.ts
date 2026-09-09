import { useEffect } from 'react'
import { uiSound } from '../lib/sounds'

type Closest = HTMLElement & { disabled?: boolean }

function targetOf(event: Event): Closest | null {
  return event.target instanceof HTMLElement ? (event.target.closest('button, input') as Closest | null) : null
}

/** One global listener: any button press, toggle, or slider commit gets a sound.
    Disabled controls and noisy exceptions stay silent. */
export function useInteractionSounds() {
  useEffect(() => {
    const onPress = (event: Event) => {
      const el = targetOf(event)
      if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return
      if (el instanceof HTMLInputElement) return
      const checked = el.getAttribute('aria-checked') ?? el.getAttribute('aria-pressed')
      if (checked === 'true') uiSound('toggleOff')
      else if (checked === 'false') uiSound('toggle')
      else if (el.getAttribute('role') === 'option') uiSound('select')
      else uiSound('tap', 0.35)
    }
    const onSlide = (event: Event) => {
      const el = targetOf(event)
      if (el instanceof HTMLInputElement) uiSound('select', 0.3)
    }
    document.addEventListener('click', onPress, true)
    document.addEventListener('change', onSlide, true)
    return () => {
      document.removeEventListener('click', onPress, true)
      document.removeEventListener('change', onSlide, true)
    }
  }, [])
}
