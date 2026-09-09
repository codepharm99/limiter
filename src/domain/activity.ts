import { addDays, addWeeks, startOfDay } from 'date-fns'
import { secToBlocks } from './blocks'
import type { Session } from './types'
import { isoDate, weekStart } from './week'

export interface ActivityDay {
  date: Date
  key: string
  blocks: number
  level: 0 | 1 | 2 | 3 | 4
  sessions: Session[]
}

function levelFor(blocks: number): ActivityDay['level'] {
  if (blocks <= 0) return 0
  if (blocks <= 0.5) return 1
  if (blocks <= 1) return 2
  if (blocks <= 2) return 3
  return 4
}

export function activityCalendar(sessions: Session[], today: Date, weeks = 12) {
  const end = startOfDay(today)
  const start = addWeeks(weekStart(end), -(weeks - 1))
  const counted = sessions.filter((session) => session.mode === 'work' && session.status === 'done')
  const byDay = new Map<string, Session[]>()
  for (const session of counted) {
    const key = isoDate(new Date(session.started_at))
    byDay.set(key, [...(byDay.get(key) ?? []), session])
  }
  const days = Array.from({ length: weeks * 7 }, (_, index): ActivityDay => {
    const date = addDays(start, index)
    const key = isoDate(date)
    const items = date <= end ? (byDay.get(key) ?? []) : []
    const blocks = secToBlocks(items.reduce((sum, session) => sum + session.actual_sec, 0))
    return { date, key, blocks, level: levelFor(blocks), sessions: items }
  })
  const visible = days.filter((day) => day.date <= end)
  let streak = 0
  for (let index = visible.length - 1; index >= 0 && visible[index].blocks > 0; index--) streak++
  return {
    days,
    totalBlocks: secToBlocks(counted.reduce((sum, session) => sum + session.actual_sec, 0)),
    activeDays: visible.filter((day) => day.blocks > 0).length,
    streak,
  }
}
