import { secToBlocks } from './blocks'
import type { Direction, Session, Task } from './types'
import { isoDate, weekEnd, weekStart } from './week'

export interface DayGroup {
  direction: Direction
  blocks: number
  energy: number | null
  share: number
  items: Session[]
  tasks: { task: Task; blocks: number }[]
}

export interface DaySummary {
  blocks: number
  hours: number
  energy: number | null
  groups: DayGroup[]
}

export interface WeekPoint {
  week: string
  total: number
  [directionId: string]: number | string
}

const OTHER_ID = 'other'

/** Stand-in for the system direction when the caller has none: unknown blocks still need a home. */
function fallbackOther(): Direction {
  return {
    id: OTHER_ID,
    user_id: '',
    name: 'other',
    color: 'var(--muted)',
    icon: 'dots',
    budget_blocks: 0,
    cadence: 'weekly',
    active_days: [1, 2, 3, 4, 5, 6, 7],
    is_system: true,
    sort_order: 999,
    archived_at: null,
  }
}

/** Only finished work counts towards the journal; breaks and aborted blocks are ignored. */
function counted(sessions: Session[]): Session[] {
  return sessions.filter((s) => s.mode === 'work' && s.status === 'done')
}

/** Average energy over the sessions that have one, one decimal place. `null` when none do. */
function avgEnergy(sessions: Session[]): number | null {
  const values = sessions.map((s) => s.energy).filter((e): e is number => e !== null)
  if (values.length === 0) return null
  const sum = values.reduce((a, b) => a + b, 0)
  return Math.round((sum / values.length) * 10) / 10
}

function blocksOf(sessions: Session[]): number {
  return secToBlocks(sessions.reduce((s, x) => s + x.actual_sec, 0))
}

/** Blocks as hours: one block is 25 minutes, rounded to one decimal place. */
export function blocksToHours(blocks: number): number {
  return Math.round(((blocks * 25) / 60) * 10) / 10
}

/**
 * One day of the journal: totals plus a group per direction that has blocks.
 * Sessions with no direction, or one that is not in `directions`, fall into the system direction.
 */
export function groupDay(sessions: Session[], directions: Direction[], tasks: Task[]): DaySummary {
  const work = counted(sessions)
  const other = directions.find((d) => d.is_system) ?? fallbackOther()
  const known = new Map(directions.map((d) => [d.id, d]))

  const buckets = new Map<string, Session[]>()
  for (const s of work) {
    const dir = (s.direction_id && known.get(s.direction_id)) || other
    const list = buckets.get(dir.id)
    if (list) list.push(s)
    else buckets.set(dir.id, [s])
  }

  const seconds = work.reduce((sum, s) => sum + s.actual_sec, 0)
  const blocks = blocksOf(work)
  const groups: DayGroup[] = [...buckets].map(([id, items]) => {
    const direction = known.get(id) ?? other
    const groupBlocks = blocksOf(items)
    const taskIds = new Set(items.map((s) => s.task_id).filter((x): x is string => x !== null))
    return {
      direction,
      blocks: groupBlocks,
      energy: avgEnergy(items),
      share: seconds === 0 ? 0 : items.reduce((sum, s) => sum + s.actual_sec, 0) / seconds,
      items: [...items].sort((a, b) => a.started_at.localeCompare(b.started_at)),
      tasks: tasks
        .filter((t) => taskIds.has(t.id))
        .map((task) => ({ task, blocks: blocksOf(items.filter((s) => s.task_id === task.id)) })),
    }
  })

  // Biggest chunk of the day first; the system direction sorts last on a tie.
  groups.sort((a, b) => b.blocks - a.blocks || a.direction.sort_order - b.direction.sort_order)

  return { blocks, hours: blocksToHours(blocks), energy: avgEnergy(work), groups }
}

/**
 * One point per week for the stacked chart: total blocks and blocks per direction id.
 * Unknown directions are folded into the system direction, same as `groupDay`.
 */
export function weeksSeries(
  sessions: Session[],
  directions: Direction[],
  weeks: Date[],
): WeekPoint[] {
  const work = counted(sessions)
  const other = directions.find((d) => d.is_system) ?? fallbackOther()
  const known = new Map(directions.map((d) => [d.id, d]))

  return weeks.map((w) => {
    const from = weekStart(w).getTime()
    const to = weekEnd(w).getTime()
    const inWeek = work.filter((s) => {
      const t = new Date(s.started_at).getTime()
      return t >= from && t < to
    })
    const point: WeekPoint = { week: isoDate(weekStart(w)), total: blocksOf(inWeek) }
    for (const d of [...directions, other]) {
      if (point[d.id] === undefined) point[d.id] = 0
    }
    const seconds = new Map<string, number>()
    for (const s of inWeek) {
      const dir = (s.direction_id && known.get(s.direction_id)) || other
      seconds.set(dir.id, (seconds.get(dir.id) ?? 0) + s.actual_sec)
    }
    for (const [id, sec] of seconds) point[id] = secToBlocks(sec)
    return point
  })
}
