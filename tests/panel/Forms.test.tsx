import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { TaskForm } from '../../src/panel/forms/TaskForm'
import { DirectionForm } from '../../src/panel/forms/DirectionForm'
import { Step3 } from '../../src/onboarding/Step3'
const api = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), remove: vi.fn(), archive: vi.fn() }))
vi.mock('../../src/data/useTasks', () => ({ useTasks: () => api }))
vi.mock('../../src/data/useDirections', () => ({ useDirections: () => ({ ...api, data: [{ id: 'd', name: 'Work' }], other: null }) }))
beforeEach(() => vi.resetAllMocks())
afterEach(cleanup)
describe('panel forms', () => {
  it('creates a task without asking for a budget', async () => {
    api.create.mockResolvedValue({ id: 't' })
    const close = vi.fn()
    render(<TaskForm directionId="d" onClose={close} />)
    expect(screen.queryByLabelText('Бюджет блоков')).toBeNull()
    const save = screen.getByRole('button', { name: 'Сохранить' }) as HTMLButtonElement
    expect(save.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Название'), { target: { value: 'Task' } })
    expect(save.disabled).toBe(false)
    fireEvent.click(save)
    await waitFor(() => expect(close).toHaveBeenCalled())
    expect(api.create).toHaveBeenCalledWith({ title: 'Task', direction_id: 'd', budget_blocks: 0 })
  })
  it('keeps the direction form open on network failure', async () => {
    const close = vi.fn()
    api.create.mockRejectedValue(new Error('offline'))
    render(<DirectionForm onClose={close} />)
    fireEvent.change(screen.getByLabelText('Название'), { target: { value: 'Work' } })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    await screen.findByRole('alert')
    expect(close).not.toHaveBeenCalled()
    expect((screen.getByRole('button', { name: 'Сохранить' }) as HTMLButtonElement).disabled).toBe(false)
  })
  it('reports starter-set failures and enables retry', async () => {
    api.create.mockRejectedValue(new Error('offline'))
    render(<Step3 />)
    fireEvent.click(screen.getByRole('button', { name: 'Добавить весь набор' }))
    await screen.findByRole('alert')
    expect((screen.getByRole('button', { name: 'Добавить весь набор' }) as HTMLButtonElement).disabled).toBe(false)
  })
})
