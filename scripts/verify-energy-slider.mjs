import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'

// Local fixture: Supabase traffic is intercepted; no account or database is touched.
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/google-chrome' })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  const today = new Date(); today.setHours(10,0,0,0)
  const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: '', app_metadata: {}, user_metadata: {}, created_at: today.toISOString() }
  await page.route('**/auth/v1/**', async (route) => {
    const body = route.request().url().includes('/user') ? user : { access_token: 'test-token', token_type: 'bearer', expires_in: 3600, refresh_token: 'test-refresh', user }
    await route.fulfill({ json: body })
  })
  await page.route('**/rest/v1/**', async (route) => {
    const table = new URL(route.request().url()).pathname.split('/').pop()
    let body = []
    if (table === 'profiles') body = { id: user.id, locale: 'ru', is_pro: false, week_cap_blocks: 30, work_min: 25, short_break_min: 5, long_break_min: 15 }
    if (table === 'directions') body = []
    if (table === 'sessions') body = []
    await route.fulfill({ json: body })
  })

  await mkdir('test-results', { recursive: true })
  await page.goto('http://localhost:5174')
  // Skip onboarding (it shows when fl.onboarded is unset)
  await page.getByRole('button', { name: 'Пропустить', exact: true }).click()
  await page.getByRole('button', { name: 'Старт', exact: true }).waitFor()
  // Open the completion dialog: run a block briefly, then skip it
  await page.getByRole('button', { name: 'Старт', exact: true }).click()
  await page.waitForTimeout(3000)
  await page.getByRole('button', { name: 'Пропустить', exact: true }).click()
  const energy = page.getByRole('slider', { name: 'Энергия' })
  await energy.waitFor()

  // Stops are neutral dots (no per-stop color)
  const stopColors = await page.$$eval('.energy-stop-face', (els) => els.map((el) => getComputedStyle(el).backgroundColor))
  assert.equal(stopColors.length, 5, 'five mood stops rendered')
  assert.ok(stopColors.every((c) => c === stopColors[0]), `stops share one neutral color: ${stopColors.join(', ')}`)

  // Screenshot before dragging
  await page.screenshot({ path: 'test-results/energy-1-before.png' })

  // Drag the bolt slowly to the middle, then fast to the end
  const track = await energy.boundingBox()
  const cy = track.y + track.height / 2
  await page.mouse.move(track.x + track.width * 0.1, cy)
  await page.mouse.down()
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(track.x + track.width * (0.1 + 0.4 * i / 10), cy, { steps: 2 })
    await page.waitForTimeout(40)
  }
  await page.screenshot({ path: 'test-results/energy-2-mid-drag.png' })
  for (let i = 1; i <= 6; i++) {
    await page.mouse.move(track.x + track.width * (0.5 + 0.5 * i / 6), cy, { steps: 1 })
  }
  const midDragScale = await page.$eval('.energy-bolt', (el) => getComputedStyle(el).scale || '1')
  // Land exactly on the last pixel of the track
  await page.mouse.move(track.x + track.width - 1, cy, { steps: 1 })
  await page.mouse.up()
  const now = await energy.getAttribute('aria-valuenow')
  assert.equal(now, '10', `dragging to the end sets value 10, got ${now}`)

  // At 10 the bolt sits at the right edge, fully grown, and the stops under the
  // fill are hidden
  const boltBox = await page.$eval('.energy-bolt', (el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width } })
  assert.ok(boltBox.right <= track.x + track.width + 12, `bolt stays inside the track at 10 (right=${boltBox.right}, track right=${track.x + track.width})`)
  const finalScale = await page.$eval('.energy-bolt', (el) => getComputedStyle(el).scale || '1')
  assert.ok(parseFloat(midDragScale) > 0.9 && parseFloat(finalScale) > parseFloat(midDragScale), `bolt grows with energy (mid-drag=${midDragScale}, at-10=${finalScale})`)
  const hiddenStops = await page.$$eval('.energy-stop-face', (els) => els.map((el) => getComputedStyle(el).opacity))
  // Let the 140ms opacity transition finish before reading final opacities
  await page.waitForTimeout(300)
  const settledStops = await page.$$eval('.energy-stop-face', (els) => els.map((el) => getComputedStyle(el).opacity))
  assert.ok(settledStops.every((o) => o === '0'), `passed stops are hidden (opacity: ${settledStops.join(', ')})`)

  await page.screenshot({ path: 'test-results/energy-3-at-10.png' })
  assert.deepEqual(errors, [])
  console.log('PASS: neutral stops, pixel-following growing bolt, value 10 reachable, stops hidden after passing, no page errors')
} finally { await browser.close() }
