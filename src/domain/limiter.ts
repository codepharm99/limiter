import { secToBlocks } from './blocks'
import type { DayPlan, Direction, Session, Task } from './types'
import { isoDate, weekEnd, weekStart } from './week'

export type CellState = 'done' | 'partial' | 'today' | 'left' | 'over'

export interface DirectionAgg {
  direction: Direction
  done: number
  budget: number
  cells: { state: CellState; fill: number }[]
  /** done counts real logged blocks; energy averages the energy scores of those sessions. */
  tasks: { task: Task; done: number; energy: number | null }[]
}

export interface WeekAgg {
  total: number
  cap: number
  directions: DirectionAgg[]
  other: DirectionAgg
}

const OTHER_ID = 'other'

function otherDirection(): Direction {
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

/** Cells for one direction: done/partial for what is spent, today for the day plan, left, over. */
function buildCells(done: number, budget: number, plannedToday: number, isSystem: boolean) {
  const cells: { state: CellState; fill: number }[] = []
  const full = Math.floor(done + 1e-9)
  const fraction = Math.round((done - full) * 100) / 100
  const count = isSystem ? Math.ceil(done) : Math.max(budget, Math.ceil(done))
  // Today's plan sits between the week's spend and the free remainder, so the row
  // reads in one pass: spent → planned for today → still free.
  const todayFrom = full + (fraction > 0 ? 1 : 0)
  const todayTo = Math.min(budget, todayFrom + plannedToday)

  for (let i = 0; i < count; i++) {
    let state: CellState
    let fill = 0
    if (i < full) {
      state = 'done'
      fill = 1
    } else if (i === full && fraction > 0) {
      state = 'partial'
      fill = fraction
    } else if (i >= todayFrom && i < todayTo) {
      state = 'today'
    } else {
      state = 'left'
    }
    if (!isSystem && i >= budget) state = 'over'
    cells.push({ state, fill })
  }
  return cells
}

function aggregate(
  direction: Direction,
  sessions: Session[],
  tasks: Task[],
  plannedToday: number,
): DirectionAgg {
  const done = secToBlocks(sessions.reduce((s, x) => s + x.actual_sec, 0))
  const budget = direction.is_system ? 0 : direction.budget_blocks
  return {
    direction,
    done,
    budget,
    cells: buildCells(done, budget, plannedToday, direction.is_system),
    tasks: tasks.map(task => {
      const own = sessions.filter(s => s.task_id === task.id)
      const energies = own.map(s => s.energy).filter((e): e is number => e !== null)
      return {
        task,
        done: secToBlocks(own.reduce((s, x) => s + x.actual_sec, 0)),
        energy: energies.length > 0
          ? Math.round((energies.reduce((a, b) => a + b, 0) / energies.length) * 10) / 10
          : null,
      }
    }),
  }
}

/** Week aggregate for the limiter: done work blocks per direction, cells and task totals. */
export function aggregateWeek(input: {
  directions: Direction[]
  tasks: Task[]
  sessions: Session[]
  dayPlans: DayPlan[]
  today: Date
  cap: number
}): WeekAgg {
  const from = weekStart(input.today).getTime()
  const to = weekEnd(input.today).getTime()
  const counted = input.sessions.filter(s => {
    if (s.mode !== 'work' || s.status !== 'done') return false
    const t = new Date(s.started_at).getTime()
    return t >= from && t < to
  })

  const todayIso = isoDate(input.today)
  const plannedFor = (directionId: string) =>
    input.dayPlans
      .filter(p => p.direction_id === directionId && p.date === todayIso)
      .reduce((s, p) => s + p.planned_blocks, 0)

  const system = input.directions.find(d => d.is_system)
  const active = input.directions.filter(d => !d.is_system && !d.archived_at)

  const directions = active.map(d =>
    aggregate(
      d,
      counted.filter(s => s.direction_id === d.id),
      input.tasks.filter(t => t.direction_id === d.id && !t.archived_at),
      plannedFor(d.id),
    ),
  )

  const otherDir = system ?? otherDirection()
  const other = aggregate(
    otherDir,
    counted.filter(s => s.direction_id === null || s.direction_id === otherDir.id),
    input.tasks.filter(t => t.direction_id === otherDir.id && !t.archived_at),
    0,
  )

  const total = secToBlocks(counted.reduce((s, x) => s + x.actual_sec, 0))
  return { total, cap: input.cap, directions, other }
}
