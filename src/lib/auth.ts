import { isStage2Enabled } from './flags'
import { supabase } from './supabase'

let pending: Promise<string | null> | null = null

async function resolveSession(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  if (data.session) return data.session.user.id
  if (isStage2Enabled()) return null
  const { data: anon, error } = await supabase.auth.signInAnonymously()
  if (error || !anon.user) throw error ?? new Error('anonymous sign-in failed')
  return anon.user.id
}

// Concurrent callers share one in-flight sign-in, so StrictMode double-invoking
// the AuthGate effect cannot create two anonymous users. The promise is dropped
// once it settles: later calls re-check getSession() rather than trusting a uid
// cached for the module lifetime, which would go stale after a sign-out.
// Stage 2 hidden: visitors get a silent anonymous session (stage 1 behaviour);
// the stage-2 flag routes signed-out users to /auth instead.
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
