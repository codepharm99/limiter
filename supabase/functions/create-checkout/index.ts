/// <reference lib="deno.ns" />
import { signInvoicePayload, PERIOD_SECONDS } from '../_shared/billing.ts'

// Supabase CLI injects SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.
const env = (name: string): string => {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`missing env ${name}`)
  return value
}

const CORS = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  try {
    const url = env('SUPABASE_URL')
    const anonKey = env('SUPABASE_ANON_KEY')
    const botToken = env('TELEGRAM_BOT_TOKEN')
    const payloadSecret = env('INVOICE_PAYLOAD_SECRET')

    // 1. Who is asking? The browser sends only its own JWT; the server maps it
    //    to a user id — the client never supplies one.
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401)
    const { data: authData, error: authErr } = await supabaseFetch(
      `${url}/auth/v1/user`,
      { Authorization: authHeader, apikey: anonKey },
    )
    if (authErr || !authData?.id) return json({ error: 'unauthorized' }, 401)
    const userId: string = authData.id

    // 2. Server-side Stars price — configurable without touching the client.
    const starsPrice = Number(Deno.env.get('PRO_STARS_PRICE') ?? 100)

    // 3. Create the recurring Stars invoice bound to this user.
    const payload = await signInvoicePayload(userId, payloadSecret)
    const title = 'Limiter Pro'
    const description = 'Unlimited journal history, monthly subscription'
    const invoice: Record<string, unknown> = {
      title,
      description,
      payload,
      currency: 'XTR',
      subscription_period: PERIOD_SECONDS,
      prices: [{ label: 'Limiter Pro · 30 days', amount: starsPrice }],
    }

    const res = await fetch(`https://api.telegram.org/bot${botToken}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(invoice),
    })
    const tg = await res.json()
    if (!tg?.ok || !tg.result) {
      console.error('createInvoiceLink failed', tg)
      return json({ error: 'invoice failed' }, 502)
    }

    return json({ url: tg.result }, 200)
  } catch (err) {
    console.error('create-checkout error', err)
    const message = err instanceof Error && err.message.startsWith('missing env')
      ? 'server misconfigured'
      : 'internal error'
    return json({ error: message }, 500)
  }
})

async function supabaseFetch(url: string, headers: Record<string, string>) {
  const res = await fetch(url, { headers })
  const body = await res.json().catch(() => null)
  return { data: body, error: !res.ok ? body : null }
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS },
  })
}
