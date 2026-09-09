import { useT } from '../../i18n'

/** Free tier notice. The Pro link is a placeholder until billing lands. */
export function ProBanner() {
  const t = useT()
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
