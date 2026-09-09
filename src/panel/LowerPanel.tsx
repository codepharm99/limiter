import { lazy, Suspense, useState } from 'react'
const JournalTab = lazy(() => import('./journal/JournalTab').then((m) => ({ default: m.JournalTab })))
import { MainTab } from './main/MainTab'
import { PanelTabs, type PanelTab } from './PanelTabs'

export function LowerPanel() {
  const [tab, setTab] = useState<PanelTab>('main')
  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <PanelTabs value={tab} onChange={setTab} />
      {tab === 'main' ? <MainTab /> : <Suspense fallback={null}><JournalTab /></Suspense>}
    </div>
  )
}
