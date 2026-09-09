import { Check, Coffee } from 'lucide-react'
import { useT } from '../i18n'

export function Step1() {
  const t = useT()
  return <div className="onboarding-split">
    <div className="onboarding-copy">
      <h1>{t('onb1.title')}</h1>
      <p className="onboarding-lead">{t('onb1.body')}</p>
      <div className="onboarding-facts"><span><Check size={16} />{t('onb1.fact')}</span><span><Coffee size={16} />{t('onb1.rest')}</span></div>
    </div>
  </div>
}
