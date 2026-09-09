import { useT } from '../i18n'

/** The L mark from the brand sheet plus the wordmark in the app font. */
export function Logo({ size = 26 }: { size?: number }) {
  const t = useT()
  return (
    <span className="app-logo">
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
        <path fill="currentColor" d="M 10 32 L 44 10 L 44 72 L 88 72 L 88 88 L 10 88 Z" />
      </svg>
      {t('app.name')}
    </span>
  )
}
