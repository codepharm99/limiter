import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect, useState, type ReactNode } from 'react'
import { Onboarding, ONBOARDED_KEY } from './onboarding/Onboarding'
import { LandingPage } from './landing/LandingPage'
import { ensureSession } from './lib/auth'
import { LowerPanel } from './panel/LowerPanel'
import { TopBar } from './shell/TopBar'
import { useInteractionSounds } from './shell/useInteractionSounds'
import { TimerScreen } from './timer/TimerScreen'

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

function AuthGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let alive = true
    ensureSession().then(() => alive && setReady(true)).catch((error) => console.error(error))
    return () => { alive = false }
  }, [])
  if (!ready) return <div className="min-h-dvh bg-bg text-muted grid place-items-center">…</div>
  return <>{children}</>
}

function ProtectedApp() {
  return <AuthGate><Routes><Route index element={<Entry />} /><Route path="onboarding" element={<Onboarding />} /></Routes></AuthGate>
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app/*" element={<ProtectedApp />} />
      <Route path="/onboarding" element={<Navigate to="/app/onboarding" replace />} />
    </Routes>
  )
}
