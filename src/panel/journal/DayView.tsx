import { useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { format, isSameDay } from 'date-fns'
import { enUS, ru } from 'date-fns/locale'
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import boltUrl from '../../assets/emoji/high_voltage_3d.png'
import { formatBlockCount, formatBlocks } from '../../domain/blocks'
import { groupDay } from '../../domain/journal'
import type { Direction, Session, Task } from '../../domain/types'
import { useLocale, useT } from '../../i18n'
import { Button } from '../../ui/Button'
import { Modal } from '../../ui/Modal'
import { directionName } from '../directionName'

export function DayView({ date, sessions, directions, tasks, remove, onAdd }: {
  date: Date; sessions: Session[]; directions: Direction[]; tasks: Task[]; remove: (id: string) => Promise<unknown>; onAdd: () => void
}) {
  const t = useT()
  const [locale] = useLocale()
  const [busy, setBusy] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const bodyRefs = useRef(new Map<string, HTMLDivElement>())
  const [bodyHeights, setBodyHeights] = useState<Record<string, number>>({})
  const day = groupDay(sessions.filter((s) => isSameDay(new Date(s.started_at), date)), directions, tasks)
  const groupSignature = day.groups.map((group) => `${group.direction.id}:${group.items.length}`).join('|')
  useLayoutEffect(() => {
    // Measure the content, not the body: body.scrollHeight can never drop below
    // the inline height already set, so a stale height would measure itself forever.
    const next = Object.fromEntries([...bodyRefs.current].map(([id, body]) => [id, body.firstElementChild?.scrollHeight ?? 0]))
    setBodyHeights((current) => Object.keys(next).some((id) => current[id] !== next[id]) ? { ...current, ...next } : current)
  }, [groupSignature])
  const erase = async (id: string) => {
    setBusy(id); setError(false)
    try {
      // Let the row fade out before the data drops; the height transition then
      // pulls the freed space closed on the next render.
      await new Promise((resolve) => window.setTimeout(resolve, 190))
      await remove(id)
    } catch { setError(true) } finally { setBusy(null); setPendingDelete(null) }
  }
  return <section className="day-surface flex flex-col gap-4">
    <header className="day-summary" data-testid="day-view-summary">
      <div className="day-summary__date">
        <p className="day-summary__weekday capitalize">{format(date, 'EEEE', { locale: locale === 'ru' ? ru : enUS })}</p>
        <h3>{format(date, 'd MMM', { locale: locale === 'ru' ? ru : enUS })}</h3>
      </div>
      <div className="day-summary__metrics" aria-label={t('journal.dayStats', { blocks: formatBlockCount(day.blocks, locale), hours: formatBlocks(day.hours, locale), energy: day.energy === null ? '—' : formatBlocks(day.energy, locale) })}>
        <span><strong>{formatBlockCount(day.blocks, locale)}</strong></span>
        <span><strong>{formatBlocks(day.hours, locale)}</strong> ч</span>
        <span className="day-energy"><img src={boltUrl} alt="" aria-hidden="true" /><strong>{day.energy === null ? '—' : formatBlocks(day.energy, locale)}</strong></span>
      </div>
    </header>
    {error && <p role="alert" className="text-accent">{t('journal.deleteError')}</p>}
    {day.groups.length === 0 && <p className="py-8 text-center text-text-2">{t('journal.dayEmpty')}</p>}
    {day.groups.map((g) => {
      const closed = collapsed.has(g.direction.id)
      const toggle = () => {
        const height = bodyRefs.current.get(g.direction.id)?.firstElementChild?.scrollHeight
        if (height !== undefined) setBodyHeights((current) => current[g.direction.id] === height ? current : { ...current, [g.direction.id]: height })
        setCollapsed((current) => {
          const next = new Set(current)
          if (next.has(g.direction.id)) next.delete(g.direction.id)
          else next.add(g.direction.id)
          return next
        })
      }
      return <article key={g.direction.id} data-testid={`day-group-${g.direction.id}`} className="day-group" style={{ '--day-direction': g.direction.color } as CSSProperties}>
        <button type="button" aria-expanded={!closed} onClick={toggle} className="day-group__header">
          <span className="day-group__chevron">{closed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}</span>
          <h4>{directionName(g.direction, t)}</h4>
          <span className="day-group__metric">
            <span className="day-group__fact">{formatBlockCount(g.blocks, locale)}</span>
            {g.energy !== null && <span className="day-group__fact day-energy"><img src={boltUrl} alt="" aria-hidden="true" />{formatBlocks(g.energy, locale)}</span>}
          </span>
        </button>
        <div
          ref={(body) => {
            if (body) bodyRefs.current.set(g.direction.id, body)
            else bodyRefs.current.delete(g.direction.id)
          }}
          className={`day-group__body${closed ? ' is-collapsed' : ''}`}
          style={bodyHeights[g.direction.id] === undefined ? (closed ? { height: 0 } : undefined) : { height: closed ? 0 : bodyHeights[g.direction.id] }}
          aria-hidden={closed}
        >
          <ul className="day-group__items">{g.items.map((s) => {
          return <li key={s.id} className={`day-entry${busy === s.id ? ' is-deleting' : ''}`}>
            <time className="day-entry__time" data-testid="day-view-time">{format(new Date(s.started_at), 'HH:mm')}</time>
            <div className="day-entry__content">
              <p className={s.note ? '' : 'italic text-text-2'}>{s.note || t('complete.notePlaceholder')}</p>
            </div>
            <div className="day-entry__meta">
              {s.energy !== null && <span className="day-entry__fact day-energy"><img src={boltUrl} alt="" aria-hidden="true" />{s.energy}</span>}
              <span className="day-entry__fact">{t('preset.min', { n: formatBlocks(s.actual_sec / 60, locale) })}</span>
              <button aria-label={t('form.delete')} disabled={busy !== null} onClick={() => setPendingDelete(s.id)} className="day-entry__delete"><Trash2 size={16} /></button>
            </div>
          </li>
          })}</ul>
        </div>
      </article>
    })}
    <button className="product-add p-3 text-text-2" onClick={onAdd}>+ {t('journal.addBlock')}</button>
    {pendingDelete !== null ? (
      <Modal title={t('journal.deleteConfirm')} onClose={() => setPendingDelete(null)}>
        <p className="text-sm text-text-2">{t('journal.deleteConfirm')}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" disabled={busy !== null} onClick={() => setPendingDelete(null)}>
            {t('form.cancel')}
          </Button>
          <Button variant="danger" disabled={busy !== null} onClick={() => erase(pendingDelete)}>
            {t('form.delete')}
          </Button>
        </div>
      </Modal>
    ) : null}
  </section>
}
