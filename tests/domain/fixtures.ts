import type { DayPlan, Direction, Session, Task } from '../../src/domain/types'

let n = 0
const id = (p: string) => `${p}-${++n}`

export function dir(partial: Partial<Direction> = {}): Direction {
  return {
    id: id('dir'),
    user_id: 'u1',
    name: 'Direction',
    color: 'var(--accent)',
    icon: 'star',
    budget_blocks: 0,
    cadence: 'weekly',
    active_days: [1, 2, 3, 4, 5],
    is_system: false,
    sort_order: 0,
    archived_at: null,
    ...partial,
  }
}

export function task(partial: Partial<Task> = {}): Task {
  return {
    id: id('task'),
    user_id: 'u1',
    direction_id: 'dir-1',
    title: 'Task',
    budget_blocks: 0,
    done_at: null,
    sort_order: 0,
    archived_at: null,
    ...partial,
  }
}

export function session(partial: Partial<Session> = {}): Session {
  return {
    id: id('ses'),
    user_id: 'u1',
    direction_id: null,
    task_id: null,
    mode: 'work',
    planned_sec: 1500,
    actual_sec: 1500,
    blocks: 1,
    note: null,
    energy: null,
    parallel_group: null,
    started_at: new Date(2026, 8, 9, 10, 0, 0).toISOString(),
    ended_at: null,
    status: 'done',
    manual: false,
    ...partial,
  }
}

export function plan(partial: Partial<DayPlan> = {}): DayPlan {
  return {
    id: id('plan'),
    user_id: 'u1',
    direction_id: 'dir-1',
    task_id: null,
    date: '2026-09-09',
    planned_blocks: 1,
    ...partial,
  }
}
