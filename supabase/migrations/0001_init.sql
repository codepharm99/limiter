create extension if not exists pgcrypto;

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  locale text not null default 'ru',
  is_pro boolean not null default false,
  week_cap_blocks int not null default 30,
  work_min int not null default 25,
  short_break_min int not null default 5,
  long_break_min int not null default 15,
  created_at timestamptz not null default now()
);

create table directions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#718F78',
  icon text not null default 'box',
  budget_blocks numeric(6,2) not null default 0,
  cadence text not null default 'weekly',
  active_days int[] not null default '{1,2,3,4,5,6,7}',
  is_system boolean not null default false,
  sort_order int not null default 0,
  archived_at timestamptz
);
create unique index directions_one_system_per_user on directions(user_id) where is_system;

create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  direction_id uuid not null references directions(id) on delete cascade,
  title text not null,
  budget_blocks numeric(6,2) not null default 1,
  done_at timestamptz,
  sort_order int not null default 0,
  archived_at timestamptz
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  direction_id uuid references directions(id) on delete set null,
  task_id uuid references tasks(id) on delete set null,
  mode text not null check (mode in ('work','short','long')),
  planned_sec int not null,
  actual_sec int not null default 0,
  blocks numeric(6,2) generated always as (round(actual_sec / 1500.0, 2)) stored,
  note text,
  energy int check (energy between 1 and 10),
  parallel_group uuid,
  started_at timestamptz not null,
  ended_at timestamptz,
  status text not null default 'running' check (status in ('running','done','skipped','aborted')),
  manual boolean not null default false
);
create index sessions_user_started on sessions(user_id, started_at);

create table day_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  direction_id uuid not null references directions(id) on delete cascade,
  task_id uuid references tasks(id) on delete set null,
  date date not null,
  planned_blocks numeric(6,2) not null default 1,
  unique (user_id, direction_id, task_id, date)
);

create table tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  url text not null,
  sort_order int not null default 0
);

-- profile + system direction on signup
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles(id) values (new.id);
  insert into directions(user_id, name, color, icon, is_system, sort_order) values (new.id, 'другое', '#879C9A', 'box', true, 1000);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- protect system direction
create or replace function guard_system_direction() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' and old.is_system then raise exception 'system direction cannot be deleted'; end if;
  if tg_op = 'UPDATE' and old.is_system and (new.is_system = false or new.budget_blocks <> 0 or new.archived_at is not null) then
    raise exception 'system direction cannot be budgeted, archived or demoted';
  end if;
  return coalesce(new, old);
end $$;
create trigger directions_guard before update or delete on directions for each row execute function guard_system_direction();

-- RLS
alter table profiles enable row level security;
alter table directions enable row level security;
alter table tasks enable row level security;
alter table sessions enable row level security;
alter table day_plans enable row level security;
alter table tracks enable row level security;

create policy "own profile" on profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "own directions" on directions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own tasks" on tasks for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own sessions" on sessions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own day_plans" on day_plans for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own tracks" on tracks for all using (user_id = auth.uid()) with check (user_id = auth.uid());
