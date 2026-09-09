export const NOTIFICATIONS_KEY = 'lim.notifications'

export function notificationsEnabled() {
  return localStorage.getItem(NOTIFICATIONS_KEY) === '1' &&
    typeof Notification !== 'undefined' && Notification.permission === 'granted'
}

export async function enableNotifications() {
  if (typeof Notification === 'undefined') return false
  const permission = Notification.permission === 'default'
    ? await Notification.requestPermission()
    : Notification.permission
  const enabled = permission === 'granted'
  localStorage.setItem(NOTIFICATIONS_KEY, enabled ? '1' : '0')
  return enabled
}

export function disableNotifications() {
  localStorage.setItem(NOTIFICATIONS_KEY, '0')
}

export function notifyFinished(mode: 'work' | 'break', locale: 'ru' | 'en') {
  if (!notificationsEnabled()) return
  const work = mode === 'work'
  const title = locale === 'ru'
    ? work ? 'Блок завершён' : 'Перерыв завершён'
    : work ? 'Focus block finished' : 'Break finished'
  const body = locale === 'ru'
    ? work ? 'Запиши результат и отдохни.' : 'Пора вернуться к работе.'
    : work ? 'Log the result and take a break.' : 'Time to get back to work.'
  new Notification(title, { body, tag: 'limiter-timer' })
}
