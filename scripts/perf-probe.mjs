/* Interaction probe across engines: scrolling main screen with running timer,
   blur on vs off, to see whether Firefox differs from Chromium at all. */
import { firefox, chromium } from '@playwright/test'

const URL = 'http://localhost:5173/'

async function measure(page, { blurOff }) {
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  const skip = page.getByRole('button', { name: 'Пропустить' })
  if (await skip.count()) {
    await skip.click({ force: true }).catch(() => {})
    await page.waitForTimeout(1000)
  }
  if (blurOff) {
    await page.addStyleTag({
      content: '*,*::before,*::after{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}',
    })
  }
  await page.waitForTimeout(400)
  const start = page.getByRole('button', { name: 'Старт' })
  if (await start.count()) await start.click({ force: true }).catch(() => {})
  return page.evaluate(
    () =>
      new Promise((resolve) => {
        let frames = 0
        let longTasks = 0
        let worst = 0
        const obs = new PerformanceObserver((l) => {
          for (const e of l.getEntries()) {
            longTasks++
            if (e.duration > worst) worst = e.duration
          }
        })
        obs.observe({ entryTypes: ['longtask'] })
        const t0 = performance.now()
        const scroller = setInterval(() => {
          window.scrollBy(0, 40)
        }, 16)
        ;(function loop() {
          frames++
          if (performance.now() - t0 < 4000) requestAnimationFrame(loop)
          else {
            clearInterval(scroller)
            obs.disconnect()
            window.scrollTo(0, 0)
            resolve(
              [
                Math.round((frames * 1000) / (performance.now() - t0)),
                longTasks,
                Math.round(worst),
              ].join('|'),
            )
          }
        })()
      }),
  )
}

for (const [type, label] of [[firefox, 'FIREFOX '], [chromium, 'CHROMIUM']]) {
  const browser = await type.launch()
  const page = await browser.newPage()
  const withBlur = await measure(page, { blurOff: false })
  const noBlur = await measure(page, { blurOff: true })
  console.log(`${label} scroll+timer  blurOn=${withBlur}  blurOff=${noBlur}`)
  await browser.close()
}
process.exit(0)
