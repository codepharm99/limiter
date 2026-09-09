import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { isAnonymousUser } from '../lib/auth'
import { sendPasswordReset, signInOrSignUp, upgradeAnonymous } from '../lib/account'
import { supabase } from '../lib/supabase'
import { useT } from '../i18n'
import { Button } from '../ui/Button'
import { Logo } from '../shell/Logo'

type Mode = 'signIn' | 'signUp' | 'reset' | 'newPassword' | 'upgrade'

function validEmail(email: string) {
  return /^\S+@\S+\.\S+$/.test(email)
}

/**
 * Email/password entry point. Visitors without a session sign in, register,
 * or continue anonymously (stage 1 behaviour). An anonymous session lands on
 * the upgrade form: updateUser re-keys the same account to email/password, so
 * the existing data survives the switch.
 */
export function AuthPage() {
  const t = useT()
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [mode, setMode] = useState<Mode>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [session, setSession] = useState<{ userId: string; anonymous: boolean } | null>(null)

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      setSession(data.session
        ? { userId: data.session.user.id, anonymous: isAnonymousUser(data.session.user) }
        : null)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (!alive || event !== 'PASSWORD_RECOVERY') return
      setMode('newPassword')
      setInfo(null)
      setError(null)
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  if (!ready) return <div className="min-h-dvh bg-bg text-muted grid place-items-center">…</div>

  // Recovery links arrive with a session; setting a new password needs it.
  const recovering = mode === 'newPassword'
  if (session && !recovering && !session.anonymous) return <Navigate to="/app" replace />
  const view: Mode = session
    ? (recovering ? 'newPassword' : session.anonymous ? 'upgrade' : 'signIn')
    : mode

  const fail = (message: string) => {
    setError(message)
    setInfo(null)
  }

  const run = async (action: () => Promise<{ error: { message: string } | null }>) => {
    setBusy(true)
    setError(null)
    setInfo(null)
    const { error } = await action()
    setBusy(false)
    if (error) return fail(error.message)
    navigate('/app')
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (view === 'reset') return
    if (!validEmail(email)) return fail(t('auth.invalidEmail'))
    if (password.length < 6) return fail(t('auth.shortPassword'))
    if (view === 'signIn' || view === 'signUp') return run(() => signInOrSignUp(email, password, view))
    if (view === 'upgrade') return run(() => upgradeAnonymous(email, password))
    if (view === 'newPassword') return run(() => supabase.auth.updateUser({ password }))
  }

  const requestReset = async (e: FormEvent) => {
    e.preventDefault()
    if (!validEmail(email)) return fail(t('auth.invalidEmail'))
    setBusy(true)
    setError(null)
    const { error } = await sendPasswordReset(email)
    setBusy(false)
    if (error) return fail(error.message)
    setInfo(t('auth.resetSent'))
  }

  const anonymous = async () => {
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInAnonymously()
    setBusy(false)
    if (error) return fail(error.message)
    navigate('/app')
  }

  const input = 'w-full rounded-xl bg-card px-3.5 py-2.5 text-sm text-text outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-accent'
  const link = 'text-accent underline underline-offset-2'
  const swap = (next: Mode) => () => {
    setMode(next)
    setError(null)
    setInfo(null)
  }

  return (
    <main className="min-h-dvh bg-bg text-text grid place-items-center px-4">
      <div className="w-full max-w-sm rounded-3xl bg-card p-6">
        <div className="mb-6 flex justify-center"><Logo /></div>

        {view === 'upgrade' ? (
          <>
            <h1 className="text-xl font-semibold">{t('auth.upgradeTitle')}</h1>
            <p className="mt-1 text-sm text-text-2">{t('auth.upgradeBody')}</p>
          </>
        ) : (
          <h1 className="text-xl font-semibold">
            {view === 'signIn' && t('auth.signInTitle')}
            {view === 'signUp' && t('auth.signUpTitle')}
            {view === 'reset' && t('auth.resetTitle')}
            {view === 'newPassword' && t('auth.newPasswordTitle')}
          </h1>
        )}

        {view === 'reset' ? (
          <form className="mt-5 flex flex-col gap-3" onSubmit={requestReset}>
            <input className={input} type="email" autoComplete="email" required placeholder={t('auth.email')}
              value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button size="lg" type="submit" disabled={busy}>{t('auth.resetSend')}</Button>
          </form>
        ) : (
          <form className="mt-5 flex flex-col gap-3" onSubmit={submit}>
            {view !== 'newPassword' && (
              <input className={input} type="email" autoComplete="email" required placeholder={t('auth.email')}
                value={email} onChange={(e) => setEmail(e.target.value)} />
            )}
            <input className={input} type="password" required minLength={6}
              autoComplete={view === 'signIn' ? 'current-password' : 'new-password'}
              placeholder={view === 'newPassword' ? t('auth.newPassword') : t('auth.password')}
              value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button size="lg" type="submit" disabled={busy}>
              {view === 'signIn' && t('auth.signInTitle')}
              {view === 'signUp' && t('auth.signUpTitle')}
              {view === 'upgrade' && t('auth.upgradeSubmit')}
              {view === 'newPassword' && t('auth.newPasswordSubmit')}
            </Button>
          </form>
        )}

        {error && <p role="alert" className="mt-3 text-sm text-[#C97868]">{error}</p>}
        {info && <p role="status" className="mt-3 text-sm text-accent">{info}</p>}

        <div className="mt-5 flex flex-col gap-2 text-sm text-text-2">
          {view === 'signIn' && (
            <>
              <span>{t('auth.noAccount')} <button type="button" className={link} onClick={swap('signUp')}>{t('auth.signUpTitle')}</button></span>
              <span><button type="button" className={link} onClick={swap('reset')}>{t('auth.forgot')}</button></span>
              <span><button type="button" className={link} onClick={anonymous} disabled={busy}>{t('auth.continueAnon')}</button></span>
            </>
          )}
          {view === 'signUp' && (
            <span>{t('auth.haveAccount')} <button type="button" className={link} onClick={swap('signIn')}>{t('auth.signInTitle')}</button></span>
          )}
          {view === 'reset' && (
            <span><button type="button" className={link} onClick={swap('signIn')}>{t('auth.backToSignIn')}</button></span>
          )}
          {view === 'upgrade' && (
            <>
              <span><button type="button" className={link} onClick={() => navigate('/app')}>{t('auth.upgradeLater')}</button></span>
              <span><button type="button" className={link} onClick={async () => { await supabase.auth.signOut(); navigate('/auth') }}>{t('settings.signOut')}</button></span>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
