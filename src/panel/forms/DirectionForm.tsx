import { useState } from 'react'
import { Check, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { enUS, ru } from 'date-fns/locale'
import { useDirections } from '../../data/useDirections'
import type { Direction } from '../../domain/types'
import { weekDays } from '../../domain/week'
import { useLocale, useT } from '../../i18n'
import { Button } from '../../ui/Button'
import { IconButton } from '../../ui/IconButton'
import { Modal, useAnimatedClose } from '../../ui/Modal'
import { DIRECTION_ICON_IDS, iconFor } from '../icons'
import { DIRECTION_SWATCHES } from './swatches'

const ISO_DAYS = [1, 2, 3, 4, 5, 6, 7]

export function DirectionForm({
  direction,
  onClose,
}: {
  direction?: Direction
  onClose: () => void
}) {
  const t = useT()
  const { closing, close } = useAnimatedClose(onClose)
  const [locale] = useLocale()
  const { create, update, archive } = useDirections()
  const [name, setName] = useState(direction?.name ?? '')
  const [color, setColor] = useState<string>(direction?.color ?? DIRECTION_SWATCHES[0])
  const [icon, setIcon] = useState(direction?.icon ?? 'briefcase')
  const [days, setDays] = useState<number[]>(direction?.active_days ?? ISO_DAYS)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  const isSystem = direction?.is_system ?? false
  const Icon = iconFor(icon)
  const dayLabels = weekDays(new Date()).map((d) =>
    format(d, 'EEEEEE', { locale: locale === 'ru' ? ru : enUS }),
  )

  const toggleDay = (iso: number) =>
    setDays((cur) => (cur.includes(iso) ? cur.filter((d) => d !== iso) : [...cur, iso].sort()))

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setError(false)
    try {
      await fn()
      close()
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  const save = () =>
    run(() => {
      const trimmed = name.trim()
      if (direction) {
        const patch = isSystem
          ? { name: trimmed, color }
          : {
              name: trimmed,
              color,
              icon,
              active_days: days,
            }
        return update(direction.id, patch)
      }
      return create({
        name: trimmed,
        color,
        icon,
        budget_blocks: 0,
        active_days: days,
      })
    })

  return (
    <Modal title={direction ? t('form.direction') : t('form.newDirection')} onClose={busy ? undefined : close} closing={closing}>
      <h2 className="text-xl font-semibold">
        {direction ? t('form.direction') : t('form.newDirection')}
      </h2>

      <div className="mt-4 flex flex-col items-center gap-1">
        <span
          className="direction-orb grid h-14 w-14 place-items-center rounded-full text-on-accent"
          style={{ ['--orb' as string]: color }}
        >
          {isSystem ? null : (
          <Icon size={24} />
        )}
        </span>
        <span className="max-w-full truncate text-xs text-text-2">
          {name.trim() || t('form.name')}
        </span>
      </div>

      <label className="mt-4 block text-sm text-text-2" htmlFor="dir-name">
        {t('form.name')}
      </label>
      <input
        id="dir-name"
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="form-control mt-1.5"
      />

      <p className="mt-4 text-sm text-text-2">{t('form.color')}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {DIRECTION_SWATCHES.map((s) => (
          <button
            key={s}
            type="button"
            aria-label={s}
            aria-pressed={s === color}
            onClick={() => setColor(s)}
            style={{ backgroundColor: s }}
            className={`grid h-9 w-9 place-items-center rounded-full text-on-accent transition ${
              s === color ? 'ring-2 ring-text ring-offset-2 ring-offset-card' : ''
            }`}
          >
            {s === color ? <Check size={16} /> : null}
          </button>
        ))}
      </div>

      {isSystem ? null : (
        <>
          <p className="mt-4 text-sm text-text-2">{t('form.icon')}</p>
          <div className="mt-2 grid grid-cols-6 gap-2">
            {DIRECTION_ICON_IDS.map((id) => {
              const Icon = iconFor(id)
              return (
                <button
                  key={id}
                  type="button"
                  aria-label={id}
                  aria-pressed={id === icon}
                  onClick={() => setIcon(id)}
                  className={`grid h-10 place-items-center rounded-2xl transition ${
                    id === icon
                      ? 'bg-accent text-on-accent ring-2 ring-text ring-offset-2 ring-offset-card'
                      : 'bg-bg text-text-2 hover:text-text'
                  }`}
                >
                  <Icon size={18} />
                </button>
              )
            })}
          </div>

          <p className="mt-4 text-sm text-text-2">{t('form.days')}</p>
          <div className="mt-2 flex gap-1">
            {ISO_DAYS.map((iso, i) => (
              <button
                key={iso}
                type="button"
                aria-pressed={days.includes(iso)}
                onClick={() => toggleDay(iso)}
                className={`h-9 flex-1 rounded-full text-sm transition ${
                  days.includes(iso)
                    ? 'bg-accent text-on-accent'
                    : 'bg-bg text-text-2 hover:text-text'
                }`}
              >
                {dayLabels[i]}
              </button>
            ))}
          </div>
        </>
      )}

      {error && <p role="alert" className="mt-3 text-accent">{t('form.error')}</p>}
      <div className="mt-6 flex items-center justify-end gap-2">
        {direction && !isSystem ? <IconButton
          label={t('form.delete')}
          className="ui-icon-button--danger"
          disabled={busy}
          onClick={() => run(() => archive(direction.id))}
        >
          <Trash2 size={18} />
        </IconButton> : <span />}
        <div className="flex items-center gap-2">
          <Button variant="ghost" disabled={busy} onClick={close}>
            {t('form.cancel')}
          </Button>
          <Button disabled={busy || name.trim() === ''} onClick={save}>
            {t('form.save')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
