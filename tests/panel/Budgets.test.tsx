import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { BudgetsModal } from '../../src/panel/main/BudgetsModal'
import { dir } from '../domain/fixtures'

const directionsApi = vi.hoisted(() => ({ update: vi.fn() }))
const profileApi = vi.hoisted(() => ({ update: vi.fn() }))
let directions: ReturnType<typeof dir>[]
let profile: { week_cap_blocks: number }

vi.mock('../../src/data/useDirections', () => ({
  useDirections: () => ({ ...directionsApi, data: directions, other: null }),
}))
vi.mock('../../src/data/useProfile', () => ({
  useProfile: () => ({ ...profileApi, data: profile }),
}))

beforeEach(() => {
  vi.resetAllMocks()
  directionsApi.update.mockResolvedValue(undefined)
  profileApi.update.mockResolvedValue(undefined)
  directions = [
    dir({ id: 'w1', name: 'Работа', color: '#C97868', budget_blocks: 14 }),
    dir({ id: 'w2', name: 'Язык', color: '#7897A1', budget_blocks: 7 }),
  ]
  profile = { week_cap_blocks: 30 }
})
afterEach(cleanup)

describe('budgets modal', () => {
  it('shows the week cap, per-direction split and the free counter', () => {
    render(<BudgetsModal onClose={vi.fn()} />)
    expect(screen.getByText('Блоки на неделю')).toBeTruthy()
    expect(screen.getByText('Всего блоков в неделю')).toBeTruthy()
    expect(screen.getByText('Свободно 9')).toBeTruthy()
  })

  it('steps a direction budget and saves immediately', async () => {
    render(<BudgetsModal onClose={vi.fn()} />)
    const workRow = screen.getByText('Работа').closest('li')!
    fireEvent.click(workRow.querySelector('[aria-label="+"]')!)
    await vi.waitFor(() => expect(directionsApi.update).toHaveBeenCalledWith('w1', { budget_blocks: 15 }))
  })

  it('never steps a budget below zero', async () => {
    directions = [dir({ id: 'w1', name: 'Работа', budget_blocks: 0 })]
    render(<BudgetsModal onClose={vi.fn()} />)
    const row = screen.getByText('Работа').closest('li')!
    fireEvent.click(row.querySelector('[aria-label="-"]')!)
    await vi.waitFor(() => expect(directionsApi.update).toHaveBeenCalledWith('w1', { budget_blocks: 0 }))
  })

  it('steps the week cap and saves the profile', async () => {
    render(<BudgetsModal onClose={vi.fn()} />)
    const capRow = screen.getByText('Всего блоков в неделю').parentElement!.parentElement!
    fireEvent.click(capRow.querySelector('[aria-label="-"]')!)
    await vi.waitFor(() => expect(profileApi.update).toHaveBeenCalledWith({ week_cap_blocks: 29 }))
  })

  it('warns when budgets exceed the cap', () => {
    profile = { week_cap_blocks: 15 }
    render(<BudgetsModal onClose={vi.fn()} />)
    const warn = screen.getByText(/Перебор на 6/)
    expect(warn.getAttribute('role')).toBe('alert')
  })

  it('opens the direction editor for renaming', () => {
    render(<BudgetsModal onClose={vi.fn()} />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Изменить направление' })[0]!)
    expect(screen.getByLabelText('Название')).toBeTruthy()
  })
})
