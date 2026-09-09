#!/usr/bin/env node
/**
 * Registers the Telegram webhook for the Pro billing flow.
 *
 * Usage (server-side only — the bot token never goes near the browser):
 *   TELEGRAM_BOT_TOKEN=123:abc \
 *   WEBHOOK_URL=https://<project>.supabase.co/functions/v1/telegram-webhook \
 *   TELEGRAM_WEBHOOK_SECRET=$(openssl rand -hex 32) \
 *   node scripts/set-telegram-webhook.mjs
 *
 * The same TELEGRAM_WEBHOOK_SECRET must be set as a Supabase function secret
 * (supabase secrets set TELEGRAM_WEBHOOK_SECRET=...) so the webhook can
 * verify X-Telegram-Bot-Api-Secret-Token.
 */
const token = process.env.TELEGRAM_BOT_TOKEN
const url = process.env.WEBHOOK_URL
const secret = process.env.TELEGRAM_WEBHOOK_SECRET

if (!token || !url || !secret) {
  console.error('TELEGRAM_BOT_TOKEN, WEBHOOK_URL and TELEGRAM_WEBHOOK_SECRET are required')
  process.exit(1)
}

const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    url,
    secret_token: secret,
    allowed_updates: ['message', 'pre_checkout_query'],
    drop_pending_updates: false,
  }),
})
const body = await res.json()
if (!body.ok) {
  console.error('setWebhook failed:', body)
  process.exit(1)
}
console.log('Webhook registered:', url)
