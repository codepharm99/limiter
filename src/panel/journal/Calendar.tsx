import { useEffect, useState } from 'react'
import { addDays, addMonths, format, isSameDay, isSameMonth, startOfMonth } from 'date-fns'
import { enUS, ru } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { isoDate, weekDays, weekStart } from '../../domain/week'
import { useLocale, useT } from '../../i18n'

export function Calendar({ date, earliest, today, onSelect, onMonth }: {
  date: Date; earliest: Date | null; today: Date; onSelect: (d: Date) => void; onMonth: (d: Date) => void
}) {
  const t = useT()
  const [locale] = useLocale()
  const dateLocale = locale === 'ru' ? ru : enUS
  const [month, setMonth] = useState(startOfMonth(date))
  const dateKey = isoDate(date)
  useEffect(() => setMonth(startOfMonth(date)), [dateKey])
  const first = weekStart(month)
  const days = Array.from({ length: 42 }, (_, i) => addDays(first, i))
  return <section className="product-card calendar-surface p-4">
    <header className="flex items-center justify-between gap-2">
      <button aria-label={t('journal.prevMonth')} disabled={!!earliest && startOfMonth(earliest) >= month} onClick={() => setMonth(addMonths(month, -1))} className="calendar-nav disabled:opacity-30"><ChevronLeft size={18} /></button>
      <button className="font-medium capitalize" onClick={() => onMonth(earliest && month < earliest ? earliest : month)}>{format(month, 'LLLL yyyy', { locale: dateLocale })}</button>
      <button aria-label={t('journal.nextMonth')} disabled={month >= startOfMonth(today)} onClick={() => setMonth(addMonths(month, 1))} className="calendar-nav disabled:opacity-30"><ChevronRight size={18} /></button>
    </header>
    <div className="grid grid-cols-7 gap-1 text-center text-sm">
      {weekDays(month).map((d) => <span key={isoDate(d)} className="py-2 text-text-2">{format(d, 'EEEEEE', { locale: dateLocale })}</span>)}
      {days.map((d) => <button key={isoDate(d)} aria-label={isoDate(d)} aria-pressed={isSameDay(d, date)} aria-current={isSameDay(d, today) ? 'date' : undefined}
        disabled={!isSameMonth(d, month) || (!!earliest && d < earliest) || d > today}
        onClick={() => onSelect(d)} className={`calendar-day aspect-square disabled:opacity-25 ${isSameDay(d, today) ? 'bg-text text-on-accent' : ''} ${isSameDay(d, date) ? 'ring-2 ring-accent' : ''}`}>
        {format(d, 'd')}
      </button>)}
    </div>
  </section>
}
