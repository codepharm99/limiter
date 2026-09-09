import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CompleteBlockForm } from '../../src/timer/CompleteBlockDialog'

vi.mock('../../src/data/useTasks', () => ({ useTasks: () => ({ data: [] }) }))
vi.mock('../../src/data/useDirections', () => ({ useDirections: () => ({ data: [], other: null }) }))
afterEach(cleanup)

describe('completion dialog', () => {
  it('keeps keyboard focus inside and restores it when the preview closes', async () => {
    const trigger = document.createElement('button')
    document.body.append(trigger)
    trigger.focus()
    const close = vi.fn()
    const view = render(<CompleteBlockForm context="Работа" onSave={vi.fn()} onClose={close} />)
    const note = screen.getByLabelText('Заметка')
    expect(document.activeElement).toBe(note)
    fireEvent.keyDown(note, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Закрыть' }))
    fireEvent.keyDown(document.activeElement!, { key: 'Tab' })
    expect(document.activeElement).toBe(note)
    fireEvent.keyDown(note, { key: 'Escape' })
    await waitFor(() => expect(close).toHaveBeenCalledOnce())
    view.unmount()
    expect(document.activeElement).toBe(trigger)
    trigger.remove()
  })

  it('preserves entered values on failure and retries the same completion', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined)
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<CompleteBlockForm context="Работа" onSave={save} />)
    fireEvent.change(screen.getByLabelText('Заметка'), { target: { value: '  Тесты  ' } })
    const energy = screen.getByRole('button', { name: '7' })
    fireEvent.click(energy)
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    await screen.findByRole('alert')
    expect((screen.getByLabelText('Заметка') as HTMLTextAreaElement).value).toBe('  Тесты  ')
    expect(energy.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2))
    expect(save).toHaveBeenLastCalledWith('Тесты', 7)
    log.mockRestore()
  })

  it('does not save or discard a pending completion on Escape', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    render(<CompleteBlockForm context="Работа" onSave={save} />)
    fireEvent.keyDown(screen.getByLabelText('Заметка'), { key: 'Escape' })
    expect(save).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Пропустить' }))
    await waitFor(() => expect(save).toHaveBeenCalledWith(null, null))
  })
})
