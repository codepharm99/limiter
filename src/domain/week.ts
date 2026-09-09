import { addDays, format, startOfWeek } from 'date-fns'

/** Monday 00:00 of the week that contains `d`, local time. */
export function weekStart(d: Date): Date {
  return startOfWeek(d, { weekStartsOn: 1 })
}

/** Next Monday 00:00, local time. Exclusive end of the week. */
export function weekEnd(d: Date): Date {
  return addDays(weekStart(d), 7)
}

/** The 7 days of the week, Monday through Sunday. */
export function weekDays(d: Date): Date[] {
  const start = weekStart(d)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/** Local calendar date as 'YYYY-MM-DD'. */
export function isoDate(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}
