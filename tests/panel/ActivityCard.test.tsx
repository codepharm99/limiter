import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { format, subDays } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ActivityCard } from '../../src/panel/main/ActivityCard'
import { dir, session } from '../domain/fixtures'

const data = vi.hoisted(() => ({ sessions: [] as unknown[], directions: [] as unknown[] }))
vi.mock('../../src/data/useSessions', () => ({
  useSessions: () => ({ data: data.sessions, isLoading: false }),
}))
vi.mock('../../src/data/useDirections', () => ({
  useDirections: () => ({ data: data.directions, other: null }),
}))

afterEach(() => { cleanup(); data.sessions = []; data.directions = [] })

describe('activity card', () => {
  it('fills cells from done work only and lists the selected day', () => {
    const d = dir({ name: 'Работа' })
    data.directions = [d]
    data.sessions = [
      session({ direction_id: d.id, note: 'Писал тесты', started_at: new Date().toISOString() }),
      session({ direction_id: d.id, status: 'running', started_at: new Date().toISOString() }),
    ]
    render(<ActivityCard />)
    const today = screen.getByRole('button', { name: `${format(new Date(), 'd MMMM', { locale: ru })}: 1 блок` })
    expect(today.className).toContain('activity-level-2')
    expect(today.getAttribute('aria-pressed')).toBe('true')
    // a week extends past today; those cells are not selectable
    expect(screen.getAllByRole('button').some((b) => (b as HTMLButtonElement).disabled)).toBe(true)
    expect(screen.getByText('Писал тесты')).toBeTruthy()
    expect(screen.getByText('Работа')).toBeTruthy()
  })

  it('opens an earlier day on click and shows an empty state otherwise', () => {
    const yesterday = subDays(new Date(), 1)
    data.sessions = [session({ note: 'Вчера', started_at: yesterday.toISOString() })]
    render(<ActivityCard />)
    expect(screen.getByText('В этот день блоков не было.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: `${format(yesterday, 'd MMMM', { locale: ru })}: 1 блок` }))
    expect(screen.getByText('другое')).toBeTruthy()
    expect(screen.getByText('Вчера')).toBeTruthy()
    expect(screen.queryByText('В этот день блоков не было.')).toBeNull()
  })

  it('shows the note with minutes and energy like the journal day view', () => {
    const d = dir({ name: 'Работа' })
    data.directions = [d]
    data.sessions = [session({ direction_id: d.id, note: 'Созвон', energy: 7, actual_sec: 1500, started_at: new Date().toISOString() })]
    render(<ActivityCard />)
    expect(screen.getByText('Созвон')).toBeTruthy()
    expect(screen.getByText('25 мин')).toBeTruthy()
    expect(screen.getByText('7')).toBeTruthy()
    expect(screen.getByText('Работа').classList).toContain('activity-entry__fact')
  })
})
