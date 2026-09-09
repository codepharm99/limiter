import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { useTimerStore, initialState } from '../../src/timer/timerStore'
import { useSessionSync } from '../../src/timer/useSessionSync'
import { session } from '../domain/fixtures'

const api = vi.hoisted(() => ({ start: vi.fn(), finish: vi.fn(), insertMany: vi.fn(), remove: vi.fn() }))
vi.mock('../../src/data/useSessions', () => ({ useSessions: () => api }))
vi.mock('../../src/data/useDirections', () => ({ useDirections: () => ({ other: { id: 'other' } }) }))
beforeEach(() => { vi.resetAllMocks(); useTimerStore.setState(initialState) })
afterEach(cleanup)

describe('session save recovery', () => {
  it('creates a missing row and retains completion if saving fails', async () => {
    useTimerStore.setState({ pendingCompletion: { actualSec: 1500, directionIds: [], taskId: null, rowId: null } })
    api.start.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(session({ id: 'recovered' }))
    api.finish.mockResolvedValue(undefined)
    const { result } = renderHook(useSessionSync)
    await act(async () => { await expect(result.current.save('note', 8)).rejects.toThrow('offline') })
    expect(useTimerStore.getState().pendingCompletion).not.toBeNull()
    await act(async () => { await result.current.save('note', 8) })
    expect(api.finish).toHaveBeenCalledWith('recovered', { actual_sec: 1500, status: 'done', note: 'note', energy: 8 })
    expect(useTimerStore.getState().pendingCompletion).toBeNull()
  })
  it('waits for an in-flight insert instead of creating another row', async () => {
    let resolve!: (value: ReturnType<typeof session>) => void
    api.start.mockReturnValue(new Promise((r) => { resolve = r }))
    api.finish.mockResolvedValue(undefined)
    useTimerStore.setState({ status: 'running', endsAt: Date.now() + 1000 })
    const { result } = renderHook(useSessionSync)
    await waitFor(() => expect(api.start).toHaveBeenCalledOnce())
    act(() => useTimerStore.setState({ status: 'idle', mode: 'break', pendingCompletion: { actualSec: 1500, directionIds: [], taskId: null, rowId: null } }))
    await act(async () => {
      const saving = result.current.save(null, null)
      resolve(session({ id: 'pending' }))
      await saving
    })
    expect(api.start).toHaveBeenCalledOnce()
    expect(api.finish).toHaveBeenCalledWith('pending', expect.objectContaining({ actual_sec: 1500 }))
    expect(useTimerStore.getState().pendingCompletion).toBeNull()
  })
  it('does not delete a restored completed row', () => {
    useTimerStore.setState({ sessionRowId: 'kept', pendingCompletion: { actualSec: 1500, directionIds: [], taskId: null, rowId: null } })
    renderHook(useSessionSync)
    expect(api.remove).not.toHaveBeenCalled()
  })
})
