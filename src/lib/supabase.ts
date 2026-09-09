import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { demoClient } from './demoClient'

// Dev-only demo data: set localStorage 'lim.demo' to '0' to hit the real backend.
export const isDemoMode = import.meta.env.DEV && localStorage.getItem('lim.demo') !== '0'

export const supabase: SupabaseClient = isDemoMode
  ? (demoClient() as unknown as SupabaseClient)
  : createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
