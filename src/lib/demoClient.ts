import { isoDate } from '../domain/week'

/**
 * In-memory Supabase stand-in with generated demo history, dev only. It speaks
 * the subset of the query builder the app uses: select/insert/update/delete,
 * eq/is/gte/lt filters, order, limit, single/maybeSingle, and the three auth
 * calls in lib/auth.ts and the data hooks.
 */

type Row = Record<string, unknown>
type Result = { data: unknown; error: { message: string; code?: string } | null }

export const DEMO_USER = 'demo-user'

const DOW_FIXTURE = {
  work: 'demo-dir-work',
  startup: 'demo-dir-startup',
  lang: 'demo-dir-lang',
}

const NOTES = [
  'Писал тесты',
  'Правил вёрстку',
  'Созвон с командой',
  'Разбирал баги',
  'Прототип лендинга',
  'Презентация для инвесторов',
  'Урок: грамматика',
  'Словарные карточки',
  'Разбирал статьи',
  'Черновик статьи в блог',
]

/** Deterministic LCG so every reload shows the same, natural-looking history. */
function lcg(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

function seed(): Record<string, Row[]> {
  const rnd = lcg(20260907)
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)]
  const now = new Date()
  const sessions: Row[] = []
  let n = 0

  const pushWork = (start: Date, dir: string, note: string | null) => {
    sessions.push({
      id: `demo-ses-${++n}`,
      user_id: DEMO_USER,
      direction_id: dir,
      task_id: null,
      mode: 'work',
      planned_sec: 1500,
      actual_sec: 1500,
      blocks: 1,
      note,
      energy: rnd() > 0.2 ? 2 + Math.floor(rnd() * 4) : null,
      parallel_group: null,
      started_at: start.toISOString(),
      ended_at: new Date(start.getTime() + 1_500_000).toISOString(),
      status: 'done',
      manual: false,
    })
  }
  const pushBreak = (start: Date, sec: number) => {
    sessions.push({
      id: `demo-ses-${++n}`,
      user_id: DEMO_USER,
      direction_id: null,
      task_id: null,
      mode: 'break',
      planned_sec: sec,
      actual_sec: sec,
      blocks: Math.round((sec / 1500) * 100) / 100,
      note: null,
      energy: null,
      parallel_group: null,
      started_at: start.toISOString(),
      ended_at: new Date(start.getTime() + sec * 1000).toISOString(),
      status: 'done',
      manual: false,
    })
  }

  // Today: three finished blocks plus a break, at fixed offsets before "now"
  // so the current day is always lit and the day list is never empty.
  const minsAgo = (m: number) => new Date(now.getTime() - m * 60_000)
  pushWork(minsAgo(210), DOW_FIXTURE.work, 'Переезжал на новый API')
  pushBreak(minsAgo(180), 300)
  pushWork(minsAgo(150), DOW_FIXTURE.work, 'Собирал метрики за месяц')
  pushWork(minsAgo(45), DOW_FIXTURE.lang, 'Словарные карточки')
  sessions.push({
    id: `demo-ses-${++n}`,
    user_id: DEMO_USER,
    direction_id: DOW_FIXTURE.startup,
    task_id: null,
    mode: 'work',
    planned_sec: 1500,
    actual_sec: 600,
    blocks: 0.4,
    note: null,
    energy: null,
    parallel_group: null,
    started_at: minsAgo(20).toISOString(),
    ended_at: minsAgo(10).toISOString(),
    status: 'aborted',
    manual: false,
  })

  // The previous 12 weeks: work on weekdays, startup on Saturdays, language on Sundays.
  for (let back = 83; back >= 1; back--) {
    const day = new Date(now)
    day.setDate(day.getDate() - back)
    const dow = day.getDay()
    let plan: { dir: string; count: number }[] = []
    if (dow >= 1 && dow <= 5) {
      if (rnd() > 0.15) {
        plan = [{ dir: DOW_FIXTURE.work, count: 1 + Math.floor(rnd() * 4) }]
        if (rnd() > 0.65) plan.push({ dir: DOW_FIXTURE.lang, count: 1 })
      }
    } else if (dow === 6) {
      if (rnd() > 0.45) plan = [{ dir: DOW_FIXTURE.startup, count: 1 + Math.floor(rnd() * 3) }]
    } else if (rnd() > 0.7) {
      plan = [{ dir: DOW_FIXTURE.lang, count: 1 }]
    }

    let hour = 9 + Math.floor(rnd() * 2)
    let minute = pick([0, 15, 30, 45])
    for (const group of plan) {
      for (let b = 0; b < group.count && hour <= 21; b++) {
        const start = new Date(day)
        start.setHours(hour, minute, 0, 0)
        pushWork(start, group.dir, rnd() > 0.25 ? pick(NOTES) : null)
        if (rnd() > 0.5) pushBreak(new Date(start.getTime() + 1_500_000), b === 3 ? 900 : 300)
        hour += 1 + (rnd() > 0.5 ? 1 : 0)
        minute = pick([0, 15, 30, 45])
      }
    }
  }

  return {
    profiles: [
      { id: DEMO_USER, locale: 'ru', is_pro: false, week_cap_blocks: 30, work_min: 25, short_break_min: 5, long_break_min: 15 },
    ],
    directions: [
      { id: DOW_FIXTURE.work, user_id: DEMO_USER, name: 'Работа', color: '#C97868', icon: 'briefcase', budget_blocks: 14, cadence: 'weekly', active_days: [1, 2, 3, 4, 5], is_system: false, sort_order: 0, archived_at: null },
      { id: DOW_FIXTURE.startup, user_id: DEMO_USER, name: 'Стартап', color: '#7897A1', icon: 'rocket', budget_blocks: 7, cadence: 'weekly', active_days: [1, 2, 3, 4, 5, 6, 7], is_system: false, sort_order: 1, archived_at: null },
      { id: DOW_FIXTURE.lang, user_id: DEMO_USER, name: 'Язык', color: '#7A9E9F', icon: 'graduation-cap', budget_blocks: 4, cadence: 'weekly', active_days: [1, 2, 3, 4, 5, 6, 7], is_system: false, sort_order: 2, archived_at: null },
      { id: 'demo-dir-other', user_id: DEMO_USER, name: 'Другое', color: '#9A8FB8', icon: 'box', budget_blocks: 0, cadence: 'weekly', active_days: [1, 2, 3, 4, 5, 6, 7], is_system: true, sort_order: 1000, archived_at: null },
    ],
    tasks: [],
    sessions,
    day_plans: [
      { id: 'demo-plan-1', user_id: DEMO_USER, direction_id: DOW_FIXTURE.work, task_id: null, date: isoDate(now), planned_blocks: 2 },
      { id: 'demo-plan-2', user_id: DEMO_USER, direction_id: DOW_FIXTURE.startup, task_id: null, date: isoDate(now), planned_blocks: 1 },
    ],
    tracks: [
      { id: 'demo-track-1', user_id: DEMO_USER, title: 'Lo-fi для фокуса', url: 'https://example.com/lofi.mp3', sort_order: 0 },
      { id: 'demo-track-2', user_id: DEMO_USER, title: 'Дождь по окну', url: 'https://example.com/rain.mp3', sort_order: 1 },
    ],
  }
}

