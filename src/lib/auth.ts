import { supabase } from './supabase'

let pending: Promise<string | null> | null = null

async function resolveSession(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

// Concurrent callers share one in-flight check, so StrictMode double-invoking
// the AuthGate effect cannot race a sign-in. The promise is dropped once it
// settles: later calls re-check getSession() rather than trusting a uid
// cached for the module lifetime, which would go stale after a sign-out.
// Unlike stage 1, no anonymous user is created here — visitors without a
// session are routed to /auth to sign in, register, or continue anonymously.
export function ensureSession(): Promise<string | null> {
  if (!pending) {
    pending = resolveSession().finally(() => {
      pending = null
    })
  }
  return pending
}

interface UserLike {
  is_anonymous?: boolean
  app_metadata?: { provider?: string }
}

/** True when the session user was created via anonymous sign-in. */
export function isAnonymousUser(user: UserLike | null | undefined): boolean {
  if (!user) return false
  return user.is_anonymous ?? false
}
