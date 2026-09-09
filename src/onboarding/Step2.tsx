import { formatBlocks } from '../domain/blocks'
import type { CellState, DirectionAgg } from '../domain/limiter'
import type { Direction } from '../domain/types'
import { useLocale, useT, type Key } from '../i18n'
import { DIRECTION_SWATCHES } from '../panel/forms/swatches'
import { LimiterRow } from '../panel/main/LimiterRow'

const DEMO: { key: Key; color: string; icon: string; done: number; budget: number }[] = [
  { key: 'onb2.demoWork', color: DIRECTION_SWATCHES[0], icon: 'briefcase', done: 4, budget: 10 },
  { key: 'onb2.demoDesign', color: DIRECTION_SWATCHES[1], icon: 'pen', done: 2, budget: 6 },
  { key: 'onb2.demoStartup', color: DIRECTION_SWATCHES[2], icon: 'rocket', done: 3, budget: 8 },
  { key: 'onb2.demoLang', color: DIRECTION_SWATCHES[3], icon: 'graduation-cap', done: 1, budget: 4 },
  { key: 'onb2.demoBlog', color: DIRECTION_SWATCHES[5], icon: 'video', done: 0, budget: 2 },
]
const DEMO_CAP = 30

/** Demo rows only: shaped like a `DirectionAgg` so they render through `LimiterRow`. */
function demoAgg(row: (typeof DEMO)[number], i: number, name: string): DirectionAgg {
  const direction: Direction = {
    id: `demo-${i}`,
    user_id: '',
    name,
    color: row.color,
    icon: row.icon,
    budget_blocks: row.budget,
    cadence: 'weekly',
    active_days: [1, 2, 3, 4, 5, 6, 7],
    is_system: false,
    sort_order: i,
    archived_at: null,
  }
  const cells = Array.from({ length: row.budget }, (_, c) => ({
    state: (c < row.done ? 'done' : 'left') as CellState,
    fill: c < row.done ? 1 : 0,
  }))
  return { direction, done: row.done, budget: row.budget, cells, tasks: [] }
}

export function Step2() {
  const t = useT()
  const [locale] = useLocale()
  const rows = DEMO.map((row, i) => demoAgg(row, i, t(row.key)))
  const total = DEMO.reduce((s, r) => s + r.done, 0)

  return (
    <div className="onboarding-split">
      <div className="onboarding-copy">
        <h1>{t('onb2.title')}</h1>
        <p className="onboarding-lead">{t('onb2.p1')}</p>
        <p className="onboarding-detail">{t('onb2.p2')}</p>
      </div>

      <section>
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">{t('limiter.title')}</h2>
          <span className="text-sm text-text-2">
            {t('limiter.total', {
              done: formatBlocks(total, locale),
              total: formatBlocks(DEMO_CAP, locale),
            })}
          </span>
        </header>
        <div className="mt-4 flex flex-col gap-4">
          {rows.map((agg) => (
            <LimiterRow key={agg.direction.id} agg={agg} name={agg.direction.name} />
          ))}
        </div>
      </section>
    </div>
  )
}
