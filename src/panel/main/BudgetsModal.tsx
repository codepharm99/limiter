import { useState } from 'react'
import { HelpCircle, Minus, Pencil, Plus } from 'lucide-react'
import { useDirections } from '../../data/useDirections'
import { useProfile } from '../../data/useProfile'
import type { Direction } from '../../domain/types'
import { useT } from '../../i18n'
import { IconButton } from '../../ui/IconButton'
import { Modal } from '../../ui/Modal'
import { DirectionForm } from '../forms/DirectionForm'
import { iconFor } from '../icons'

const MIN_CAP = 1
const MAX_CAP = 99
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

/** One − value + row. Big targets, no typing: a number changes in two taps. */
function Stepper({ value, onDec, onInc }: { value: number; onDec: () => void; onInc: () => void }) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        aria-label="-"
        onClick={onDec}
        className="grid h-9 w-9 place-items-center rounded-full bg-bg text-text-2 transition hover:text-text"
      >
        <Minus size={16} />
      </button>
      <span className="w-8 text-center text-base font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        aria-label="+"
        onClick={onInc}
        className="grid h-9 w-9 place-items-center rounded-full bg-bg text-text-2 transition hover:text-text"
      >
        <Plus size={16} />
      </button>
    </div>
  )
}

/**
 * Weekly block budget configuration: the shared cap plus per-direction split.
 * Every change saves immediately — there is nothing to remember to press.
 */
export function BudgetsModal({ onClose }: { onClose: () => void }) {
  const t = useT()
  const { data: profile, update: updateProfile } = useProfile()
  const { data: directions, update } = useDirections()
  const [editing, setEditing] = useState<Direction | null>(null)
  const [explaining, setExplaining] = useState(false)
  const [error, setError] = useState(false)

  const cap = profile?.week_cap_blocks ?? 0
  const total = directions.reduce((sum, d) => sum + Math.max(0, Math.round(d.budget_blocks)), 0)
  const free = cap - total

  const setCap = (n: number) => {
    if (!profile) return
    setError(false)
    updateProfile({ week_cap_blocks: clamp(n, MIN_CAP, MAX_CAP) }).catch(() => setError(true))
  }
  const setBudget = (d: Direction, n: number) => {
    setError(false)
    update(d.id, { budget_blocks: clamp(n, 0, MAX_CAP) }).catch(() => setError(true))
  }

  return (
    <Modal title={t('budgets.title')} onClose={onClose}>
      <h2 className="text-xl font-semibold">{t('budgets.title')}</h2>
      <p className="mt-1 text-sm text-text-2">{t('budgets.explain')}</p>

      <div className="mt-4 flex items-center gap-2.5 py-1.5">
        <span className="min-w-0 flex-1 text-sm font-medium">{t('budgets.cap')}</span>
        <Stepper value={cap} onDec={() => setCap(cap - 1)} onInc={() => setCap(cap + 1)} />
        <span className="h-11 w-11 shrink-0" aria-hidden="true" />
      </div>

      {directions.length > 0 ? (
        <>
          {/* One cell per block, same visual language as the limiter grids. */}
          <div className="mt-4 flex flex-wrap gap-0.5" aria-hidden="true">
            {directions.flatMap((d) => {
              const budget = Math.max(0, Math.round(d.budget_blocks))
              return Array.from({ length: budget }, (_, i) => (
                <span key={`${d.id}-${i}`} className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: d.color }} />
              ))
            })}
            {cap > total ? (
              Array.from({ length: cap - total }, (_, i) => (
                <span key={`free-${i}`} className="h-2 w-2 rounded-[2px] border border-muted" />
              ))
            ) : (
              Array.from({ length: Math.min(total - cap, 20) }, (_, i) => (
                <span key={`over-${i}`} className="h-2 w-2 rounded-[2px] border border-[var(--danger)]" />
              ))
            )}
          </div>
          <ul className="mt-3 flex flex-col">
            {directions.map((d) => {
              const Icon = iconFor(d.icon)
              const budget = Math.max(0, Math.round(d.budget_blocks))
              return (
                <li key={d.id} className="flex items-center gap-2.5 py-1.5">
                  <span
                    className="direction-orb grid h-9 w-9 shrink-0 place-items-center rounded-full text-on-accent"
                    style={{ ['--orb' as string]: d.color }}
                  >
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{d.name}</span>
                  <Stepper
                    value={budget}
                    onDec={() => setBudget(d, budget - 1)}
                    onInc={() => setBudget(d, budget + 1)}
                  />
                  <IconButton label={t('budgets.editDirection')} onClick={() => setEditing(d)}>
                    <Pencil size={14} />
                  </IconButton>
                </li>
              )
            })}
          </ul>
          <p
            className={`mt-3 text-sm tabular-nums ${free < 0 ? 'font-medium text-accent' : 'text-text-2'}`}
            role={free < 0 ? 'alert' : undefined}
          >
            {free < 0
              ? t('budgets.over', { n: Math.abs(free) })
              : t('budgets.free', { n: free })}
          </p>
        </>
      ) : (
        <p className="mt-4 text-sm text-text-2">{t('budgets.noDirections')}</p>
      )}

      {error && <p role="alert" className="mt-3 text-accent">{t('form.error')}</p>}

      <div className="mt-4 border-t border-muted pt-3">
        <button
          type="button"
          aria-expanded={explaining}
          onClick={() => setExplaining((v) => !v)}
          className="flex w-full items-center gap-1.5 text-sm font-medium text-text-2 transition hover:text-text"
        >
          <HelpCircle size={15} className="shrink-0" />
          {t('budgets.howTitle')}
        </button>
        <div className="how-body" data-open={explaining || undefined}>
          <p className="mt-2 text-[13px] leading-relaxed text-text-2">{t('budgets.howBody')}</p>
        </div>
      </div>

      {editing ? <DirectionForm direction={editing} onClose={() => setEditing(null)} /> : null}
    </Modal>
  )
}
