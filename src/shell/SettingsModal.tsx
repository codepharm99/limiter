import { useState } from 'react'
import { useLocale, useT, type Locale } from '../i18n'
import { setSoundsEnabled, soundsEnabled } from '../lib/sounds'
import { Modal, useAnimatedClose } from '../ui/Modal'
import { SelectMenu } from '../ui/SelectMenu'

/** Settings shell: language and sound effects; more settings land later. */
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
    </Modal>
  )
}
