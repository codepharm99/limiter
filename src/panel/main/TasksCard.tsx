import { useState } from 'react'
import { Check, ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { useDirections } from '../../data/useDirections'
import { useTasks } from '../../data/useTasks'
import type { Direction, Task } from '../../domain/types'
import { useT } from '../../i18n'
import { TaskForm } from '../forms/TaskForm'

type Row = { task: Task; direction?: Direction }

/** Direction sort_order first, then the task order inside the direction. */
function sortRows(tasks: Task[], directions: Direction[]): Row[] {
  const byId = new Map(directions.map((d) => [d.id, d]))
  return tasks
    .map((task) => ({ task, dir: byId.get(task.direction_id) }))
    .sort(
      (a, b) =>
        (a.dir?.sort_order ?? Infinity) - (b.dir?.sort_order ?? Infinity) ||
        a.task.sort_order - b.task.sort_order,
    )
    .map(({ task, dir }) => ({ task, direction: dir }))
}

export function TasksCard() {
  const t = useT()
  const { data: directions, other } = useDirections()
  const { data: tasks, toggleDone } = useTasks()
  const [form, setForm] = useState<{ task?: Task } | null>(null)
  const [showDone, setShowDone] = useState(false)
  const [error, setError] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [exitingTaskId, setExitingTaskId] = useState<string | null>(null)
  const toggle = async (id: string) => {
    setToggling(true); setError(false); setExitingTaskId(id)
    await new Promise((resolve) => window.setTimeout(resolve, 190))
    try { await toggleDone(id) } catch { setError(true) } finally { setToggling(false); setExitingTaskId(null) }
  }

  const all = other ? [...directions, other] : directions
  const open = sortRows(
    tasks.filter((task) => !task.done_at),
    all,
  )
  const done = sortRows(
    tasks.filter((task) => task.done_at),
    all,
  )
  // Mini tasks are not budget work: they land in the system "other" catch-all by default.
  const defaultDirection = other?.id ?? directions[0]?.id ?? ''

  const row = ({ task }: Row) => {
    const done = Boolean(task.done_at)
    return <li key={task.id} className={`task-row ${done ? 'is-done' : ''} ${exitingTaskId === task.id ? 'is-exiting' : ''}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={task.title}
        disabled={toggling}
        onClick={() => toggle(task.id)}
        className={`task-check ${done ? 'is-done' : ''}`}
      >
        <Check size={12} strokeWidth={2.5} />
      </button>
      <span className="flex min-w-0 flex-1 items-center">
        <button
          type="button"
          onClick={() => setForm({ task })}
          className={`min-w-0 truncate text-left ${done ? 'line-through' : ''}`}
        >
          {task.title}
        </button>
      </span>
    </li>
  }

  return (
    <section className="product-card tasks-surface p-5">
      <header className="product-card-header flex items-center justify-between">
        <h2 className="text-[17px] font-semibold">{t('tasks.title')}</h2>
        <span className="text-sm text-text-2">{t('tasks.active', { n: open.length })}</span>
      </header>

      {error && <p role="alert" className="mt-3 text-accent">{t('form.error')}</p>}
      {open.length === 0 ? (
        <p className="mt-4 text-sm text-text-2">{t('tasks.empty')}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-1">{open.map(row)}</ul>
      )}

      {done.length > 0 ? (
        <div className="mt-4">
          <button
            type="button"
            aria-expanded={showDone}
            onClick={() => setShowDone((v) => !v)}
            className="tasks-toggle"
          >
            {showDone ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            {showDone ? t('tasks.hideDone') : t('tasks.showDone', { n: done.length })}
          </button>
          {showDone ? <ul className="mt-2 flex flex-col gap-1">{done.map(row)}</ul> : null}
        </div>
      ) : null}

      <button
        type="button"
        disabled={defaultDirection === ''}
        onClick={() => setForm({})}
        className="product-add mt-4 flex w-full items-center justify-center gap-1.5 p-[11px] text-sm text-text transition hover:text-text disabled:opacity-50"
      >
        <Plus size={16} />
        {t('tasks.add')}
      </button>

      {form ? (
        <TaskForm
          task={form.task}
          directionId={form.task?.direction_id ?? defaultDirection}
          onClose={() => setForm(null)}
        />
      ) : null}
    </section>
  )
}
