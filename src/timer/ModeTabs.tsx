import { useT } from '../i18n'
import { Segmented } from '../ui/Segmented'
import { useTimerStore } from './timerStore'
import type { Mode } from '../domain/types'

export function ModeTabs() {
  const t = useT()
  const mode = useTimerStore((s) => s.mode)
  const setMode = useTimerStore((s) => s.setMode)
  const options: { value: Mode; label: string }[] = [
    { value: 'work', label: t('mode.work') },
    { value: 'break', label: t('mode.break') },
  ]
  return (
    <Segmented
      options={options}
      value={mode}
      onChange={setMode}
      activeClass={mode === 'work' ? 'bg-accent text-on-accent' : 'bg-break text-on-accent'}
      className="w-full max-w-lg"
    />
  )
}
