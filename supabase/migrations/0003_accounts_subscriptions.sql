-- Stage 2: durable accounts + Telegram Stars Pro.
-- Subscription state lives server-side; the browser can only read its own row
-- and can never grant itself Pro.

-- 1. Lock profiles.is_pro away from browser writes. Supabase grants every
-- column to `authenticated` by default, so the table-level UPDATE grant is
-- replaced with one covering only user-editable profile columns. RLS policies
-- from 0001 keep rows isolated; this narrows which columns a row update may
-- touch.
revoke update on table profiles from authenticated;
grant update (locale, week_cap_blocks, work_min, short_break_min, long_break_min)
  on table profiles to authenticated;

-- 2. Server-controlled subscription model.
create table subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null default 'telegram_stars',
  -- none: never paid · active: paid period in force · canceled: renewal
  -- stopped in Telegram, paid period still in force · expired: nothing paid
  status text not null default 'none'
    check (status in ('none', 'active', 'canceled', 'expired')),
  telegram_user_id bigint,
  telegram_payment_charge_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Every Stars charge, recorded at most once: the unique charge id is the
-- idempotency key for repeated Telegram webhook deliveries. Server-only.
create table payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'telegram_stars',
  charge_id text not null unique,
  amount int not null,
  currency text not null default 'XTR',
  status text not null default 'succeeded' check (status in ('succeeded', 'refunded')),
  period_start timestamptz not null,
  period_end timestamptz not null,
  telegram_user_id bigint,
  created_at timestamptz not null default now()
);

alter table subscriptions enable row level security;
alter table payments enable row level security;

-- Users may read their own subscription state; no write privileges at all.
create policy "read own subscription" on subscriptions
  for select using (user_id = auth.uid());
revoke all on subscriptions from anon, authenticated;
grant select on subscriptions to authenticated;

-- payments are never readable or writable from a browser.
revoke all on payments from anon, authenticated;

-- 3. Derive profiles.is_pro from trusted subscription state instead of ever
-- trusting a client-supplied flag. Runs as the owner on every subscriptions
-- change; the browser has no way in.
create or replace function sync_profile_pro() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := coalesce(new.user_id, old.user_id);
  active boolean;
begin
  select exists (
    select 1 from subscriptions s
    where s.user_id = uid
      and s.status in ('active', 'canceled')
      and s.current_period_end > now()
  )
  into active;

  update profiles set is_pro = coalesce(active, false) where id = uid;
  return coalesce(new, old);
end $$;

create trigger subscriptions_sync_pro
  after insert or update or delete on subscriptions
  for each row execute function sync_profile_pro();
