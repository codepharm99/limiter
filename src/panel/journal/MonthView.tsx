import { addDays, addMonths, addWeeks, format, startOfMonth, endOfMonth, isSameMonth } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { enUS, ru } from 'date-fns/locale'
import { weeksSeries } from '../../domain/journal'
import { formatBlockCount } from '../../domain/blocks'
import type { Direction, Session } from '../../domain/types'
import { weekStart, weekEnd } from '../../domain/week'
import { useLocale, useT } from '../../i18n'

export function MonthView({ date, sessions, directions, earliest, today, onMonth }: { date: Date; sessions: Session[]; directions: Direction[]; earliest: Date | null; today: Date; onMonth: (d: Date) => void }) {
  const t = useT()
  const [locale] = useLocale()
  const options = { locale: locale === 'ru' ? ru : enUS }
  const month = startOfMonth(date)
  const weeks: Date[] = []
  for (let w = weekStart(month); w <= endOfMonth(month); w = addWeeks(w, 1)) weeks.push(w)
  const points = weeksSeries(sessions.filter((s) => isSameMonth(new Date(s.started_at), date)), directions, weeks)
  return <section className="flex flex-col gap-3">
    <h3 className="flex items-center justify-between text-xl font-semibold">
      <button aria-label={t('journal.prevMonth')} disabled={!!earliest && startOfMonth(earliest) >= month} onClick={() => onMonth(addMonths(month, -1))} className="calendar-nav disabled:opacity-30"><ChevronLeft size={18} /></button>
      <span className="capitalize">{format(month, 'LLLL yyyy', options)}</span>
      <button aria-label={t('journal.nextMonth')} disabled={month >= startOfMonth(today)} onClick={() => onMonth(addMonths(month, 1))} className="calendar-nav disabled:opacity-30"><ChevronRight size={18} /></button>
    </h3>
    {points.map((p, index) => {
      const w = weeks[index]
      const from = w < month ? month : w
      const last = addDays(weekEnd(w), -1)
      const to = last > endOfMonth(month) ? endOfMonth(month) : last
      // Only weeks that have really started; the future is not a period to look back on.
      if (from > today || (earliest && weekEnd(w) <= earliest)) return null
      return <div key={p.week} className="rounded-2xl bg-card p-4">
        <span className="flex flex-wrap justify-between gap-2"><span>{format(from, 'd MMM', options)} – {format(to, 'd MMM', options)}</span><span>{formatBlockCount(p.total, locale)}</span></span>
        <span className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted">{directions.map((d) => <span key={d.id} style={{ backgroundColor: d.color, width: `${p.total ? Number(p[d.id] ?? 0) / p.total * 100 : 0}%` }} />)}</span>
      </div>
    })}
  </section>
}
