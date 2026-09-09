import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocale, useT, type Locale } from '../i18n'
import { isAnonymousUser } from '../lib/auth'
import { isStage2Enabled } from '../lib/flags'
import { signOut } from '../lib/account'
import { supabase } from '../lib/supabase'
import { setSoundsEnabled, soundsEnabled } from '../lib/sounds'
import { Modal, useAnimatedClose } from '../ui/Modal'
import { SelectMenu } from '../ui/SelectMenu'
import { usePro } from '../data/useSubscription'

function AccountSection() {
  const t = useT()
  const navigate = useNavigate()
  const { pro, subscription } = usePro()
  const [email, setEmail] = useState<string | null>(null)
  const [anonymous, setAnonymous] = useState(false)

  useEffect(() => {
    let alive = true
    supabase.auth.getUser().then(({ data }) => {
      if (!alive) return
      setAnonymous(isAnonymousUser(data.user))
      setEmail(data.user?.email ?? null)
    })
    return () => { alive = false }
  }, [])

  const label = anonymous ? t('settings.anonymous') : email ?? ''
  return (
    <div className="mt-4 rounded-2xl bg-bg px-3.5 py-3">
      <p className="text-sm font-medium">{t('settings.account')}</p>
      <p className="mt-0.5 truncate text-xs text-text-2">{label}</p>
      <p className="mt-0.5 text-xs text-text-2">
        {pro
          ? `✓ Pro${subscription?.status === 'canceled' ? ` · ${t('pro.renewalOff')}` : ''}`
          : t('pro.free')}
      </p>
      <div className="mt-3 flex items-center justify-between gap-2">
        {anonymous
          ? (
            <button type="button" onClick={() => navigate('/auth')} className="text-sm text-accent underline underline-offset-2">
              {t('auth.upgradeSubmit')}
            </button>
          )
          : <span />}
        <button type="button" onClick={async () => { await signOut(); navigate('/auth') }} className="text-sm text-text-2 underline underline-offset-2 hover:text-text">
          {t('settings.signOut')}
        </button>
      </div>
    </div>
  )
}

/** Settings shell: language, sounds, account and Pro state. */
export function SettingsModal({ onClose }: { onClose: () => void }) {
  const t = useT()
  const [locale, setLocale] = useLocale()
  const [sounds, setSounds] = useState(soundsEnabled)
  const { closing, close } = useAnimatedClose(onClose)
  return (
    <Modal title={t('settings.title')} onClose={close} closing={closing}>
      <h2 className="text-xl font-semibold">{t('settings.title')}</h2>
      <div className="mt-5">
        <SelectMenu
          label={t('settings.language')}
          value={locale}
          options={[
            { value: 'ru', label: 'Русский' },
            { value: 'en', label: 'English' },
          ]}
          onChange={(value) => setLocale(value as Locale)}
        />
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={sounds}
        onClick={() => {
          const next = !sounds
          setSoundsEnabled(next)
          setSounds(next)
        }}
        className="mt-4 flex w-full items-center justify-between rounded-2xl bg-bg px-3.5 py-3 text-left"
      >
        <span className="text-sm font-medium">{t('settings.sounds')}</span>
        <span className={`switch ${sounds ? 'is-on' : ''}`} aria-hidden="true">
          <span className="switch__thumb" />
        </span>
      </button>
      {isStage2Enabled() && <AccountSection />}
      <VersionFooter />
    </Modal>
  )
}

/** Hidden stage-2 switch: tap the version 7 times within 5 seconds. */
function VersionFooter() {
  const stage2 = isStage2Enabled()
  const [taps, setTaps] = useState(0)
  useEffect(() => {
    if (taps === 0) return
    const timer = window.setTimeout(() => setTaps(0), 5000)
    return () => window.clearTimeout(timer)
  }, [taps])
  useEffect(() => {
    if (taps < 7) return
    localStorage.setItem('lim.stage2', stage2 ? '0' : '1')
    window.location.reload()
  }, [taps, stage2])
  return (
    <button
      type="button"
      aria-label={stage2 ? undefined : 'limiter'}
      onClick={() => setTaps((n) => n + 1)}
      className="mt-6 w-full select-none text-center text-[11px] text-muted/60"
    >
      v0.2.0{stage2 ? ' · dev' : ''}
    </button>
  )
}
