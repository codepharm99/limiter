import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { demoClient } from './demoClient'

// Dev-only demo data: set localStorage 'lim.demo' to '0' to hit the real backend.
export const isDemoMode = import.meta.env.DEV && localStorage.getItem('lim.demo') !== '0'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Missing env must not throw at module scope — that blanks the whole app.
// App renders a setup notice when this is false.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase: SupabaseClient = isDemoMode
  ? (demoClient() as unknown as SupabaseClient)
  : createClient(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseAnonKey || 'placeholder-anon-key',
    )
