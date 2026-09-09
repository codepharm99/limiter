import { useState } from 'react'
import { Bell, BellOff, Settings } from 'lucide-react'
import { useT } from '../i18n'
import { IconButton } from '../ui/IconButton'
import { disableNotifications, enableNotifications, notificationsEnabled } from './notifications'
import { Logo } from './Logo'
import { SettingsModal } from './SettingsModal'

/** Bell toggles notifications inline; the gear opens the settings modal. */
export function TopBar() {
  const t = useT()
  const [enabled, setEnabled] = useState(notificationsEnabled)
  const [blocked, setBlocked] = useState(
    () => typeof Notification !== 'undefined' && Notification.permission === 'denied',
  )
  const [open, setOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const toggleNotifications = async () => {
    if (enabled) {
      disableNotifications()
      setEnabled(false)
      return
    }
    const ok = await enableNotifications()
    setEnabled(ok)
    setBlocked(!ok && typeof Notification !== 'undefined' && Notification.permission === 'denied')
  }
  return (
    <header className="flex items-center justify-between gap-2">
      <Logo />
      <div className="relative flex items-center gap-2">
        <IconButton label={t('notif.title')} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          <span key={String(enabled)} className="notif-bell-pop inline-flex">
            {enabled ? <Bell size={20} /> : <BellOff size={20} />}
          </span>
        </IconButton>
        <IconButton label={t('settings.title')} onClick={() => setSettingsOpen(true)}>
          <Settings size={20} />
        </IconButton>
        {open ? (
          <div className="glass-card notification-popover absolute right-0 top-14 z-20 w-64 rounded-2xl p-4 text-sm shadow-lg">
            <p className="font-medium">{t('notif.title')}</p>
            <p key={String(enabled)} className="notif-swap mt-1 text-xs leading-relaxed text-text-2">
              {t(enabled ? 'notif.enabled' : blocked ? 'notif.blocked' : 'notif.disabled')}
            </p>
            <button
              type="button"
              onClick={toggleNotifications}
              key={String(enabled)}
              className="notif-swap mt-3 w-full rounded-xl bg-accent px-3 py-2 text-on-accent transition hover:bg-[color:var(--action-hover)]"
            >
              {t(enabled ? 'notif.turnOff' : 'notif.turnOn')}
            </button>
          </div>
        ) : null}
      </div>
      {settingsOpen ? <SettingsModal onClose={() => setSettingsOpen(false)} /> : null}
    </header>
  )
}
