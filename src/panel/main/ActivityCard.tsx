import { useState, type CSSProperties } from 'react'
import { addDays, addWeeks, format } from 'date-fns'
import { enUS, ru } from 'date-fns/locale'
import { formatBlockCount, formatBlocks } from '../../domain/blocks'
import { activityCalendar } from '../../domain/activity'
import { useDirections } from '../../data/useDirections'
import { useSessions } from '../../data/useSessions'
import { weekStart } from '../../domain/week'
import { useLocale, useT } from '../../i18n'
import { useFittedWeeks } from './useFittedWeeks'
import boltUrl from '../../assets/emoji/high_voltage_3d.png'

const WEEKS = 26

export function ActivityCard() {
  const t = useT()
  const [locale] = useLocale()
  const dateLocale = locale === 'ru' ? ru : enUS
  // Frozen per mount: a fresh Date() on every render would churn the sessions
  // query key (it embeds ISO timestamps) and restart the fetch forever.
  const [today] = useState(() => new Date())
  const from = addWeeks(weekStart(today), -(WEEKS - 1))
  const { data: sessions, isLoading } = useSessions(from, addDays(today, 1))
  const { data: directions, other } = useDirections()
  const activity = activityCalendar(sessions, today, WEEKS)
  const calendar = useFittedWeeks(WEEKS, !isLoading)
  const [selectedKey, setSelectedKey] = useState(() => format(today, 'yyyy-MM-dd'))
  const selected =
    activity.days.find((day) => day.key === selectedKey) ??
    activity.days.find((day) => day.key === format(today, 'yyyy-MM-dd'))!
  const directionMap = new Map([...(other ? [other] : []), ...directions].map((direction) => [direction.id, direction]))

  return (
    <section className="activity-card product-card activity-surface p-4">
      <header>
        <h2 className="text-lg font-semibold">{t('activity.title')}</h2>
      </header>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="metric-tile px-3 py-2.5">
          <b className="block text-xl leading-tight text-text">{formatBlocks(activity.totalBlocks, locale)}</b>
          <small className="text-[11px] leading-normal text-text-2">{t('activity.blocks')}</small>
        </div>
        <div className="metric-tile px-3 py-2.5">
          <b className="block text-xl leading-tight text-text">{activity.activeDays}</b>
          <small className="text-[11px] leading-normal text-text-2">{t('activity.days')}</small>
        </div>
        <div className="metric-tile px-3 py-2.5">
          <b className={`block text-xl leading-tight ${activity.streak > 0 ? 'text-accent' : 'text-text'}`}>{activity.streak}</b>
          <small className="text-[11px] leading-normal text-text-2">{t('activity.streak')}</small>
        </div>
      </div>

      {isLoading ? (
        <div className="activity-calendar mt-4 animate-pulse" aria-hidden="true" ref={calendar.ref} style={{ '--act-weeks': calendar.weeks } as CSSProperties}>
          <div className="activity-layout">
            <div className="activity-weekdays" />
            <div className="activity-grid">
              {Array.from({ length: calendar.weeks * 7 }, (_, i) => <i key={i} className="activity-cell" />)}
            </div>
          </div>
        </div>
      ) : (
        <>
          {activity.totalBlocks === 0 ? (
            <p className="mt-4 rounded-2xl bg-bg px-3 py-2.5 text-sm text-text-2">{t('activity.hint')}</p>
          ) : null}
          <div className="activity-calendar mt-4" ref={calendar.ref} style={{ '--act-weeks': calendar.weeks } as CSSProperties}>
            <div className="activity-layout">
              <div className="activity-weekdays" aria-hidden="true">
                {[0, 1, 2, 3, 4, 5, 6].map((day) => <span key={day}>{format(addDays(weekStart(today), day), 'EEEEEE', { locale: dateLocale })}</span>)}
              </div>
              <div className="activity-grid">
                {activity.days.slice(-calendar.weeks * 7).map((day) => {
                  const future = day.date > today
                  const label = t('activity.dayLabel', { date: format(day.date, 'd MMMM', { locale: dateLocale }), blocks: formatBlockCount(day.blocks, locale) })
                  return <button key={day.key} type="button" disabled={future} aria-label={label} aria-pressed={day.key === selected.key} title={label} onClick={() => setSelectedKey(day.key)} className={`activity-cell activity-level-${day.level}`} />
                })}
              </div>
            </div>
          </div>
          <div className="activity-legend mt-3 flex items-center justify-end gap-1.5 text-[11px] text-text-2" aria-label={`${t('activity.less')} — ${t('activity.more')}`}><span>{t('activity.less')}</span>{[0,1,2,3,4].map((level) => <i key={level} className={`activity-cell activity-level-${level}`} />)}<span>{t('activity.more')}</span></div>

          <div className="mt-5 pt-1">
            <h3 className="font-semibold capitalize">{format(selected.date, 'EEEE, d MMMM', { locale: dateLocale })}</h3>
            {selected.sessions.length === 0 ? <p className="mt-2 text-sm text-text-2">{t('activity.empty')}</p> : (
              <ul className="mt-2" key={selected.key}>
                {selected.sessions.map((session) => {
                  const direction = session.direction_id ? directionMap.get(session.direction_id) : other
                  return <li key={session.id} className="day-entry activity-entry">
                    <time className="day-entry__time">{format(new Date(session.started_at), 'HH:mm')}</time>
                    <div className="day-entry__content">
                      <p className={session.note ? '' : 'italic text-text-2'}>{session.note || t('complete.notePlaceholder')}</p>
                      <span className="activity-entry__tags">
                        <span className="day-entry__task activity-entry__fact activity-entry__direction" style={{ color: direction?.color }}>
                          {direction?.name ?? t('other.name')}
                        </span>
                        {session.energy !== null && (
                          <span className="day-energy activity-entry__fact">
                            <img src={boltUrl} alt="" aria-hidden="true" />
                            {session.energy}
                          </span>
                        )}
                        <span className="activity-entry__fact">{t('preset.min', { n: formatBlocks(session.actual_sec / 60, locale) })}</span>
                      </span>
                    </div>
                  </li>
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  )
}
