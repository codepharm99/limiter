import { useState, type CSSProperties } from 'react'
import { useT } from '../i18n'
import { useTimerStore } from './timerStore'
import { uiSound } from '../lib/sounds'

const WORK_PRESETS = [25, 45, 50]
const BREAK_PRESETS = [5, 10, 15]
const MIN_MIN = 1
const MAX_MIN = 180

/** Duration picker for the active mode. "Custom" opens a touch-friendly slider. */
export function Presets({ mode }: { mode: 'work' | 'break' }) {
  const t = useT()
  const sec = useTimerStore((s) => s.durations[mode])
  const setDuration = useTimerStore((s) => s.setDuration)
  const locked = useTimerStore((s) => s.status !== 'idle')
  const [custom, setCustom] = useState<number | null>(null)
  const presets = mode === 'work' ? WORK_PRESETS : BREAK_PRESETS

  const isCustom = custom !== null
  const activeMin = sec / 60

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="presets-row flex flex-wrap items-center justify-center gap-2">
      {presets.map((min) => (
        <button
          key={min}
          type="button"
          disabled={locked}
          onClick={() => {
            setDuration(mode, min * 60)
            setCustom(null)
          }}
          className={`rounded-full px-4 py-2 text-sm transition disabled:opacity-50 ${
            !isCustom && activeMin === min
              ? 'bg-accent text-on-accent'
              : 'bg-card text-text-2 hover:text-text'
          }`}
        >
          {t('preset.min', { n: min })}
        </button>
      ))}
        <button
          type="button"
          disabled={locked}
          onClick={() => setCustom(Math.min(MAX_MIN, Math.max(MIN_MIN, Math.round(activeMin / 5) * 5 || MIN_MIN)))}
          className={`rounded-full px-4 py-2 text-sm transition disabled:opacity-50 ${
            !isCustom && presets.includes(activeMin)
              ? 'bg-card text-text-2 hover:text-text'
              : 'bg-accent text-on-accent'
          }`}
        >
          {t('preset.custom')}
        </button>
      </div>
      {isCustom && !locked ? <div className="duration-picker">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-sm font-medium text-text">{t('preset.duration')}</span>
          <strong className="text-lg tabular-nums text-text">{t('preset.min', { n: custom })}</strong>
        </div>
        <input
          autoFocus
          type="range"
          min={MIN_MIN}
          max={MAX_MIN}
          step={1}
          value={custom}
          aria-label={t('preset.duration')}
          onChange={(event) => setCustom(Number(event.target.value))}
          onPointerUp={() => {
            if (custom !== null) {
              setDuration(mode, custom * 60)
              uiSound('button', 0.4)
            }
          }}
          onKeyUp={() => {
            if (custom !== null) {
              setDuration(mode, custom * 60)
              uiSound('button', 0.4)
            }
          }}
          onKeyDown={(event) => { if (event.key === 'Escape') setCustom(null) }}
          className="duration-range"
          style={{ '--duration-progress': `${((custom - MIN_MIN) / (MAX_MIN - MIN_MIN)) * 100}%` } as CSSProperties}
        />
        <div className="flex items-center justify-between text-xs text-text-2">
          <span>{t('preset.min', { n: MIN_MIN })}</span>
          <span>{t('preset.min', { n: MAX_MIN })}</span>
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={() => setCustom(null)} className="px-3 py-2 text-sm text-text-2 hover:text-text">{t('form.cancel')}</button>
          <button
            type="button"
            onClick={() => {
              if (custom !== null) setDuration(mode, custom * 60)
              setCustom(null)
            }}
            className="rounded-full bg-accent px-4 py-2 text-sm text-on-accent"
          >
            {t('form.save')}
          </button>
        </div>
      </div> : null}
    </div>
  )
}
