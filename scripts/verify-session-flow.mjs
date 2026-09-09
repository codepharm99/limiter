// Headless check of the session write path the timer uses: running row -> finish,
// then a parallel pair sharing one group.
// Run: node --env-file=.env.local scripts/verify-session-flow.mjs
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

const die = (label, error) => {
  console.error(label, error.message)
  process.exit(1)
}

const { data: auth, error: authError } = await supabase.auth.signInAnonymously()
if (authError || !auth.user) die('anonymous sign-in failed:', authError ?? new Error('no user'))
const uid = auth.user.id

const running = await supabase
  .from('sessions')
  .insert({
    user_id: uid,
    mode: 'work',
    planned_sec: 1500,
    started_at: new Date().toISOString(),
    status: 'running',
  })
  .select()
  .single()
if (running.error) die('insert running session:', running.error)

const finished = await supabase
  .from('sessions')
  .update({
    actual_sec: 600,
    status: 'done',
    note: 'verify-session-flow',
    energy: 7,
    ended_at: new Date().toISOString(),
  })
  .eq('id', running.data.id)
  .select()
  .single()
if (finished.error) die('finish session:', finished.error)
console.log('finished session blocks:', finished.data.blocks)

const group = await supabase
  .from('sessions')
  .insert({
    user_id: uid,
    mode: 'work',
    planned_sec: 1500,
    actual_sec: 750,
    started_at: new Date().toISOString(),
    status: 'running',
  })
  .select()
  .single()
if (group.error) die('insert parallel first half:', group.error)

const second = await supabase
  .from('sessions')
  .insert({
    user_id: uid,
    mode: 'work',
    planned_sec: 750,
    actual_sec: 750,
    started_at: new Date().toISOString(),
    ended_at: new Date().toISOString(),
    status: 'done',
    parallel_group: group.data.id,
  })
  .select()
  .single()
if (second.error) die('insert parallel second half:', second.error)

const firstDone = await supabase
  .from('sessions')
  .update({ actual_sec: 750, status: 'done', ended_at: new Date().toISOString() })
  .eq('id', group.data.id)
if (firstDone.error) die('finish parallel first half:', firstDone.error)

const pair = await supabase
  .from('sessions')
  .select('id')
  .or(`id.eq.${group.data.id},parallel_group.eq.${group.data.id}`)
if (pair.error) die('select parallel pair:', pair.error)
console.log('parallel rows in group:', pair.data.length)

const ids = [finished.data.id, group.data.id, second.data.id]
const cleanup = await supabase.from('sessions').delete().in('id', ids)
if (cleanup.error) die('delete test sessions:', cleanup.error)
console.log('test rows deleted:', ids.length)
