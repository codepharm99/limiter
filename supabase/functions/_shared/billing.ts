/**
 * Platform-agnostic billing core for Telegram Stars Pro.
 *
 * Every function here is pure (or takes its crypto as a parameter) so the same
 * module runs inside Deno edge functions and under vitest. I/O — Supabase
 * queries, Telegram calls, env reads — stays in the edge functions; only
 * decisions live here.
 */

export const PERIOD_SECONDS = 2_592_000 // 30 days, Telegram Stars subscription period

export type SubStatus = 'none' | 'active' | 'canceled' | 'expired'

export interface SubscriptionState {
  user_id: string
  status: SubStatus
  provider: string
  telegram_user_id: number | null
  telegram_payment_charge_id: string | null
  current_period_start: string | null
  current_period_end: string | null
  updated_at: string
}

export interface PaymentRecord {
  user_id: string
  charge_id: string
  amount: number
  currency: string
  status: 'succeeded' | 'refunded'
  period_start: string
  period_end: string
  telegram_user_id: number | null
}

export interface ChargeInput {
  user_id: string
  charge_id: string
  amount: number
  currency?: string
  telegram_user_id: number | null
}

// ---------------------------------------------------------------------------
// Webhook authentication
// ---------------------------------------------------------------------------

/** Constant-time check of the X-Telegram-Bot-Api-Secret-Token header value. */
export function webhookSecretValid(
  received: string | null | undefined,
  expected: string,
): boolean {
  if (!received || !expected) return false
  const enc = new TextEncoder()
  const a = enc.encode(received)
  const b = enc.encode(expected)
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!
  return diff === 0
}

// ---------------------------------------------------------------------------
// Invoice payload: binds a Telegram payment to a Supabase user id without
// trusting anything the browser sends. `${userId}.${issuedAtMs}.${sig}` where
// sig is the truncated HMAC-SHA256 of `${userId}.${issuedAtMs}`.
// ---------------------------------------------------------------------------

export type Subtle = { importKey: unknown; sign: unknown }

function subtleOf(subtle?: Subtle): { importKey: (...a: unknown[]) => Promise<CryptoKey>; sign: (...a: unknown[]) => Promise<ArrayBuffer> } {
  const s = subtle ?? globalThis.crypto?.subtle
  if (!s) throw new Error('WebCrypto unavailable')
  return s as never
}

async function hmacHex(key: string, message: string, subtle?: Subtle): Promise<string> {
  const s = subtleOf(subtle)
  const enc = new TextEncoder()
  const k = (await s.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])) as CryptoKey
  const mac = new Uint8Array(await s.sign('HMAC', k, enc.encode(message)))
  let hex = ''
  for (const byte of mac) hex += byte.toString(16).padStart(2, '0')
  return hex
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function signInvoicePayload(
  userId: string,
  secret: string,
  issuedAtMs = Date.now(),
  subtle?: Subtle,
): Promise<string> {
  const body = `${userId}.${issuedAtMs}`
  const sig = (await hmacHex(secret, body, subtle)).slice(0, 32)
  return `${body}.${sig}`
}

/** Returns the bound Supabase user id, or null when anything fails to verify. */
export async function verifyInvoicePayload(
  payload: string | null | undefined,
  secret: string,
  nowMs = Date.now(),
  maxAgeMs = 30 * 86_400_000,
  subtle?: Subtle,
): Promise<string | null> {
  if (!payload) return null
  const parts = payload.split('.')
  if (parts.length !== 3) return null
  const [userId, issuedAt, sig] = parts
  if (!UUID_RE.test(userId!) || !/^\d+$/.test(issuedAt!)) return null
  const issued = Number(issuedAt)
  if (!Number.isFinite(issued) || nowMs - issued > maxAgeMs || issued - nowMs > 60_000) return null
  const expected = (await hmacHex(secret, `${userId}.${issued}`, subtle)).slice(0, 32)
  if (!webhookSecretValid(sig, expected)) return null
  return userId!
}

// ---------------------------------------------------------------------------
// Subscription state transitions
// ---------------------------------------------------------------------------

