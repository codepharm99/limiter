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

  await mkdir('test-results', { recursive: true })
  await page.goto('http://127.0.0.1:5173')
  await page.locator('.fog-background canvas').waitFor()
  await page.getByRole('heading', { level: 1 }).waitFor()
  await page.screenshot({ path: 'test-results/onboarding-1-desktop.png', fullPage: true })
  await page.getByRole('button', { name: 'Далее', exact: true }).click()
  await page.screenshot({ path: 'test-results/onboarding-2-desktop.png', fullPage: true })
  await page.getByRole('button', { name: 'Далее', exact: true }).click()
  await page.screenshot({ path: 'test-results/onboarding-3-desktop.png', fullPage: true })
  await page.getByRole('button', { name: 'Начать', exact: true }).click()
  await page.getByRole('button', { name: 'Старт', exact: true }).waitFor()
  assert.equal(new URL(page.url()).pathname, '/')
  await page.reload()
  await page.getByRole('button', { name: 'Старт', exact: true }).waitFor()
  await page.evaluate(() => localStorage.removeItem('fl.onboarded'))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('http://127.0.0.1:5173')
  for (let step = 1; step <= 3; step++) {
    await page.getByRole('heading', { level: 1 }).waitFor()
    await page.screenshot({ path: `test-results/onboarding-${step}-mobile.png`, fullPage: true })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `step ${step} overflow`)
    if (step < 3) await page.getByRole('button', { name: 'Далее', exact: true }).click()
  }
  await page.getByRole('button', { name: 'Пропустить настройку', exact: true }).click()
  await page.getByRole('button', { name: 'Старт', exact: true }).waitFor()
  await page.evaluate(() => localStorage.removeItem('fl.onboarded'))
  await page.goto('http://127.0.0.1:5173')
  await page.getByRole('button', { name: 'Пропустить', exact: true }).click()
  await page.getByRole('button', { name: 'Старт', exact: true }).waitFor()
  assert.equal(await page.locator('.fog-background canvas').count(), 1)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.locator('.fog-background canvas').waitFor({ state: 'detached' })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.locator('.fog-background canvas').waitFor()
  assert.equal(await page.locator('.fog-background canvas').count(), 1)
  assert.deepEqual(errors, [])
  console.log('PASS: all three onboarding screens on desktop/mobile, finish, skip from first and last steps, reload, no horizontal overflow or browser errors')
} finally { await browser.close() }
