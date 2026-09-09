import { supabase } from './supabase'

export type AuthAction = 'signIn' | 'signUp' | 'reset'

/**
 * Register or sign in. New users get a profile + system direction via the
 * on_auth_user_created trigger; existing users keep all of their data.
 */
export async function signInOrSignUp(email: string, password: string, mode: AuthAction) {
  if (mode === 'signUp') {
    return supabase.auth.signUp({ email, password })
  }
  return supabase.auth.signInWithPassword({ email, password })
}

/**
 * Upgrade the current anonymous session to a permanent email/password account.
 * updateUser changes credentials in place on the same auth.users row, so the
 * user id — and every directions/tasks/sessions row keyed to it — survives.
 */
export async function upgradeAnonymous(email: string, password: string) {
  return supabase.auth.updateUser({ email, password })
}

export async function sendPasswordReset(email: string) {
  return supabase.auth.resetPasswordForEmail(email)
}

export async function signOut() {
  await supabase.auth.signOut()
}
