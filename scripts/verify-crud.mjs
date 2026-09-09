// Headless smoke check of the Supabase calls the data hooks make.
// Run: node --env-file=.env.local scripts/verify-crud.mjs
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

const die = (label, error) => {
  console.error(label, error?.message ?? error)
  process.exit(1)
}

const { data: auth, error: authError } = await supabase.auth.signInAnonymously()
if (authError || !auth.user) die('anonymous sign-in failed:', authError ?? new Error('no user'))
const uid = auth.user.id
const today = new Date().toISOString().slice(0, 10)

// mirrors nextSortOrder in src/data/useDirections.ts
async function nextDirectionSortOrder() {
  const { data, error } = await supabase
    .from('directions')
    .select('sort_order')
    .eq('is_system', false)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) die('next direction sort_order:', error)
  return (data?.sort_order ?? -1) + 1
}

// mirrors set() in src/data/useDayPlans.ts
const UNIQUE_VIOLATION = '23505'

async function findDayPlan(directionId, taskId) {
  const lookup = supabase
    .from('day_plans')
    .select('id')
    .eq('direction_id', directionId)
    .eq('date', today)
  const { data, error } = await (
    taskId === null ? lookup.is('task_id', null) : lookup.eq('task_id', taskId)
  )
    .order('id')
    .limit(1)
  if (error) die('day_plan lookup:', error)
  return data[0]
}

const insertDayPlan = (directionId, taskId, planned) =>
  supabase.from('day_plans').insert({
    user_id: uid,
    direction_id: directionId,
    task_id: taskId,
    date: today,
    planned_blocks: planned,
  })

async function setDayPlan(directionId, taskId, planned) {
  const existing = await findDayPlan(directionId, taskId)
  if (planned <= 0) {
    if (!existing) return
    const del = await supabase.from('day_plans').delete().eq('id', existing.id)
    if (del.error) die('day_plan delete:', del.error)
    return
  }
  if (existing) {
    const upd = await supabase
      .from('day_plans')
      .update({ planned_blocks: planned })
      .eq('id', existing.id)
    if (upd.error) die('day_plan update:', upd.error)
    return
  }
  const ins = await insertDayPlan(directionId, taskId, planned)
  if (!ins.error) return
  if (ins.error.code !== UNIQUE_VIOLATION) die('day_plan insert:', ins.error)
  const raced = await findDayPlan(directionId, taskId)
  if (!raced) die('day_plan insert:', ins.error)
  const upd = await supabase
    .from('day_plans')
    .update({ planned_blocks: planned })
    .eq('id', raced.id)
  if (upd.error) die('day_plan update after race:', upd.error)
}

const dir = await supabase
  .from('directions')
  .insert({ user_id: uid, name: 'test', budget_blocks: 4, sort_order: await nextDirectionSortOrder() })
  .select()
  .single()
if (dir.error) die('insert direction:', dir.error)

const dir2 = await supabase
  .from('directions')
  .insert({ user_id: uid, name: 'test 2', budget_blocks: 1, sort_order: await nextDirectionSortOrder() })
  .select()
  .single()
if (dir2.error) die('insert second direction:', dir2.error)
console.log('distinct sort_order on two inserts:', dir.data.sort_order !== dir2.data.sort_order)

const task = await supabase
  .from('tasks')
  .insert({ user_id: uid, direction_id: dir.data.id, title: 'test task', sort_order: 0 })
  .select()
  .single()
if (task.error) die('insert task:', task.error)

const session = await supabase
  .from('sessions')
  .insert({
    user_id: uid,
    direction_id: dir.data.id,
    task_id: task.data.id,
    mode: 'work',
    planned_sec: 1500,
    actual_sec: 1500,
    started_at: new Date().toISOString(),
    status: 'done',
  })
  .select()
  .single()
if (session.error) die('insert session:', session.error)

