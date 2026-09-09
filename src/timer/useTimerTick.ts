import { useEffect } from 'react'
import { useLocale } from '../i18n'
import { uiSound } from '../lib/sounds'
import { notifyFinished } from '../shell/notifications'
import { useTimerStore } from './timerStore'

/** Drives the running timer and re-syncs it when the tab comes back into view. */
export function useTimerTick() {
  const [locale] = useLocale()
  const status = useTimerStore((s) => s.status)
  useEffect(() => {
    if (status !== 'running') return
    const tick = () => {
      const before = useTimerStore.getState()
      before.tick(Date.now())
      const after = useTimerStore.getState()
      if (before.status === 'running' && after.status === 'idle') {
        uiSound('notification', 0.6)
        notifyFinished(before.mode, locale)
      }
    }
    tick()
    const id = setInterval(tick, 250)
    const onVisible = () => {
      if (!document.hidden) tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [status, locale])
}
