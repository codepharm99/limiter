import { addDays, format } from 'date-fns'
import { enUS, ru } from 'date-fns/locale'
import { formatBlocks } from '../../domain/blocks'
import { aggregateWeek } from '../../domain/limiter'
import type { Direction, Session, Task } from '../../domain/types'
import { weekStart, weekEnd } from '../../domain/week'
import { useLocale, useT } from '../../i18n'
import { directionName } from '../directionName'
import { LimiterRow } from '../main/LimiterRow'

export function WeekView({ date, sessions, directions, tasks, cap }: { date: Date; sessions: Session[]; directions: Direction[]; tasks: Task[]; cap: number }) {
  const t = useT()
  const [locale] = useLocale()
  const options = { locale: locale === 'ru' ? ru : enUS }
  const known = new Set(directions.map((d) => d.id))
  const week = aggregateWeek({ today: date, cap, directions, tasks, dayPlans: [], sessions: sessions.map((s) => s.direction_id && !known.has(s.direction_id) ? { ...s, direction_id: null } : s) })
  return <section className="product-card limiter-surface flex flex-col gap-4 p-4">
    <h3 className="text-xl font-semibold">{format(weekStart(date), 'd MMMM', options)} – {format(addDays(weekEnd(date), -1), 'd MMMM yyyy', options)}</h3>
    <p>{t('limiter.total', { done: formatBlocks(week.total, locale), total: formatBlocks(cap, locale) })}</p>
    {week.directions.map((agg) => <LimiterRow key={agg.direction.id} agg={agg} name={directionName(agg.direction, t)} />)}
    <LimiterRow agg={week.other} name={t('other.name')} isOther />
  </section>
}
