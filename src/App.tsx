import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Onboarding, ONBOARDED_KEY } from './onboarding/Onboarding'
import { AuthPage } from './auth/AuthPage'
import { ensureSession } from './lib/auth'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { LowerPanel } from './panel/LowerPanel'
import { TopBar } from './shell/TopBar'
import { useInteractionSounds } from './shell/useInteractionSounds'
import { TimerScreen } from './timer/TimerScreen'
import { LandingPage } from './landing/LandingPage'

function Main() {
  useInteractionSounds()
  return (
    <main className="app-shell text-text">
      <TopBar />
      <div className="app-workspace">
        <TimerScreen />
        <div id="panel" className="panel-surface scroll-mt-4 rounded-3xl">
          <LowerPanel />
        </div>
      </div>
    </main>
  )
}

function Entry() {
  const onboarded = localStorage.getItem(ONBOARDED_KEY) === '1'
  return onboarded ? <Main /> : <Navigate to="/app/onboarding" replace />
}

/** Account switches must not leak another user's cached rows into the UI. */
function AuthStateSync() {
  const qc = useQueryClient()
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') qc.clear()
    })
    return () => data.subscription.unsubscribe()
  }, [qc])
  return null
}

function AuthGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  useEffect(() => {
    let alive = true
    ensureSession()
      .then((uid) => {
        if (!alive) return
        setHasSession(Boolean(uid))
        setReady(true)
      })
      .catch((error) => console.error(error))
    return () => { alive = false }
  }, [])
  if (!ready) return <div className="min-h-dvh bg-bg text-muted grid place-items-center">…</div>
  if (!hasSession) return <Navigate to="/auth" replace />
  return <>{children}</>
}

function ProtectedApp() {
  return (
    <AuthGate>
      <AuthStateSync />
      <Routes>
        <Route index element={<Entry />} />
        <Route path="onboarding" element={<Onboarding />} />
      </Routes>
    </AuthGate>
  )
}

export default function App() {
  if (!isSupabaseConfigured) return <SetupNotice />
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/app/*" element={<ProtectedApp />} />
      <Route path="/onboarding" element={<Navigate to="/app/onboarding" replace />} />
    </Routes>
  )
}

/** Deployment is missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. */
function SetupNotice() {
  return (
    <main className="min-h-dvh bg-bg text-text grid place-items-center px-4">
      <div className="max-w-sm rounded-3xl bg-card p-6 text-center">
        <h1 className="text-xl font-semibold">Configuration problem / Ошибка конфигурации</h1>
        <p className="mt-2 text-sm text-text-2">
          The deployment has no Supabase environment variables. Set{' '}
          <code className="text-accent">VITE_SUPABASE_URL</code> and{' '}
          <code className="text-accent">VITE_SUPABASE_ANON_KEY</code> and redeploy.
        </p>
        <p className="mt-2 text-sm text-text-2">
          В деплое не заданы переменные Supabase. Добавьте{' '}
          <code className="text-accent">VITE_SUPABASE_URL</code> и{' '}
          <code className="text-accent">VITE_SUPABASE_ANON_KEY</code> в настройках хостинга и сделайте новый деплой.
        </p>
      </div>
    </main>
  )
}
