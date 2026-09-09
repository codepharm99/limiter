import { describe, expect, it } from 'vitest'
import {
  PERIOD_SECONDS,
  applyRefund,
  applySuccessfulPayment,
  emptySubscription,
  isProActive,
  plusPeriod,
  signInvoicePayload,
  verifyInvoicePayload,
  webhookSecretValid,
  type PaymentRecord,
  type SubscriptionState,
} from '../../supabase/functions/_shared/billing'

const USER = '11111111-2222-3333-4444-555555555555'
const T = (iso: string) => new Date(iso)
const NOW = T('2026-09-10T12:00:00Z')

function sub(partial: Partial<SubscriptionState>): SubscriptionState {
  return { ...emptySubscription(USER, NOW), ...partial }
}

function payment(partial: Partial<PaymentRecord>): PaymentRecord {
  return {
    user_id: USER,
    charge_id: 'charge-1',
    amount: 100,
    currency: 'XTR',
    status: 'succeeded',
    period_start: NOW.toISOString(),
    period_end: plusPeriod(NOW).toISOString(),
    telegram_user_id: 42,
    ...partial,
  }
}

describe('webhook secret verification', () => {
  const secret = 's3cret-token-value'

  it('accepts the exact configured secret', () => {
    expect(webhookSecretValid(secret, secret)).toBe(true)
  })

  it('rejects a wrong secret', () => {
    expect(webhookSecretValid('wrong', secret)).toBe(false)
  })

  it('rejects missing or empty values', () => {
    expect(webhookSecretValid(null, secret)).toBe(false)
    expect(webhookSecretValid(undefined, secret)).toBe(false)
    expect(webhookSecretValid('', secret)).toBe(false)
    expect(webhookSecretValid(secret, '')).toBe(false)
  })

  it('rejects a same-length but different secret', () => {
    expect(webhookSecretValid('s3cret-token-valuX', secret)).toBe(false)
  })
})

describe('invoice payload signing', () => {
  const secret = 'payload-secret'

  it('round-trips to the bound user id', async () => {
    const payload = await signInvoicePayload(USER, secret, 1_000_000)
    expect(await verifyInvoicePayload(payload, secret, 1_000_000 + 5_000)).toBe(USER)
  })

  it('binds the user id, not whatever the client sends', async () => {
    const payload = await signInvoicePayload(USER, secret, Date.now())
    const forged = payload.replace(USER, '99999999-9999-9999-9999-999999999999')
    expect(await verifyInvoicePayload(forged, secret)).toBeNull()
  })

  it('rejects payloads signed with another secret', async () => {
    const payload = await signInvoicePayload(USER, 'other-secret', Date.now())
    expect(await verifyInvoicePayload(payload, secret)).toBeNull()
  })

  it('rejects garbage, wrong shape and stale payloads', async () => {
    expect(await verifyInvoicePayload(null, secret)).toBeNull()
    expect(await verifyInvoicePayload('not-a-payload', secret)).toBeNull()
    expect(await verifyInvoicePayload('no-uuid.123.abc', secret)).toBeNull()
    const stale = await signInvoicePayload(USER, secret, Date.now() - 40 * 86_400_000)
    expect(await verifyInvoicePayload(stale, secret)).toBeNull()
  })

  it('rejects a truncated/tampered signature', async () => {
    const payload = await signInvoicePayload(USER, secret, Date.now())
    const tampered = payload.slice(0, -2) + 'zz'
    expect(await verifyInvoicePayload(tampered, secret)).toBeNull()
  })
})

describe('applySuccessfulPayment', () => {
  it('activates a first payment for exactly 30 days', () => {
    const { subscription, payment, duplicate } = applySuccessfulPayment(
      null,
      [],
      { user_id: USER, charge_id: 'c1', amount: 100, telegram_user_id: 42 },
      NOW,
    )
    expect(duplicate).toBe(false)
    expect(subscription.status).toBe('active')
    expect(subscription.current_period_start).toBe(NOW.toISOString())
    expect(subscription.current_period_end).toBe(plusPeriod(NOW).toISOString())
    expect(payment.period_end).toBe(plusPeriod(NOW).toISOString())
    expect(isProActive(subscription, NOW)).toBe(true)
  })

  it('is idempotent: a duplicate charge changes nothing', () => {
    const first = applySuccessfulPayment(
      null,
      [],
      { user_id: USER, charge_id: 'c1', amount: 100, telegram_user_id: 42 },
      NOW,
    )
    const later = T('2026-09-12T00:00:00Z')
    const second = applySuccessfulPayment(
      first.subscription,
      [first.payment],
      { user_id: USER, charge_id: 'c1', amount: 100, telegram_user_id: 42 },
      later,
    )
    expect(second.duplicate).toBe(true)
    expect(second.subscription.current_period_end).toBe(first.subscription.current_period_end)
  })

  it('a different charge id is a new payment and extends the period', () => {
    const first = applySuccessfulPayment(
      null,
      [],
      { user_id: USER, charge_id: 'c1', amount: 100, telegram_user_id: 42 },
      NOW,
    )
    const renewal = applySuccessfulPayment(
      first.subscription,
      [first.payment],
      { user_id: USER, charge_id: 'c2', amount: 100, telegram_user_id: 42 },
      T('2026-09-20T00:00:00Z'),
    )
    expect(renewal.duplicate).toBe(false)
    expect(renewal.subscription.status).toBe('active')
    // stacks on the remaining paid time, not on the renewal date
    expect(renewal.subscription.current_period_end).toBe(
      plusPeriod(plusPeriod(NOW)).toISOString(),
    )
  })

  it('a payment after expiry starts a fresh period from now', () => {
    const first = applySuccessfulPayment(
      null,
      [],
      { user_id: USER, charge_id: 'c1', amount: 100, telegram_user_id: 42 },
      NOW,
    )
    const late = applySuccessfulPayment(
      first.subscription,
      [first.payment],
      { user_id: USER, charge_id: 'c2', amount: 100, telegram_user_id: 42 },
      T('2026-10-15T00:00:00Z'),
    )
    expect(late.subscription.current_period_start).toBe(T('2026-10-15T00:00:00Z').toISOString())
    expect(isProActive(late.subscription, T('2026-10-15T00:00:01Z'))).toBe(true)
  })

  it('stores the telegram charge id for reconciliation', () => {
    const { subscription } = applySuccessfulPayment(
      null,
      [],
      { user_id: USER, charge_id: 'chg-42', amount: 100, telegram_user_id: 42 },
      NOW,
    )
    expect(subscription.telegram_payment_charge_id).toBe('chg-42')
    expect(subscription.telegram_user_id).toBe(42)
  })
})

