import { useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { useDirections } from '../data/useDirections'
import type { Direction } from '../domain/types'
import { formatBlockCount } from '../domain/blocks'
import { useLocale, useT, type Key } from '../i18n'
import { directionName } from '../panel/directionName'
import { DirectionForm } from '../panel/forms/DirectionForm'
import { DIRECTION_SWATCHES } from '../panel/forms/swatches'
import { iconFor } from '../panel/icons'

const BASE_SET: { key: Key; color: string; icon: string; budget: number }[] = [
  { key: 'onb3.setWork', color: DIRECTION_SWATCHES[0], icon: 'briefcase', budget: 14 },
  { key: 'onb3.setStartup', color: DIRECTION_SWATCHES[1], icon: 'rocket', budget: 7 },
  { key: 'onb3.setSelf', color: DIRECTION_SWATCHES[2], icon: 'book', budget: 4 },
  { key: 'onb3.setLang', color: DIRECTION_SWATCHES[3], icon: 'graduation-cap', budget: 4 },
]

export function Step3() {
  const t = useT()
  const [locale] = useLocale()
  const { data: directions, other, create } = useDirections()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [form, setForm] = useState<{ direction?: Direction } | null>(null)

  const taken = new Set(directions.map((d) => d.name.trim().toLowerCase()))
  const isTaken = (name: string) => taken.has(name.trim().toLowerCase())

  const add = async (entries: typeof BASE_SET) => {
    setBusy(true)
    setError(false)
    try {
      for (const e of entries) {
        const name = t(e.key)
        if (isTaken(name)) continue
        await create({
          name,
          color: e.color,
          icon: e.icon,
          budget_blocks: e.budget,
          active_days: [1, 2, 3, 4, 5, 6, 7],
        })
      }
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="onboarding-setup">
      <h1>{t('onb3.title')}</h1>
      <p className="onboarding-lead">{t('onb3.body')}</p>

      {error && <p role="alert" className="text-accent">{t('form.error')}</p>}
      <section className="onboarding-setup-section">
        <p className="text-sm text-text-2">{t('onb3.baseSet')}</p>
        <div className="onboarding-starters">
          {BASE_SET.map((e) => {
            const name = t(e.key)
            const added = isTaken(name)
            const Icon = iconFor(e.icon)
            return (
              <button key={e.key} disabled={added || busy} onClick={() => add([e])}>
                <span
                  className="direction-orb grid h-7 w-7 shrink-0 place-items-center rounded-full text-on-accent"
                  style={{ ['--orb' as string]: e.color }}
                >
                  <Icon size={14} />
                </span>
                <span className="starter-name">{name}</span>
                <span className="starter-budget">{formatBlockCount(e.budget, locale)}</span>
              </button>
            )
          })}
          <button disabled={busy} onClick={() => add(BASE_SET)}>
            {t('onb3.addAll')}
          </button>
        </div>
      </section>

      <section className="onboarding-setup-section">
        <p className="text-sm text-text-2">{t('onb3.directions')}</p>
        <ul className="mt-2 flex flex-col gap-2">
          {directions.map((d) => {
            const Icon = iconFor(d.icon)
            return (
              <li key={d.id} className="flex items-center gap-2 rounded-2xl bg-card px-3 py-2">
                <span
                  className="direction-orb grid h-8 w-8 shrink-0 place-items-center rounded-full text-on-accent"
                  style={{ ['--orb' as string]: d.color }}
                >
                  <Icon size={16} />
                </span>
                <span className="min-w-0 flex-1 truncate">{d.name}</span>
                <span className="shrink-0 text-sm text-text-2">
                  {formatBlockCount(d.budget_blocks, locale)}
                </span>
                <button
                  type="button"
                  aria-label={t('form.direction')}
                  title={t('form.direction')}
                  onClick={() => setForm({ direction: d })}
                  className="shrink-0 text-text-2 transition hover:text-text"
                >
                  <Pencil size={16} />
                </button>
              </li>
            )
          })}
          {other ? (
            <li className="flex items-center gap-2 rounded-2xl bg-card px-3 py-2 text-text-2">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: other.color }}
              />
              <span className="min-w-0 flex-1 truncate text-text">
                {directionName(other, t)}
              </span>
            </li>
          ) : null}
        </ul>
        <button
          type="button"
          onClick={() => setForm({})}
          className="mt-2 flex w-full items-center justify-center gap-1 rounded-2xl border border-dashed border-text-2 py-2 text-sm text-text-2 transition hover:text-text"
        >
          <Plus size={16} />
          {t('onb3.add')}
        </button>
      </section>

      {form ? (
        <DirectionForm direction={form.direction} onClose={() => setForm(null)} />
      ) : null}
    </div>
  )
}
