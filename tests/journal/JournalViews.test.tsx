import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Calendar } from '../../src/panel/journal/Calendar'
import { AddBlockDialog } from '../../src/panel/journal/AddBlockDialog'
import { DayView } from '../../src/panel/journal/DayView'
import { MonthView } from '../../src/panel/journal/MonthView'
import { WeekView } from '../../src/panel/journal/WeekView'
import { LimiterRow } from '../../src/panel/main/LimiterRow'
import { dir, session, task } from '../domain/fixtures'

afterEach(() => { cleanup(); vi.restoreAllMocks() })
const today = new Date(2026,8,9)

describe('journal views', () => {
  it('disables dates outside free history and future dates', () => {
    const select = vi.fn()
    render(<Calendar date={today} today={today} earliest={new Date(2026,8,7)} onSelect={select} onMonth={vi.fn()} />)
    expect((screen.getByRole('button', { name: '2026-09-06' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: '2026-09-10' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: '2026-09-08' }))
    expect(select).toHaveBeenCalledWith(new Date(2026,8,8))
  })
  it('keeps manual input after failure, retries, and clears task when direction changes', async () => {
    const a = dir({ name: 'A' }); const b = dir({ name: 'B' }); const tk = task({ direction_id: a.id })
    const save = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined)
    const close = vi.fn()
    render(<AddBlockDialog date={today} directions={[a,b]} tasks={[tk]} addManual={save} onClose={close} />)
    fireEvent.click(screen.getByLabelText('Задача'))
    fireEvent.click(screen.getByRole('option', { name: tk.title }))
    fireEvent.click(screen.getByLabelText('Направление'))
    fireEvent.click(screen.getByRole('option', { name: b.name }))
    fireEvent.change(screen.getByLabelText('Заметка'), { target: { value: 'Read' } })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    await screen.findByRole('alert')
    expect(close).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    await waitFor(() => expect(close).toHaveBeenCalledOnce())
    expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ direction_id: b.id, task_id: null, actual_sec: 1500, note: 'Read', started_at: new Date(2026,8,9,12).toISOString() }))
  })
  it('rejects minutes outside the supported range', () => {
    render(<AddBlockDialog date={today} directions={[]} tasks={[]} addManual={vi.fn()} onClose={vi.fn()} />)
    for (const value of ['', '4', '181']) {
      fireEvent.change(screen.getByLabelText('Минуты'), { target: { value } })
      expect((screen.getByRole('button', { name: 'Сохранить' }) as HTMLButtonElement).disabled).toBe(true)
    }
  })
  it('only displays the selected day and requires confirmation for deletion', async () => {
    const remove = vi.fn().mockResolvedValue(undefined)
    render(<DayView date={today} sessions={[session({ id: 'today', note: 'Current' }), session({ note: 'Yesterday', started_at: new Date(2026,8,8).toISOString() })]} directions={[]} tasks={[]} remove={remove} onAdd={vi.fn()} />)
    expect(screen.queryByText('Yesterday')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }))
    expect(remove).not.toHaveBeenCalled()
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Отмена' }))
    expect(remove).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Удалить' }))
    await waitFor(() => expect(remove).toHaveBeenCalledWith('today'))
  })
  it('groups a completed day without decorative timeline markers', () => {
    const direction = dir({ id: 'work', name: 'Работа', color: '#0e7490' })
    const workTask = task({ id: 'work-task', direction_id: direction.id, title: 'Ревью задачи' })
    render(<DayView
      date={today}
      sessions={[
        session({ id: 'morning', direction_id: direction.id, task_id: workTask.id, note: 'Ревью', energy: 7 }),
        session({ id: 'afternoon', direction_id: direction.id, note: 'Созвон', energy: 8, started_at: new Date(2026, 8, 9, 13).toISOString() }),
      ]}
      directions={[direction]}
      tasks={[workTask]}
      remove={vi.fn()}
      onAdd={vi.fn()}
    />)
    expect(screen.getByTestId('day-view-summary').textContent).toContain('2')
    expect(screen.getByTestId('day-view-summary').textContent).toContain('2 блока')
    expect(screen.getByTestId('day-group-work').className).toContain('day-group')
    expect(document.querySelector('.day-group__marker')).toBeNull()
    expect(document.querySelector('.day-entry__line')).toBeNull()
    expect(document.body.textContent).not.toContain('⚡')
    expect(screen.queryByText('Ревью задачи')).toBeNull()
  })
  it('renders only started weeks of the month and navigates by arrows', async () => {
    const onMonth = vi.fn()
    render(<MonthView date={new Date(2026,8,9)} today={today} earliest={null} sessions={[]} directions={[]} onMonth={onMonth} />)
    // Sep 2026 is Monday-based: weeks of 31 Aug (clipped to 1 Sep) and 7 Sep started before the 9th
    expect(screen.getAllByText(/–/)).toHaveLength(2)
    expect(screen.queryByRole('button', { name: /21/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Предыдущий месяц' }))
    expect(onMonth).toHaveBeenCalledOnce()
  })
  it('keeps weekly limiter rows free of a misleading global legend', () => {
    const direction = dir({ name: 'Работа' })
    render(<WeekView date={today} sessions={[]} directions={[direction]} tasks={[]} cap={10} />)
    expect(screen.queryByText('не сделано')).toBeNull()
    expect(screen.queryByText('без лимита')).toBeNull()
  })
  it('keeps a limiter row free of redundant explanatory controls', () => {
    const direction = dir({ name: 'Работа' })
    render(<LimiterRow name="Работа" agg={{ direction, done: 2, budget: 4, cells: [], tasks: [] }} />)
    expect(screen.queryByRole('button', { name: 'Пояснение к блокам' })).toBeNull()
    expect(screen.queryByRole('tooltip')).toBeNull()
  })
})
