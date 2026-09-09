import { supabase } from './supabase'

/**
 * Ask the server for a Telegram Stars checkout. The browser only ever sees
 * the invoice URL — no bot token, no secrets, and the Supabase user id is
 * bound server-side.
 */
export async function startProCheckout(): Promise<{ url?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke('create-checkout', { body: {} })
  if (error) return { error: error.message }
  const url = (data as { url?: string } | null)?.url
  return url ? { url } : { error: 'no invoice url' }
}
