import { useT } from '../../i18n'
import { DirectionRow } from './DirectionRow'
import { ActivityCard } from './ActivityCard'
import { TasksCard } from './TasksCard'

export function MainTab() {
  const t = useT()
  return (
    <div className="flex flex-col gap-4">
      <header className="lg:hidden">
        <h2 className="text-lg font-semibold">{t('main.focusTitle')}</h2>
      </header>
      <div className="lg:hidden">
        <DirectionRow />
      </div>
      <div className="grid gap-4">
        <TasksCard />
        <ActivityCard />
      </div>
    </div>
  )
}
