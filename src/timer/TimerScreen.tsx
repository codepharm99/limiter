import { SkipForward } from 'lucide-react'
import { useT } from '../i18n'
import { useDirections } from '../data/useDirections'
import { DirectionRow } from '../panel/main/DirectionRow'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { CompleteBlockDialog } from './CompleteBlockDialog'
import { ModeTabs } from './ModeTabs'
import { Presets } from './Presets'
import { TimerRing } from './TimerRing'
import { useTimerStore } from './timerStore'
import { useSessionSync } from './useSessionSync'
import { useTimerTick } from './useTimerTick'

export function TimerScreen() {
  useTimerTick()
  const { save } = useSessionSync()
  const t = useT()
  const mode = useTimerStore((s) => s.mode)
  const status = useTimerStore((s) => s.status)
  const remainingSec = useTimerStore((s) => s.remainingSec)
  const plannedSec = useTimerStore((s) => (s.status === 'idle' ? s.durations[s.mode] : s.plannedSec))
  const directionIds = useTimerStore((s) => s.directionIds)
  const pendingCompletion = useTimerStore((s) => s.pendingCompletion)
  const start = useTimerStore((s) => s.start)
  const pause = useTimerStore((s) => s.pause)
  const resume = useTimerStore((s) => s.resume)
  const skip = useTimerStore((s) => s.skip)
  const { data: directions } = useDirections()

  const isWork = mode === 'work'
  const names = directionIds
    .map((id) => directions.find((d) => d.id === id)?.name)
    .filter((n): n is string => Boolean(n))
  const targetLabel = names.length > 0 ? names.join(' + ') : t('other.name')
  const directionColor =
    directionIds.length === 1 ? directions.find((d) => d.id === directionIds[0])?.color : undefined

  return (
    <section className="timer-surface flex flex-col items-center gap-6">
      <ModeTabs />
      <TimerRing
        remainingSec={remainingSec}
        plannedSec={plannedSec}
        isWork={isWork}
        targetLabel={isWork ? targetLabel : t(`mode.${mode}`)}
        hint={isWork ? undefined : t('timer.breakHint')}
        directionColor={directionColor}
      />
      <div className="flex min-h-[40px] items-center">
        <Presets mode={mode} />
      </div>
      <div className="flex items-center gap-3">
        <Button
          size="lg"
          variant={isWork ? 'primary' : 'break'}
          onClick={status === 'running' ? pause : status === 'paused' ? resume : start}
        >
          {status === 'running' ? t('timer.pause') : t('timer.start')}
        </Button>
        <IconButton label={t('timer.skip')} onClick={skip} disabled={status === 'idle'}>
          <SkipForward size={20} />
        </IconButton>
      </div>
      <div className="hidden w-full flex-col items-center gap-3 lg:flex">
        <p className="text-sm font-medium text-text-2">{t('main.focusTitle')}</p>
        <DirectionRow />
      </div>
      {pendingCompletion ? (
        <CompleteBlockDialog pending={pendingCompletion} onSave={save} />
      ) : null}
    </section>
  )
}
