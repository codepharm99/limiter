import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useT } from '../i18n'
import { LangToggle } from '../shell/LangToggle'
import { Step1 } from './Step1'
import { Step2 } from './Step2'
import { Step3 } from './Step3'
import './onboarding.css'

export const ONBOARDED_KEY = 'lim.onboarded'
export function markOnboarded() {
  localStorage.setItem(ONBOARDED_KEY, '1')
}

export function Onboarding() {
  const t = useT()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const finish = () => {
    markOnboarded()
    navigate('/', { replace: true })
  }
  const changeStep = (next: number) => {
    setStep(next)
    window.scrollTo?.({ top: 0, behavior: 'instant' })
  }
  return (
    <main className="onboarding">
      <header className="onboarding-header">
        <span className="onboarding-brand">
          <svg width={22} height={22} viewBox="0 0 100 100" fill="none" aria-hidden="true"><path fill="currentColor" d="M 10 32 L 44 10 L 44 72 L 88 72 L 88 88 L 10 88 Z" /></svg>
          {t('app.name')}
        </span>
        <div className="onboarding-header-end">
          <button className="onboarding-skip" onClick={finish}>{step === 3 ? t('onb.skipSetup') : t('onb.skip')}</button>
          <LangToggle />
        </div>
      </header>
      <div key={step} className="onboarding-content">
        {step === 1 ? <Step1 /> : step === 2 ? <Step2 /> : <Step3 />}
      </div>
      <footer className="onboarding-footer">
        <div className="onboarding-progress" aria-hidden="true">
          {[1, 2, 3].map((n) => <span key={n} className={n <= step ? 'is-complete' : ''} />)}
        </div>
        <div className="onboarding-actions">
          {step > 1 && <button className="onboarding-back" onClick={() => changeStep(step - 1)}><ArrowLeft size={16} />{t('onb.back')}</button>}
          <button className="onboarding-next" onClick={step === 3 ? finish : () => changeStep(step + 1)}>{step === 3 ? t('onb.startBtn') : t('onb.next')}<ArrowRight size={16} /></button>
        </div>
      </footer>
    </main>
  )
}