/** Pro is granted by the paid period, not by any client-writable flag. */
export function isProActive(sub: SubscriptionState | null | undefined, now: Date): boolean {
  if (!sub) return false
  if (sub.status !== 'active' && sub.status !== 'canceled') return false
  if (!sub.current_period_end) return false
  return new Date(sub.current_period_end).getTime() > now.getTime()
}

export function plusPeriod(from: Date): Date {
  return new Date(from.getTime() + PERIOD_SECONDS * 1000)
}

/**
 * Record a successful Stars charge and extend the paid period. Duplicate
 * deliveries (same charge id) are no-ops, so Telegram retries can never
 * extend access twice.
 */
export function applySuccessfulPayment(
  sub: SubscriptionState | null,
  payments: PaymentRecord[],
  charge: ChargeInput,
  now: Date,
): { subscription: SubscriptionState; payment: PaymentRecord; duplicate: boolean } {
  if (payments.some((p) => p.charge_id === charge.charge_id)) {
    return {
      subscription: sub ?? emptySubscription(charge.user_id, now),
      payment: payments.find((p) => p.charge_id === charge.charge_id)!,
      duplicate: true,
    }
  }
  // A renewal stacks on the remaining paid time; a first (or lapsed) payment
  // starts from now.
  const base =
    sub?.current_period_end && new Date(sub.current_period_end).getTime() > now.getTime()
      ? new Date(sub.current_period_end)
      : now
  const end = plusPeriod(base)
  const payment: PaymentRecord = {
    user_id: charge.user_id,
    charge_id: charge.charge_id,
    amount: charge.amount,
    currency: charge.currency ?? 'XTR',
    status: 'succeeded',
    period_start: base.toISOString(),
    period_end: end.toISOString(),
    telegram_user_id: charge.telegram_user_id,
  }
  const subscription: SubscriptionState = {
    user_id: charge.user_id,
    provider: 'telegram_stars',
    status: 'active',
    telegram_user_id: charge.telegram_user_id,
    telegram_payment_charge_id: charge.charge_id,
    current_period_start: payment.period_start,
    current_period_end: payment.period_end,
    updated_at: now.toISOString(),
  }
  return { subscription, payment: payment, duplicate: false }
}

/**
 * Apply a refund: the refunded charge loses its extension. Access continues
 * only through time covered by the remaining (non-refunded) payments; when
 * nothing survives, access ends at the start of the refunded period.
 */
export function applyRefund(
  sub: SubscriptionState,
  payments: PaymentRecord[],
  chargeId: string,
  now: Date,
): { subscription: SubscriptionState; payments: PaymentRecord[]; refunded: boolean } {
  const refunded = payments.find((p) => p.charge_id === chargeId && p.status === 'succeeded')
  if (!refunded) return { subscription: sub, payments, refunded: false }

  const remaining = payments.map((p) =>
    p.charge_id === chargeId ? { ...p, status: 'refunded' as const } : p,
  )
  const survivor = remaining
    .filter((p) => p.status === 'succeeded')
    .sort((a, b) => new Date(b.period_end).getTime() - new Date(a.period_end).getTime())[0]

  const newEnd = survivor ? new Date(survivor.period_end) : new Date(refunded.period_start)
  const stillActive = newEnd.getTime() > now.getTime()
  const subscription: SubscriptionState = {
    ...sub,
    status: stillActive ? (sub.status === 'canceled' ? 'canceled' : 'active') : 'expired',
    telegram_payment_charge_id: survivor?.charge_id ?? null,
    current_period_start: refunded.period_start,
    current_period_end: newEnd.toISOString(),
    updated_at: now.toISOString(),
  }
  return { subscription, payments: remaining, refunded: true }
}

export function emptySubscription(userId: string, now: Date): SubscriptionState {
  return {
    user_id: userId,
    provider: 'telegram_stars',
    status: 'none',
    telegram_user_id: null,
    telegram_payment_charge_id: null,
    current_period_start: null,
    current_period_end: null,
    updated_at: now.toISOString(),
  }
}
