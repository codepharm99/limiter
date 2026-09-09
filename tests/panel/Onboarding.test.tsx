import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../../src/App'
vi.mock('../../src/timer/TimerScreen', () => ({ TimerScreen: () => <div>Timer ready</div> }))
vi.mock('../../src/panel/LowerPanel', () => ({ LowerPanel: () => null }))
vi.mock('../../src/data/useDirections', () => ({ useDirections: () => ({ data: [], other: null, create: vi.fn() }) }))
vi.mock('../../src/data/useTasks', () => ({ useTasks: () => ({ data: [] }) }))
afterEach(() => { cleanup(); vi.restoreAllMocks() })
beforeEach(() => { localStorage.clear(); vi.spyOn(window, 'scrollTo').mockImplementation(() => {}) })
describe('onboarding navigation', () => {
  it('opens the timer immediately after skipping, without a reload', async () => {
    render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: 'Пропустить' }))
    expect(await screen.findByText('Timer ready')).toBeTruthy()
    expect(localStorage.getItem('lim.onboarded')).toBe('1')
  })
  it('opens the timer after completing all three steps', async () => {
    render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: 'Далее' }))
    fireEvent.click(screen.getByRole('button', { name: 'Далее' }))
    fireEvent.click(screen.getByRole('button', { name: 'Начать' }))
    expect(await screen.findByText('Timer ready')).toBeTruthy()
  })
})
