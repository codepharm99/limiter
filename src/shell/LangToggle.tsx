import { Languages } from 'lucide-react'
import { useLocale, useT } from '../i18n'
import { IconButton } from '../ui/IconButton'

export function LangToggle() {
  const [locale, setLocale] = useLocale()
  const t = useT()
  const next = locale === 'ru' ? 'en' : 'ru'
  const label = t(next === 'ru' ? 'lang.toRu' : 'lang.toEn')
  return (
    <IconButton label={label} onClick={() => setLocale(next)}>
      <Languages size={20} />
    </IconButton>
  )
}
