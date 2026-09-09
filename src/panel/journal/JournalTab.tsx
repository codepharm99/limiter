import { useState } from 'react'
import { addDays, addWeeks, startOfDay, startOfMonth } from 'date-fns'
import { useDirections } from '../../data/useDirections'
import { useTasks } from '../../data/useTasks'
import { useSessions } from '../../data/useSessions'
import { useProfile } from '../../data/useProfile'
import { groupDay } from '../../domain/journal'
import { weekStart } from '../../domain/week'
import { useT } from '../../i18n'
import { PeriodTabs, type Period } from './PeriodTabs'
import { Calendar } from './Calendar'
import { DayView } from './DayView'
import { WeekView } from './WeekView'
import { MonthView } from './MonthView'
import { ActivityCard } from '../main/ActivityCard'
import { AddBlockDialog } from './AddBlockDialog'

export function JournalTab() {
  const t = useT()
  const today = startOfDay(new Date())
  const [date, setDate] = useState(today)
  const [period, setPeriod] = useState<Period>('day')
  const [adding, setAdding] = useState(false)
  const { data: profile } = useProfile()
  const { data: active, other, isLoading: directionsLoading } = useDirections()
  const { data: tasks, isLoading: tasksLoading } = useTasks()
  const selected = date
  const chartStart = addWeeks(weekStart(today), -9)
  const monthStart = weekStart(startOfMonth(selected))
  const wanted = chartStart < monthStart ? chartStart : monthStart
  const from = wanted
  const { data: sessions, addManual, remove, isLoading, isError, refetch } = useSessions(from, addDays(today, 1))
  const all = other ? [...active, other] : active
  // Unknown directions still contribute to the chart and its legend.
  const fallback = groupDay(sessions, all, tasks).groups.find((g) => g.direction.is_system)?.direction
  const directions = !other && fallback ? [...all, fallback] : all
  return <section className="flex min-w-0 flex-col gap-4">
    <div className="grid min-w-0 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <Calendar date={selected} earliest={null} today={today} onSelect={(d) => { setDate(d); setPeriod('day') }} onMonth={(d) => { setDate(d); setPeriod('month') }} />
      <div className="flex min-w-0 flex-col gap-5">
        <PeriodTabs value={period} onChange={setPeriod} />
        {isError ? <div role="alert"><p>{t('journal.loadError')}</p><button onClick={() => refetch()} className="mt-2 underline">{t('journal.retry')}</button></div> : isLoading || directionsLoading || tasksLoading ? <p role="status">{t('journal.loading')}</p> : <>
          {period === 'day' && <DayView date={selected} sessions={sessions} directions={directions} tasks={tasks} remove={remove} onAdd={() => setAdding(true)} />}
          {period === 'week' && <><ActivityCard /><WeekView date={selected} sessions={sessions} directions={directions} tasks={tasks} cap={profile?.week_cap_blocks ?? 30} /></>}
          {period === 'month' && <MonthView date={selected} sessions={sessions} directions={directions} earliest={null} today={today} onMonth={setDate} />}
        </>}
      </div>
    </div>
    {adding && <AddBlockDialog date={selected} directions={directions} tasks={tasks} addManual={addManual} onClose={() => setAdding(false)} />}
  </section>
}