class Builder {
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private payload: Row | Row[] | null = null
  private patch: Row | null = null
  private filters: ((r: Row) => boolean)[] = []
  private orders: [string, boolean][] = []
  private limitN: number | null = null
  private singleMode: 'none' | 'single' | 'maybe' = 'none'

  constructor(
    private db: Record<string, Row[]>,
    private table: string,
    private nextId: () => string,
  ) {}

  select() { return this }
  insert(payload: Row | Row[]) { this.op = 'insert'; this.payload = payload; return this }
  update(patch: Row) { this.op = 'update'; this.patch = patch; return this }
  delete() { this.op = 'delete'; return this }
  eq(col: string, val: unknown) { this.filters.push((r) => r[col] === val); return this }
  is(col: string, val: unknown) {
    this.filters.push((r) => (val === null ? (r[col] ?? null) === null : r[col] === val))
    return this
  }
  gte(col: string, val: string) { this.filters.push((r) => String(r[col]) >= val); return this }
  lt(col: string, val: string) { this.filters.push((r) => String(r[col]) < val); return this }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orders.push([col, opts?.ascending !== false])
    return this
  }
  limit(n: number) { this.limitN = n; return this }
  single() { this.singleMode = 'single'; return this }
  maybeSingle() { this.singleMode = 'maybe'; return this }

  private exec(): Result {
    const rows = this.db[this.table] ?? []
    if (this.op === 'insert') {
      const inserted = (Array.isArray(this.payload) ? this.payload : [this.payload!]).map((p) => ({
        id: this.nextId(),
        ...p,
      }))
      rows.push(...inserted)
      return { data: this.singleMode === 'none' ? null : (inserted[0] ?? null), error: null }
    }
    const matched = rows.filter((r) => this.filters.every((f) => f(r)))
    if (this.op === 'update') {
      for (const r of matched) Object.assign(r, this.patch)
      return { data: null, error: null }
    }
    if (this.op === 'delete') {
      this.db[this.table] = rows.filter((r) => !this.filters.every((f) => f(r)))
      return { data: null, error: null }
    }
    let out = [...matched]
    for (const [col, asc] of [...this.orders].reverse()) {
      out.sort((a, b) => {
        const x = a[col] as string | number
        const y = b[col] as string | number
        const c = x < y ? -1 : x > y ? 1 : 0
        return asc ? c : -c
      })
    }
    if (this.limitN !== null) out = out.slice(0, this.limitN)
    if (this.singleMode === 'single') return out[0] ? { data: out[0], error: null } : { data: null, error: { message: 'no rows' } }
    if (this.singleMode === 'maybe') return { data: out[0] ?? null, error: null }
    return { data: out, error: null }
  }

  then<T = Result>(onFulfilled?: (r: Result) => T, onRejected?: (e: unknown) => unknown) {
    return Promise.resolve().then(() => this.exec()).then(onFulfilled, onRejected)
  }
}

export function demoClient() {
  const db = seed()
  let seq = 0
  const user = { id: DEMO_USER }
  return {
    from: (table: string) => new Builder(db, table, () => `demo-gen-${++seq}`),
    auth: {
      getUser: async () => ({ data: { user }, error: null }),
      getSession: async () => ({ data: { session: { user } }, error: null }),
      signInAnonymously: async () => ({ data: { user }, error: null }),
    },
  }
}
