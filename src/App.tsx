import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Onboarding, ONBOARDED_KEY } from './onboarding/Onboarding'
import { AuthPage } from './auth/AuthPage'
import { ensureSession } from './lib/auth'
import { supabase } from './lib/supabase'
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
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/app/*" element={<ProtectedApp />} />
      <Route path="/onboarding" element={<Navigate to="/app/onboarding" replace />} />
    </Routes>
  )
}
