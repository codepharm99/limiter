import { useState } from 'react'
import { useT } from '../i18n'
import { useDirections } from '../data/useDirections'
import { useTasks } from '../data/useTasks'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import type { PendingCompletion } from './timerStore'
import './complete-block.css'

export function CompleteBlockDialog({
  pending,
  onSave,
}: {
  pending: PendingCompletion
  onSave: (note: string | null, energy: number | null) => Promise<void>
}) {
  const { data: directions, other } = useDirections()
  const { data: tasks } = useTasks()
  const all = other ? [...directions, other] : directions
  const names = pending.directionIds
    .map((id) => all.find((d) => d.id === id)?.name)
    .filter((n): n is string => Boolean(n))
  const directionLabel = names.length > 0 ? names.join(' + ') : ''
  const taskTitle = tasks.find((tk) => tk.id === pending.taskId)?.title

  return <CompleteBlockForm context={[directionLabel, taskTitle].filter(Boolean).join(' · ')} onSave={onSave} />
}

/** Shared by the running timer and the isolated canvas preview. */
export function CompleteBlockForm({ context, onSave, onClose }: {
  context: string
  onSave: (note: string | null, energy: number | null) => Promise<void>
  onClose?: () => void
}) {
  const t = useT()
  const [note, setNote] = useState('')
  const [energy, setEnergy] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  const save = async (n: string | null, e: number | null) => {
    setSaving(true)
    setFailed(false)
    try {
      await onSave(n, e)
    } catch (err) {
      console.error(err)
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={t('complete.title')} onClose={saving ? undefined : onClose}>
      <h2 className="text-xl font-semibold">{t('complete.title')}</h2>
      {context ? <p className="mt-1.5 text-sm text-text-2">{context}</p> : null}

      <label className="form-label mt-5 block" htmlFor="complete-note">
        {t('complete.note')}
      </label>
      <textarea
        id="complete-note"
        rows={3}
        value={note}
        placeholder={t('complete.notePlaceholder')}
        onChange={(e) => setNote(e.target.value)}
        disabled={saving}
        className="form-control form-textarea mt-1.5"
      />

      <fieldset className="mt-5" disabled={saving}>
        <legend className="form-label">{t('complete.energy')}</legend>
        <div className="energy-options" role="group" aria-label={t('complete.energy')}>
          {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
            <button
              key={value}
              type="button"
              aria-label={String(value)}
              aria-pressed={energy === value}
              onClick={() => setEnergy(value)}
              className="energy-option"
            >
              {value}
            </button>
          ))}
        </div>
      </fieldset>

      {failed ? <p role="alert" className="mt-4 text-sm text-text">{t('complete.error')}</p> : null}

      <div className="complete-actions">
        <Button variant="ghost" disabled={saving} onClick={() => save(null, null)}>
          {t('complete.skip')}
        </Button>
        <Button disabled={saving} onClick={() => save(note.trim() || null, energy)}>
          {t('complete.save')}
        </Button>
      </div>
    </Modal>
  )
}
