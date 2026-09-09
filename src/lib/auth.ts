import { supabase } from './supabase'

let pending: Promise<string> | null = null

async function resolveSession(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  if (data.session) return data.session.user.id
  const { data: anon, error } = await supabase.auth.signInAnonymously()
  if (error || !anon.user) throw error ?? new Error('anonymous sign-in failed')
  return anon.user.id
}

// Concurrent callers share one in-flight sign-in, so StrictMode double-invoking
// the AuthGate effect cannot create two anonymous users. The promise is dropped
// once it settles: later calls re-check getSession() rather than trusting a uid
// cached for the module lifetime, which would go stale after a sign-out.
export function ensureSession(): Promise<string> {
  if (!pending) {
    pending = resolveSession().finally(() => {
      pending = null
    })
  }
  return pending
}
