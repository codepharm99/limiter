import { useState } from 'react'
import { useT } from '../../i18n'
import { isStage2Enabled } from '../../lib/flags'
import { startProCheckout } from '../../lib/checkout'
import { usePro } from '../../data/useSubscription'

/** Free tier notice. Billing UI only exists behind the stage-2 flag. */
export function ProBanner() {
  const t = useT()
  const stage2 = isStage2Enabled()
  const { pro, subscription } = usePro()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  if (stage2 && pro) {
    const until = subscription?.current_period_end ? new Date(subscription.current_period_end) : null
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-card px-4 py-3 text-sm text-text-2">
        <span className="font-medium text-text">✓ Pro</span>
        {until && <span>{t('pro.until', { date: until.toLocaleDateString() })}</span>}
        {subscription?.status === 'canceled' && <span>{t('pro.renewalOff')}</span>}
      </div>
    )
  }

  if (stage2) {
    const upgrade = async () => {
      setBusy(true)
      setFailed(false)
      const { url, error } = await startProCheckout()
      setBusy(false)
      if (error || !url) return setFailed(true)
      window.open(url, '_blank', 'noopener')
    }
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-card px-4 py-3 text-sm text-text-2">
        <span>{t('pro.banner')}</span>
        <span className="text-text">{t('pro.bannerPro')}</span>
        <button type="button" onClick={upgrade} disabled={busy} className="rounded-full bg-accent px-3 py-1.5 text-sm text-on-accent transition hover:bg-[color:var(--action-hover)] disabled:opacity-60">
          {t('pro.get')}
        </button>
        {failed && <span role="alert" className="text-[#C97868]">{t('pro.checkoutError')}</span>}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-card px-4 py-3 text-sm text-text-2">
      <span>{t('pro.banner')}</span>
      <span className="text-text">{t('pro.bannerPro')}</span>
      <button type="button" className="text-accent underline">
        {t('pro.what')}
      </button>
    </div>
  )
}
