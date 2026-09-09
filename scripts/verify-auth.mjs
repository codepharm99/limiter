// Headless check: anonymous sign-in creates a profile row and the system direction.
// Run: node --env-file=.env.local scripts/verify-auth.mjs
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

const { data: auth, error: authError } = await supabase.auth.signInAnonymously()
if (authError || !auth.user) {
  console.error('anonymous sign-in failed:', authError?.message)
  process.exit(1)
}
console.log('signed in anonymously: yes')

const { data: profiles, error: pe } = await supabase.from('profiles').select('id')
const { data: directions, error: de } = await supabase.from('directions').select('id,name,is_system')
if (pe || de) {
  console.error('select failed:', pe?.message ?? de?.message)
  process.exit(1)
}
console.log('profiles rows:', profiles.length)
console.log('directions rows:', directions.length)
console.log('system direction "другое":', directions.filter((d) => d.is_system && d.name === 'другое').length)
