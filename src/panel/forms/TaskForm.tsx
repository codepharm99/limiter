import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useTasks } from '../../data/useTasks'
import type { Task } from '../../domain/types'
import { useT } from '../../i18n'
import { Button } from '../../ui/Button'
import { IconButton } from '../../ui/IconButton'
import { Modal, useAnimatedClose } from '../../ui/Modal'

export function TaskForm({
  task,
  directionId,
  onClose,
}: {
  task?: Task
  directionId: string
  onClose: () => void
}) {
  const t = useT()
  const { closing, close } = useAnimatedClose(onClose)
  const { create, update, remove } = useTasks()
  const [title, setTitle] = useState(task?.title ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setError(false)
    try {
      await fn()
      close()
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  const save = () =>
    run(() => {
      const payload = {
        title: title.trim(),
        direction_id: directionId,
      }
      return task ? update(task.id, payload) : create({ ...payload, budget_blocks: 0 })
    })

  return (
    <Modal title={task ? t('form.task') : t('form.newTask')} onClose={busy ? undefined : close} closing={closing}>
      <h2 className="text-xl font-semibold">{task ? t('form.task') : t('form.newTask')}</h2>

      <label className="form-label mt-5 block" htmlFor="task-title">
        {t('form.name')}
      </label>
      <input
        id="task-title"
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="form-control mt-1.5"
      />

      {error && <p role="alert" className="mt-3 text-accent">{t('form.error')}</p>}
      <div className="mt-6 flex items-center justify-end gap-2">
        {task ? <IconButton
          label={t('form.delete')}
          className="ui-icon-button--danger"
          disabled={busy}
          onClick={() => run(() => remove(task.id))}
        >
          <Trash2 size={18} />
        </IconButton> : <span />}
        <div className="flex items-center gap-2">
          <Button variant="ghost" disabled={busy} onClick={close}>
            {t('form.cancel')}
          </Button>
          <Button disabled={busy || title.trim() === ''} onClick={save}>
            {t('form.save')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
