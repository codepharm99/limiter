/// <reference lib="deno.ns" />
import {
  applyRefund,
  applySuccessfulPayment,
  verifyInvoicePayload,
  webhookSecretValid,
  type PaymentRecord,
  type SubscriptionState,
} from '../_shared/billing.ts'

const env = (name: string): string => {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`missing env ${name}`)
  return value
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response(null, { status: 405 })
  try {
    const secret = env('TELEGRAM_WEBHOOK_SECRET')
    const botToken = env('TELEGRAM_BOT_TOKEN')
    const supabaseUrl = env('SUPABASE_URL')
    const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY')
    const payloadSecret = env('INVOICE_PAYLOAD_SECRET')

    // 1. Every request must carry the secret configured via setWebhook.
    if (!webhookSecretValid(req.headers.get('X-Telegram-Bot-Api-Secret-Token'), secret)) {
      return new Response(null, { status: 401 })
    }

    const update = await req.json()

    // 2. Checkout confirmation — approve, Telegram finishes the payment.
    if (update.pre_checkout_query) {
      await tg(botToken, 'answerPreCheckoutQuery', {
        pre_checkout_query_id: update.pre_checkout_query.id,
        ok: true,
      })
      return new Response(null, { status: 200 })
    }

    // 3. Refund (initiated by Telegram or via refundStarPayment).
    const refunded = update.message?.refunded_payment
    if (refunded) {
      const admin = adminClient(supabaseUrl, serviceKey)
      await handleRefund(admin, payloadSecret, refunded, update.message?.from?.id ?? null)
      return new Response(null, { status: 200 })
    }

    // 4. Successful payment — the only path that grants or extends Pro.
    const paid = update.message?.successful_payment
    if (paid) {
      const admin = adminClient(supabaseUrl, serviceKey)
      await handleSuccessfulPayment(
        admin,
        botToken,
        payloadSecret,
        paid,
        update.message?.chat?.id ?? null,
        update.message?.from?.id ?? null,
      )
      return new Response(null, { status: 200 })
    }

    return new Response(null, { status: 200 })
  } catch (err) {
    console.error('webhook error', err)
    // 5xx makes Telegram retry; transient DB hiccups self-heal. Idempotency
    // makes retries safe.
    return new Response(null, { status: 500 })
  }
})

interface AdminClient {
  select: (table: string, userId: string) => Promise<Record<string, unknown> | null>
  selectPayments: (userId: string) => Promise<Record<string, unknown>[]>
  upsertSubscription: (row: Record<string, unknown>) => Promise<void>
  insertPayment: (row: Record<string, unknown>) => Promise<Record<string, unknown>[]>
  markRefunded: (chargeId: string) => Promise<void>
}

function adminClient(url: string, serviceKey: string): AdminClient {
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'content-type': 'application/json',
  }
  const rest = (path: string, init?: RequestInit) =>
    fetch(`${url}/rest/v1/${path}`, { ...init, headers }).then((r) =>
      r.text().then((t) => ({ ok: r.ok, status: r.status, text: t })),
    )
  return {
    async select(table, userId) {
      const res = await rest(`${table}?select=*&user_id=eq.${userId}`)
      const rows = JSON.parse(res.text || '[]') as Record<string, unknown>[]
      return rows[0] ?? null
    },
    async selectPayments(userId) {
      const res = await rest(`payments?select=*&user_id=eq.${userId}&order=period_end.desc`)
      return JSON.parse(res.text || '[]') as Record<string, unknown>[]
    },
    async upsertSubscription(row) {
      const res = await rest('subscriptions', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify(row),
      })
      if (!res.ok) throw new Error(`subscription upsert failed: ${res.status} ${res.text}`)
    },
    async insertPayment(row) {
      const res = await rest('payments', {
        method: 'POST',
        headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
        body: JSON.stringify(row),
      })
      if (!res.ok) throw new Error(`payment insert failed: ${res.status} ${res.text}`)
      return JSON.parse(res.text || '[]') as Record<string, unknown>[]
    },
    async markRefunded(chargeId) {
      const res = await rest(`payments?charge_id=eq.${chargeId}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'refunded' }),
      })
      if (!res.ok) throw new Error(`payment refund failed: ${res.status} ${res.text}`)
    },
  }
}

async function tg(botToken: string, method: string, body: unknown) {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

function handleSuccessfulPayment(
  admin: AdminClient,
  botToken: string,
  payloadSecret: string,
  paid: { invoice_payload?: string; telegram_payment_charge_id?: string; total_amount?: number; currency?: string },
  chatId: number | null,
  telegramUserId: number | null,
) {
  return withPayment(admin, botToken, payloadSecret, paid, telegramUserId, async (userId) => {
    const now = new Date()
    const subRow = await admin.select('subscriptions', userId)
    const paymentRows = await admin.selectPayments(userId)
    const { subscription, duplicate } = applySuccessfulPayment(
      (subRow as unknown as SubscriptionState) ?? null,
      paymentRows as unknown as PaymentRecord[],
      {
        user_id: userId,
        charge_id: paid.telegram_payment_charge_id!,
        amount: paid.total_amount!,
        currency: paid.currency,
        telegram_user_id: telegramUserId,
      },
      now,
    )
    if (duplicate) return // Telegram re-delivery: nothing to grant
    await admin.insertPayment({
      user_id: userId,
      charge_id: paid.telegram_payment_charge_id,
      amount: paid.total_amount,
      currency: paid.currency ?? 'XTR',
      status: 'succeeded',
      period_start: subscription.current_period_start,
      period_end: subscription.current_period_end,
      telegram_user_id: telegramUserId,
    })
    await admin.upsertSubscription(subscription)
    return chatId
      ? tg(botToken, 'sendMessage', {
          chat_id: chatId,
          text: 'Limiter Pro активна — спасибо! 🚀',
        })
      : undefined
  })
}

function handleRefund(
  admin: AdminClient,
  payloadSecret: string,
  refunded: { invoice_payload?: string; telegram_payment_charge_id?: string },
  telegramUserId: number | null,
) {
  return withPayment(admin, null, payloadSecret, refunded, telegramUserId, async (userId) => {
    const now = new Date()
    const subRow = await admin.select('subscriptions', userId)
    const paymentRows = await admin.selectPayments(userId)
    if (!subRow) return
    const { subscription, refunded: changed } = applyRefund(
      subRow as unknown as SubscriptionState,
      paymentRows as unknown as PaymentRecord[],
      refunded.telegram_payment_charge_id!,
      now,
    )
    if (!changed) return
    await admin.markRefunded(refunded.telegram_payment_charge_id!)
    await admin.upsertSubscription(subscription)
  })
}

/**
 * Verify the signed invoice payload and only then touch subscription state:
 * a payment may grant Pro exclusively to the Supabase user it was issued for.
 */
async function withPayment(
  admin: AdminClient,
  botToken: string | null,
  payloadSecret: string,
  paid: { invoice_payload?: string; telegram_payment_charge_id?: string },
  telegramUserId: number | null,
  proceed: (userId: string) => Promise<unknown>,
): Promise<void> {
  const userId = await verifyInvoicePayload(paid.invoice_payload, payloadSecret)
  if (!userId || !paid.telegram_payment_charge_id) {
    console.error('rejected payment with unverifiable payload', paid.invoice_payload)
    if (botToken && telegramUserId) {
      await tg(botToken, 'sendMessage', {
        chat_id: telegramUserId,
        text: 'Платёж не удалось привязать к аккаунту Limiter. Напиши в поддержку.',
      })
    }
    return
  }
  await proceed(userId)
}
