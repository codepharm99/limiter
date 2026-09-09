import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'

// Local fixtures: all Supabase traffic is intercepted; no account or database is changed.
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  const today = new Date(); today.setHours(10,0,0,0)
  const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: '', app_metadata: {}, user_metadata: {}, created_at: today.toISOString() }
  const directions = [{ id: 'work', user_id: user.id, name: 'Работа', color: 'var(--accent)', icon: 'briefcase', budget_blocks: 10, cadence: 'weekly', active_days: [1,2,3,4,5], is_system: false, sort_order: 0, archived_at: null }, { id: 'other', user_id: user.id, name: 'другое', color: 'var(--muted)', icon: 'box', budget_blocks: 0, cadence: 'weekly', active_days: [], is_system: true, sort_order: 1000, archived_at: null }]
  let sessions = [{ id: 's1', user_id: user.id, direction_id: 'work', task_id: null, mode: 'work', planned_sec: 1500, actual_sec: 1500, blocks: 1, note: 'Проверка журнала', energy: 8, parallel_group: null, started_at: today.toISOString(), ended_at: today.toISOString(), status: 'done', manual: false }]
  const queries = []
  await page.route('**/auth/v1/**', async (route) => {
    const body = route.request().url().includes('/user') ? user : { access_token: 'test-token', token_type: 'bearer', expires_in: 3600, refresh_token: 'test-refresh', user }
    await route.fulfill({ json: body })
  })
  await page.route('**/rest/v1/**', async (route) => {
    const request = route.request(); const url = new URL(request.url()); const table = url.pathname.split('/').pop()
    let body = []
    if (table === 'profiles') body = { id: user.id, locale: 'ru', is_pro: false, week_cap_blocks: 30, work_min: 25, short_break_min: 5, long_break_min: 15 }
    if (table === 'directions') body = directions
    if (table === 'sessions') {
      queries.push(url.search)
      if (request.method() === 'POST') sessions.push({ ...request.postDataJSON(), id: 'manual', blocks: 1 })
      if (request.method() === 'DELETE') sessions = sessions.filter((s) => `eq.${s.id}` !== url.searchParams.get('id'))
      body = sessions
    }
    await route.fulfill({ json: body })
  })
  await page.addInitScript(() => localStorage.setItem('fl.onboarded', '1'))
  await page.goto('http://127.0.0.1:5173')
  await page.getByRole('tab', { name: 'Журнал', exact: true }).click()
  await page.getByText('Проверка журнала', { exact: true }).waitFor()
  await page.getByRole('tab', { name: 'Неделя', exact: true }).click()
  await page.getByText('Блоки по неделям', { exact: true }).waitFor()
  await page.locator('.recharts-bar-rectangle').first().waitFor()
  await page.getByRole('tab', { name: 'Месяц', exact: true }).click()
  await page.getByRole('tab', { name: 'День', exact: true }).click()
  await page.getByRole('button', { name: '+ добавить блок', exact: true }).click()
  await page.getByLabel('Что делал?').fill('Ручной блок')
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await page.getByText('Ручной блок', { exact: true }).waitFor()
  page.on('dialog', (d) => d.accept())
  await page.getByRole('listitem').filter({ hasText: 'Ручной блок' }).getByRole('button', { name: 'Удалить' }).click()
  await page.getByText('Ручной блок', { exact: true }).waitFor({ state: 'detached' })
  await mkdir('test-results', { recursive: true })
  await page.screenshot({ path: 'test-results/journal-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: 'test-results/journal-mobile.png', fullPage: true })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'mobile horizontal overflow')
  assert.deepEqual(errors, [], 'browser errors')
  const monday = new Date(today); monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7); monday.setHours(0,0,0,0)
  for (const query of queries) {
    const lower = new URLSearchParams(query).getAll('started_at').find((v) => v.startsWith('gte.'))
    if (lower) assert.ok(new Date(lower.slice(4)) >= monday, 'free profile queried old history')
  }
  console.log('PASS: day/week/month, chart, manual add/delete, free query range, mobile overflow, browser errors')
} finally { await browser.close() }