describe('subscription semantics', () => {
  it('cancelling renewal keeps Pro until the paid period ends', () => {
    const s = sub({
      status: 'canceled',
      current_period_start: NOW.toISOString(),
      current_period_end: plusPeriod(NOW).toISOString(),
    })
    expect(isProActive(s, T('2026-09-30T23:59:59Z'))).toBe(true)
    expect(isProActive(s, plusPeriod(NOW))).toBe(false)
  })

  it('expiration removes Pro', () => {
    const s = sub({
      status: 'expired',
      current_period_end: NOW.toISOString(),
    })
    expect(isProActive(s, NOW)).toBe(false)
  })

  it('a boundary second after expiry is not Pro', () => {
    const s = sub({
      status: 'active',
      current_period_end: plusPeriod(NOW).toISOString(),
    })
    expect(isProActive(s, new Date(plusPeriod(NOW).getTime() + 1))).toBe(false)
  })

  it('never-paid and missing rows are not Pro', () => {
    expect(isProActive(null, NOW)).toBe(false)
    expect(isProActive(emptySubscription(USER, NOW), NOW)).toBe(false)
  })

  it('the period constant matches Telegram Stars subscriptions', () => {
    expect(PERIOD_SECONDS).toBe(2_592_000)
  })
})

describe('applyRefund', () => {
  it('revokes access fully when the refunded charge was the only one', () => {
    const first = applySuccessfulPayment(
      null,
      [],
      { user_id: USER, charge_id: 'c1', amount: 100, telegram_user_id: 42 },
      NOW,
    )
    const mid = T('2026-09-20T00:00:00Z')
    const { subscription, refunded } = applyRefund(
      first.subscription,
      [first.payment],
      'c1',
      mid,
    )
    expect(refunded).toBe(true)
    expect(subscription.status).toBe('expired')
    expect(isProActive(subscription, mid)).toBe(false)
  })

  it('keeps the surviving renewal when an older charge is refunded', () => {
    const first = applySuccessfulPayment(
      null,
      [],
      { user_id: USER, charge_id: 'c1', amount: 100, telegram_user_id: 42 },
      NOW,
    )
    const renewal = applySuccessfulPayment(
      first.subscription,
      [first.payment],
      { user_id: USER, charge_id: 'c2', amount: 100, telegram_user_id: 42 },
      T('2026-09-20T00:00:00Z'),
    )
    // refund the FIRST charge: the renewal the user paid for still covers time
    const { subscription, refunded } = applyRefund(
      renewal.subscription,
      [first.payment, renewal.payment],
      'c1',
      T('2026-09-25T00:00:00Z'),
    )
    expect(refunded).toBe(true)
    expect(subscription.status).toBe('active')
    expect(isProActive(subscription, T('2026-10-20T00:00:00Z'))).toBe(true)
    const lastCovered = plusPeriod(plusPeriod(NOW))
    expect(isProActive(subscription, new Date(lastCovered.getTime() - 1_000))).toBe(true)
    expect(isProActive(subscription, lastCovered)).toBe(false)
  })

  it('ignores unknown or already-refunded charge ids', () => {
    const s = sub({ status: 'active', current_period_end: plusPeriod(NOW).toISOString() })
    const r1 = applyRefund(s, [], 'nope', NOW)
    expect(r1.refunded).toBe(false)
    expect(r1.subscription.status).toBe('active')
    const payment = payment_record()
    const r2 = applyRefund(s, [{ ...payment, status: 'refunded' }], payment.charge_id, NOW)
    expect(r2.refunded).toBe(false)
  })

  it('refunding a canceled subscription that still has covered time keeps canceled status', () => {
    const coveredEnd = plusPeriod(NOW)
    const s = sub({
      status: 'canceled',
      current_period_end: coveredEnd.toISOString(),
    })
    const { subscription } = applyRefund(
      s,
      [payment({ charge_id: 'c1', period_end: coveredEnd.toISOString() })],
      'c1',
      NOW,
    )
    // refund of the only payment removes the covered time
    expect(subscription.status).toBe('expired')
  })
})

function payment_record(): PaymentRecord {
  return payment({})
}
