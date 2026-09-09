import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from '../../src/App'

vi.mock('../../src/onboarding/Onboarding', () => ({
  ONBOARDED_KEY: 'lim.onboarded',
  Onboarding: () => <div data-testid="onboarding" />,
}))
vi.mock('../../src/lib/auth', () => ({
  ensureSession: vi.fn().mockResolvedValue('test-user'),
}))
vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
    },
  },
}))
vi.mock('../../src/shell/useInteractionSounds', () => ({
  useInteractionSounds: () => undefined,
}))
vi.mock('../../src/shell/TopBar', () => ({
  TopBar: () => <div data-testid="topbar" />,
}))
vi.mock('../../src/timer/TimerScreen', () => ({
  TimerScreen: () => <div data-testid="timer-screen" />,
}))
vi.mock('../../src/panel/LowerPanel', () => ({
  LowerPanel: () => <div data-testid="lower-panel" />,
}))

beforeEach(() => {
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    clear: () => values.clear(),
  })
  localStorage.setItem('lim.onboarded', '1')
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('desktop workspace composition', () => {
  it('renders the shell and workspace components in order', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/app']}><App /></MemoryRouter>
      </QueryClientProvider>,
    )

    const topBar = await screen.findByTestId('topbar')
    const shell = document.querySelector('.app-shell')
    expect(shell).not.toBeNull()
    expect(shell?.firstElementChild).toBe(topBar)

    const workspace = document.querySelector('.app-workspace')
    expect(workspace).not.toBeNull()
    expect(shell?.children[1]).toBe(workspace)
    expect(workspace?.children).toHaveLength(2)
    expect(workspace?.children[0]).toBe(screen.getByTestId('timer-screen'))

    const panel = workspace?.children[1]
    expect(panel?.id).toBe('panel')
    expect(panel?.firstElementChild).toBe(screen.getByTestId('lower-panel'))
  })
})
