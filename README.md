<p align="center">
  <img src="./public/limiter-logo.svg" width="160" height="160" alt="Limiter logo">
</p>

<h1 align="center">Limiter</h1>

<p align="center">
  <strong>A focus timer that shows where your week actually went.</strong>
</p>

<p align="center">
  <a href="./LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-202624"></a>
  <img alt="React 18" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white">
  <img alt="TypeScript 5" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white">
  <img alt="Vite 5" src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white">
  <a href="https://buymeacoffee.com/alzhantaurbek"><img alt="Buy Me A Coffee" src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-alzhantaurbek-FFDD00?logo=buy-me-a-coffee&logoColor=black"></a>
</p>

## See Limiter in action

https://github.com/user-attachments/assets/8a031651-e75f-4ca0-a45b-11eecd521c83

## Make time visible

Limiter pairs a Pomodoro-style timer with a weekly plan. Give work, study, side projects, or personal goals a block budget. Each finished session fills the plan, so the gap between what you meant to do and what you did stays visible.

One block is 25 minutes by default. Longer and shorter sessions count proportionally.

## What you can do

- **Focus your way** with custom work and break timers.
- **Set weekly budgets** for every direction in your life.
- **Turn plans into action** with mini tasks and day planning.
- **Review real progress** in daily, weekly, and monthly journal views.
- **See long-term momentum** across a 26-week activity map.
- **Work in English or Russian** from the same interface.
- **Try it instantly** with local demo data — no database required.

## Quick start

Limiter requires Node.js 20 or newer.

```bash
git clone https://github.com/codepharm99/limiter.git
cd limiter
npm install
npm run dev
```

Open `http://localhost:5173`. The development server starts in demo mode.

## Persistent data with Supabase

To keep real sessions, create a Supabase project and add a `.env.local` file:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

Apply the SQL files in `supabase/migrations/` in order, then enable anonymous sign-ins in Supabase Authentication. Disable demo mode from the browser console:

```js
localStorage.setItem('lim.demo', '0')
```

`.env.local` is ignored by Git. Never commit credentials.

## Commands

```bash
npm run dev      # Start the development server
npm run build    # Type-check and build for production
npm test         # Run the Vitest test suite
npm run e2e      # Run Playwright end-to-end tests
```

> [!CAUTION]
> The scripts in `scripts/` create and delete test data. Use them only with a disposable Supabase project.

## Built with

<p>
  <img src="https://skillicons.dev/icons?i=react" width="48" height="48" alt="React" align="middle"> <img src="https://skillicons.dev/icons?i=ts" width="48" height="48" alt="TypeScript" align="middle"> <img src="https://skillicons.dev/icons?i=vite" width="48" height="48" alt="Vite" align="middle"> <img src="https://skillicons.dev/icons?i=supabase" width="48" height="48" alt="Supabase" align="middle"> <a href="https://tanstack.com/query/latest"><img src="./public/assets/tanstack-query.svg" width="48" height="48" alt="TanStack Query" align="middle"></a> <a href="https://github.com/pmndrs/zustand"><img src="./public/assets/zustand-logo.svg" width="48" height="48" alt="Zustand" align="middle"></a>
</p>

React · TypeScript · Vite · Supabase · TanStack Query · Zustand

## License

Limiter is available under the [MIT License](./LICENSE).
