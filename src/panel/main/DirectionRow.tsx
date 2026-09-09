import { useState } from 'react'
import { Plus, SlidersHorizontal } from 'lucide-react'
import { useDirections } from '../../data/useDirections'
import type { Direction } from '../../domain/types'
import { useT } from '../../i18n'
import { Button } from '../../ui/Button'
import { Modal } from '../../ui/Modal'
import { useTimerStore } from '../../timer/timerStore'
import { directionName } from '../directionName'
import { BudgetsModal } from './BudgetsModal'
import { DirectionForm } from '../forms/DirectionForm'
import { iconFor } from '../icons'

/** Parallel mode keeps at most two directions; a third pick replaces the later one. */
function toggleParallelPick(ids: string[], id: string): string[] {
  if (ids.includes(id)) return ids.filter((x) => x !== id)
  if (ids.length < 2) return [...ids, id]
  return [ids[0], id]
}

function Circle({
  color,
  icon,
  name,
  selected,
  onClick,
}: {
  color: string
  icon: string
  name: string
  selected: boolean
  onClick: () => void
}) {
  const Icon = iconFor(icon)
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className="flex w-16 shrink-0 snap-start flex-col items-center gap-1"
    >
      <span
        className={`direction-orb grid h-14 w-14 place-items-center rounded-full text-on-accent transition ${
          selected ? 'ring-[3px] ring-on-accent' : ''
        }`}
        style={{ ['--orb' as string]: color }}
      >
        <Icon size={24} />
      </span>
      <span className="w-full truncate text-center text-xs text-text-2">{name}</span>
    </button>
  )
}

export function DirectionRow() {
  const t = useT()
  const { data: directions, other } = useDirections()
  const directionIds = useTimerStore((s) => s.directionIds)
  const parallel = useTimerStore((s) => s.parallel)
  const status = useTimerStore((s) => s.status)
  const setTarget = useTimerStore((s) => s.setTarget)
  const switchTarget = useTimerStore((s) => s.switchTarget)
  const [creating, setCreating] = useState(false)
  const [budgets, setBudgets] = useState(false)
  const [switching, setSwitching] = useState<{ ids: string[]; label: string } | null>(null)

  const allDirections = other ? [...directions, other] : directions
  const currentLabel =
    directionIds
      .map((id) => allDirections.find((d) => d.id === id)?.name)
      .filter((n): n is string => Boolean(n))
      .join(' + ') || (other ? directionName(other, t) : t('other.name'))

  const pick = (d: Direction) =>
    guardedPick(parallel ? toggleParallelPick(directionIds, d.id) : [d.id], d.name)

  const guardedPick = (ids: string[], label: string) => {
    const same = ids.length === directionIds.length && ids.every((id) => directionIds.includes(id))
    if (same || status === 'idle') setTarget(ids, null)
    else setSwitching({ ids, label })
  }

  const confirmSwitch = () => {
    if (!switching) return
    switchTarget(switching.ids, null)
    setSwitching(null)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="direction-stories flex items-end gap-2 overflow-x-auto">
        {directions.map((d) => (
          <Circle
            key={d.id}
            color={d.color}
            icon={d.icon}
            name={d.name}
            selected={directionIds.includes(d.id)}
            onClick={() => pick(d)}
          />
        ))}
        {other ? (
          <Circle
            color={other.color}
            icon={other.icon}
            name={directionName(other, t)}
            selected={directionIds.length === 0}
            onClick={() => guardedPick([], directionName(other, t))}
          />
        ) : null}
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex w-16 shrink-0 snap-start flex-col items-center gap-1"
        >
          <span className="grid h-14 w-14 place-items-center rounded-full border border-dashed border-text-2 text-text-2 transition hover:text-text">
            <Plus size={24} />
          </span>
          <span className="w-full truncate text-center text-xs text-text-2">
            {t('main.addDirection')}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setBudgets(true)}
          className="flex w-16 shrink-0 snap-start flex-col items-center gap-1"
        >
          <span className="grid h-14 w-14 place-items-center rounded-full border border-dashed border-text-2 text-text-2 transition hover:text-text">
            <SlidersHorizontal size={22} />
          </span>
          <span className="w-full truncate text-center text-xs text-text-2">
            {t('main.budgets')}
          </span>
        </button>
      </div>

      {directions.length === 0 ? (
        <div className="rounded-2xl bg-card p-4">
          <p className="font-medium text-text">{t('main.emptyTitle')}</p>
          <p className="mt-1 text-sm text-text-2">{t('main.emptyBody')}</p>
        </div>
      ) : null}

      {creating ? <DirectionForm onClose={() => setCreating(false)} /> : null}

      {budgets ? <BudgetsModal onClose={() => setBudgets(false)} /> : null}

      {switching ? (
        <Modal title={t('main.switchTitle')} onClose={() => setSwitching(null)}>
          <h2 className="text-xl font-semibold">{t('main.switchTitle')}</h2>
          <p className="mt-2 text-sm text-text-2">
            {t('main.switchBody', { from: currentLabel, to: switching.label })}
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setSwitching(null)}>
              {t('form.cancel')}
            </Button>
            <Button onClick={confirmSwitch}>{t('main.switchConfirm')}</Button>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
