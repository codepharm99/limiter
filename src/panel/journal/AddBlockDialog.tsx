import { useState, type FormEvent } from 'react'
import type { Direction, Task } from '../../domain/types'
import { useSessions } from '../../data/useSessions'
import { useT } from '../../i18n'
import { Button } from '../../ui/Button'
import { Modal, useAnimatedClose } from '../../ui/Modal'
import { SelectMenu } from '../../ui/SelectMenu'
import { directionName } from '../directionName'

type AddManual = ReturnType<typeof useSessions>['addManual']
export function AddBlockDialog({ date, directions, tasks, addManual, onClose }: {
  date: Date; directions: Direction[]; tasks: Task[]; addManual: AddManual; onClose: () => void
}) {
  const t = useT()
  const { closing, close } = useAnimatedClose(onClose)
  const [directionId, setDirectionId] = useState(directions[0]?.id ?? '')
  const [taskId, setTaskId] = useState('')
  const [minutes, setMinutes] = useState('25')
  const [note, setNote] = useState('')
  const [energy, setEnergy] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const directionOptions = directions.length === 0
    ? [{ value: '', label: t('other.name') }]
    : directions.map((direction) => ({ value: direction.id, label: directionName(direction, t) }))
  const taskOptions = [
    { value: '', label: t('journal.noTask') },
    ...tasks.filter((task) => task.direction_id === directionId && !task.done_at)
      .map((task) => ({ value: task.id, label: task.title })),
  ]
  const energyOptions = [
    { value: '', label: t('journal.noEnergy') },
    ...Array.from({ length: 10 }, (_, index) => ({ value: String(index + 1), label: String(index + 1) })),
  ]
  const valid = minutes.trim() !== '' && Number.isFinite(Number(minutes)) && Number(minutes) >= 5 && Number(minutes) <= 180
  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!valid || busy) return
    setBusy(true); setError(false)
    const started = new Date(date)
    started.setHours(12, 0, 0, 0)
    try {
      await addManual({ direction_id: directionId || null, task_id: taskId || null, actual_sec: Math.round(Number(minutes) * 60), started_at: started.toISOString(), note: note.trim() || null, energy: energy === '' ? null : Number(energy) })
      close()
    } catch { setError(true) } finally { setBusy(false) }
  }
  return <Modal title={t('journal.addBlock')} onClose={close} closing={closing}><form onSubmit={save} className="manual-block-form">
    <h2 className="mb-1 text-xl font-semibold">{t('journal.addBlock')}</h2>
    <SelectMenu label={t('form.direction')} value={directionId} options={directionOptions} onChange={(value) => { setDirectionId(value); setTaskId('') }} />
    <SelectMenu label={t('form.task')} value={taskId} options={taskOptions} onChange={setTaskId} />
    <div className="form-field">
      <label className="form-label" htmlFor="manual-minutes">{t('journal.minutes')}</label>
      <input id="manual-minutes" autoFocus required type="number" min={5} max={180} step="any" className="form-control" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
    </div>
    <div className="form-field">
      <label className="form-label" htmlFor="manual-note">{t('complete.note')}</label>
      <textarea id="manual-note" className="form-control form-textarea" value={note} onChange={(e) => setNote(e.target.value)} />
    </div>
    <SelectMenu label={t('complete.energy')} value={energy} options={energyOptions} onChange={setEnergy} />
    {error && <p role="alert" className="text-accent">{t('form.error')}</p>}
    <div className="manual-block-actions"><Button variant="ghost" disabled={busy} onClick={close}>{t('form.cancel')}</Button><Button type="submit" disabled={busy || !valid}>{t('form.save')}</Button></div>
  </form></Modal>
}