// twice for the same direction and date with a null task: must stay one row
await setDayPlan(dir.data.id, null, 2)
await setDayPlan(dir.data.id, null, 3)
const nullTaskPlans = await supabase
  .from('day_plans')
  .select('id,planned_blocks')
  .eq('direction_id', dir.data.id)
  .eq('date', today)
  .is('task_id', null)
if (nullTaskPlans.error) die('select null-task day_plans:', nullTaskPlans.error)
if (nullTaskPlans.data.length !== 1) die('day_plan set duplicated rows:', `got ${nullTaskPlans.data.length}`)
console.log('day_plans rows after two set calls (null task):', nullTaskPlans.data.length)
console.log('planned_blocks after second set:', Number(nullTaskPlans.data[0].planned_blocks))

// two concurrent direction-level inserts: the partial unique index must let only one through
const race = await Promise.allSettled([
  insertDayPlan(dir2.data.id, null, 1),
  insertDayPlan(dir2.data.id, null, 1),
])
const raceErrors = race
  .map((r) => (r.status === 'fulfilled' ? r.value.error : r.reason))
  .filter(Boolean)
const racedRows = await supabase
  .from('day_plans')
  .select('id')
  .eq('direction_id', dir2.data.id)
  .eq('date', today)
  .is('task_id', null)
if (racedRows.error) die('select raced day_plans:', racedRows.error)
console.log('rows after two concurrent inserts:', racedRows.data.length)
console.log('inserts rejected with 23505:', raceErrors.filter((e) => e.code === UNIQUE_VIOLATION).length)
if (racedRows.data.length !== 1) die('concurrent insert duplicated rows:', `got ${racedRows.data.length}`)
if (raceErrors.filter((e) => e.code === UNIQUE_VIOLATION).length !== 1)
  die('expected exactly one 23505:', raceErrors.map((e) => e.code).join(',') || 'none')
// the set() fallback must still be able to edit the surviving row
await setDayPlan(dir2.data.id, null, 4)
const afterFallback = await findDayPlan(dir2.data.id, null)
const fallbackRow = await supabase
  .from('day_plans')
  .select('planned_blocks')
  .eq('id', afterFallback.id)
  .single()
if (fallbackRow.error) die('read raced day_plan:', fallbackRow.error)
console.log('planned_blocks after set on raced row:', Number(fallbackRow.data.planned_blocks))

await setDayPlan(dir.data.id, task.data.id, 1)

const track = await supabase
  .from('tracks')
  .insert({ user_id: uid, title: 'test track', url: 'https://example.com/t', sort_order: 0 })
  .select()
  .single()
if (track.error) die('insert track:', track.error)

const reads = {
  directions: await supabase
    .from('directions')
    .select('id')
    .is('archived_at', null)
    .order('sort_order')
    .order('id'),
  tasks: await supabase.from('tasks').select('id').is('archived_at', null).order('sort_order').order('id'),
  sessions: await supabase.from('sessions').select('id,blocks').order('started_at').order('id'),
  day_plans: await supabase.from('day_plans').select('id').eq('date', today).order('id'),
  tracks: await supabase.from('tracks').select('id').order('sort_order').order('id'),
}
for (const [name, r] of Object.entries(reads)) {
  if (r.error) die(`select ${name}:`, r.error)
  console.log(`${name} rows:`, r.data.length)
}
console.log('generated blocks for 1500s session:', Number(reads.sessions.data[0].blocks))

// clean up: day plans go first, they reference the direction
await setDayPlan(dir.data.id, task.data.id, 0)
await setDayPlan(dir.data.id, null, 0)
await setDayPlan(dir2.data.id, null, 0)
let deleted = 3
for (const [table, id] of [
  ['tracks', track.data.id],
  ['sessions', session.data.id],
  ['tasks', task.data.id],
  ['directions', dir.data.id],
  ['directions', dir2.data.id],
]) {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) die(`delete ${table}:`, error)
  deleted += 1
}
console.log('test rows deleted:', deleted)
