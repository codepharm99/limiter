import { useT } from '../../i18n'
import { Segmented } from '../../ui/Segmented'
export type Period = 'day' | 'week' | 'month'
export function PeriodTabs({ value, onChange }: { value: Period; onChange: (v: Period) => void }) {
  const t = useT()
  return <Segmented value={value} onChange={onChange} options={(['day', 'week', 'month'] as const).map((value) => ({ value, label: t(`journal.${value}`) }))} />
}
