-- ============================================================
-- 001_initial_schema.sql
-- Initial schema for AgentMail daily email brief SaaS
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- TABLES
-- ────────────────────────────────────────────────────────────

create table public.profiles (
  id                  uuid        primary key references auth.users on delete cascade,
  email               text        not null,
  full_name           text,
  timezone            text        not null default 'America/New_York',
  send_time           time        not null default '07:00',
  is_active           boolean     not null default true,
  stripe_customer_id  text,
  subscription_status text        not null default 'free'
                                  check (subscription_status in ('free', 'active', 'canceled', 'past_due')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table public.modules (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references public.profiles on delete cascade,
  module_type    text        not null
                             check (module_type in ('weather', 'news', 'quote', 'markets', 'calendar', 'sports')),
  config         jsonb       not null default '{}',
  display_order  integer     not null default 0,
  is_enabled     boolean     not null default true,
  created_at     timestamptz not null default now()
);

create table public.email_logs (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references public.profiles on delete cascade,
  sent_at          timestamptz not null default now(),
  status           text        not null check (status in ('success', 'failed')),
  error_message    text,
  modules_included jsonb
);

-- ────────────────────────────────────────────────────────────
-- INDEXES
-- ────────────────────────────────────────────────────────────

create index modules_user_id_idx      on public.modules (user_id);
create index email_logs_user_id_idx   on public.email_logs (user_id);
create index email_logs_sent_at_idx   on public.email_logs (sent_at desc);

-- ────────────────────────────────────────────────────────────
-- UPDATED_AT TRIGGER
-- ────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ────────────────────────────────────────────────────────────
-- AUTO-CREATE PROFILE ON SIGNUP
-- ────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

alter table public.profiles   enable row level security;
alter table public.modules    enable row level security;
alter table public.email_logs enable row level security;

-- profiles: users manage only their own row
create policy "profiles: select own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: insert own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- modules: users manage only their own rows
create policy "modules: select own"
  on public.modules for select
  using (auth.uid() = user_id);

create policy "modules: insert own"
  on public.modules for insert
  with check (auth.uid() = user_id);

create policy "modules: update own"
  on public.modules for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "modules: delete own"
  on public.modules for delete
  using (auth.uid() = user_id);

-- email_logs: users can read their own logs; writes are service-role only
create policy "email_logs: select own"
  on public.email_logs for select
  using (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policy for authenticated role.
-- The service role bypasses RLS, so the admin client can write freely.
