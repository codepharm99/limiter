import { useT } from '../i18n'
import { Segmented } from '../ui/Segmented'

export type PanelTab = 'main' | 'journal'

export function PanelTabs({
  value,
  onChange,
}: {
  value: PanelTab
  onChange: (v: PanelTab) => void
}) {
  const t = useT()
  return (
    <Segmented
      options={[
        { value: 'main' as PanelTab, label: t('tabs.main') },
        { value: 'journal' as PanelTab, label: t('tabs.journal') },
      ]}
      value={value}
      onChange={onChange}
      className="w-full"
    />
  )
}
