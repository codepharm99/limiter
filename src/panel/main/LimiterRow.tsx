import { Pencil } from 'lucide-react'
import boltUrl from '../../assets/emoji/high_voltage_3d.png'
import { formatBlocks } from '../../domain/blocks'
import type { DirectionAgg } from '../../domain/limiter'
import { useLocale, useT } from '../../i18n'
import { BlockGrid } from './BlockGrid'

/** One limiter line. Presentational on purpose: the live card and the onboarding demo share it. */
export function LimiterRow({
  agg,
  name,
  isOther = false,
  onEdit,
}: {
  agg: DirectionAgg
  name: string
  isOther?: boolean
  onEdit?: () => void
}) {
  const t = useT()
  const [locale] = useLocale()
  const color = agg.direction.color

  return (
    <div className="limiter-row flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="truncate text-sm font-medium text-text">{name}</span>
        {onEdit ? (
          <button
            type="button"
            aria-label={t('form.direction')}
            title={t('form.direction')}
            onClick={onEdit}
            className="ml-auto shrink-0 text-text-2 transition hover:text-text"
          >
            <Pencil size={14} />
          </button>
        ) : null}
      </div>
      <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-sm text-text-2 tabular-nums">
        <span className="text-lg font-medium text-text">{formatBlocks(agg.done, locale)}</span>
        <span>{isOther ? t('limiter.otherSummary') : t('limiter.ofBudget', { total: formatBlocks(agg.budget, locale) })}</span>
      </p>
      <BlockGrid cells={agg.cells} color={color} />
      {agg.tasks.length > 0 ? (
        <ul className="limiter-tasks flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-text-2 tabular-nums">
          {agg.tasks.map(({ task, done, energy }) => (
            <li key={task.id} className="flex items-baseline gap-1">
              <span className="truncate">{task.title}</span>
              <span className="flex shrink-0 items-center gap-1">
                {task.budget_blocks > 0 ? (
                  <span>
                    {t('limiter.taskShare', {
                      done: formatBlocks(done, locale),
                      total: formatBlocks(task.budget_blocks, locale),
                    })}
                  </span>
                ) : (
                  <span>
                    {formatBlocks(done, locale)} {t('common.blocksShort')}
                  </span>
                )}
                {energy !== null ? (
                  <span className="flex items-center gap-0.5">
                    <img src={boltUrl} alt="" aria-hidden="true" className="h-3 w-3" />
                    {formatBlocks(energy, locale)}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
