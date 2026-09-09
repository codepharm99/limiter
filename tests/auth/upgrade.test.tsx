import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { userEvent } from '@testing-library/user-event'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { AuthPage } from '../../src/auth/AuthPage'
import { upgradeAnonymous } from '../../src/lib/account'

/**
 * The upgrade/link flow is `auth.updateUser` on the current anonymous session:
 * the same auth.users row is re-keyed to email/password, so the user id — and
 * every data row keyed to it — survives. These tests pin the client calls
 * behind that guarantee.
 */

const ANON_UID = 'anon-user-id'

type FetchLog = { url: string; body: any }[]

const b64url = (o: unknown) =>
  btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const makeJwt = (sub: string) =>
  `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub, exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`

function makeClient(log: FetchLog) {
  return createClient('https://stub.supabase.co', 'anon-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        const body = init?.body ? JSON.parse(String(init.body)) : null
        let response: unknown = {}
        if (url.includes('/auth/v1/user') && init?.method === 'PUT') {
          response = { id: ANON_UID, email: body.email, is_anonymous: false, app_metadata: { provider: 'email' } }
        } else if (url.includes('/auth/v1/user')) {
          response = { id: ANON_UID, email: null, is_anonymous: true }
        } else if (url.includes('/auth/v1/token')) {
          response = {
            access_token: makeJwt(ANON_UID),
            refresh_token: 'new-refresh',
            user: { id: ANON_UID, is_anonymous: false },
          }
        } else if (url.includes('/auth/v1/logout')) {
          response = {}
        } else {
          response = { msg: 'unexpected', url }
        }
        log.push({ url, body })
        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }) as typeof fetch,
    },
  }) as SupabaseClient
}

const anonSession = () => ({
  access_token: makeJwt(ANON_UID),
  refresh_token: 'anon-refresh',
  token_type: 'bearer',
  user: { id: ANON_UID, is_anonymous: true },
})

const state = vi.hoisted(() => ({ client: undefined as SupabaseClient | undefined }))

vi.mock('../../src/lib/supabase', () => ({
  supabase: new Proxy({} as SupabaseClient, {
    get: (_, prop) => Reflect.get(state.client!, prop),
  }),
}))

async function signInAnonymousSession(client: SupabaseClient) {
  const { error } = await client.auth.setSession(anonSession() as never)
  expect(error).toBeNull()
}

function renderAuth() {
  return render(
    <MemoryRouter initialEntries={['/auth']}>
      <AuthPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('anonymous upgrade / linking', () => {
  it('re-keys the anonymous account to email+password on the same user id', async () => {
    const log: FetchLog = []
    const client = makeClient(log)
    state.client = client
    await signInAnonymousSession(client)

    const { error } = await upgradeAnonymous('kept@limiter.app', 'hunter22')
    expect(error).toBeNull()

    const put = log.find((e) => e.url.includes('/auth/v1/user') && e.body?.email)
    expect(put).toBeTruthy()
    expect(put!.body).toMatchObject({ email: 'kept@limiter.app', password: 'hunter22' })
    // no signup call: a second auth.users row would orphan the existing data
    expect(log.some((e) => e.url.includes('/auth/v1/signup'))).toBe(false)
  })

  it('shows the upgrade form for an anonymous session', async () => {
    const log: FetchLog = []
    const client = makeClient(log)
    state.client = client
    await signInAnonymousSession(client)

    renderAuth()
    expect(await screen.findByRole('button', { name: 'Сохранить аккаунт' })).toBeTruthy()
  })

  it('submits the upgrade form', async () => {
    const log: FetchLog = []
    const client = makeClient(log)
    state.client = client
    await signInAnonymousSession(client)

    const user = userEvent.setup()
    renderAuth()
    await user.type(await screen.findByPlaceholderText('Email'), 'kept@limiter.app')
    await user.type(screen.getByPlaceholderText('Пароль'), 'hunter22')
    await user.click(screen.getByRole('button', { name: 'Сохранить аккаунт' }))

    await waitFor(() => {
      const put = log.find((e) => e.url.includes('/auth/v1/user') && e.body?.email)
      expect(put).toBeTruthy()
    })
    expect(log.find((e) => e.url.includes('/auth/v1/user') && e.body?.email)?.body)
      .toMatchObject({ email: 'kept@limiter.app', password: 'hunter22' })
  })

  it('validates input before calling the server', async () => {
    const log: FetchLog = []
    const client = makeClient(log)
    state.client = client
    await signInAnonymousSession(client)

    const user = userEvent.setup()
    renderAuth()
    await user.type(await screen.findByPlaceholderText('Email'), 'kept@limiter.app')
    await user.type(screen.getByPlaceholderText('Пароль'), 'short')
    await user.click(screen.getByRole('button', { name: 'Сохранить аккаунт' }))

    expect(screen.getByRole('alert')).toBeTruthy()
    expect(log.filter((e) => e.url.includes('/auth/v1/user') && e.body?.email)).toHaveLength(0)
  })

  it('offers anonymous continue for visitors without a session', async () => {
    const log: FetchLog = []
    const client = makeClient(log)
    state.client = client

    renderAuth()
    const anonButton = await screen.findByRole('button', { name: 'Продолжить без аккаунта' })
    expect(anonButton).toBeTruthy()
  })
})
