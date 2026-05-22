-- Distributed rate limiting backed by Supabase.
--
-- The previous in-memory rateLimit() helper only worked within a single
-- Vercel function instance; on serverless this effectively meant no limit
-- across cold starts. This migration moves the counter into Postgres so
-- every check is global across instances.
--
-- The check is exposed as a SECURITY DEFINER function so server-side
-- routes can call it via supabase.rpc() without requiring RLS access to
-- the underlying table from the anon role. Only the service role / RPC
-- function ever touches the table.

create table if not exists rate_limits (
  key text primary key,
  count integer not null default 0,
  window_start timestamptz not null default now(),
  window_ms integer not null
);

create index if not exists rate_limits_window_start_idx
  on rate_limits (window_start);

-- Atomic check-and-increment. Each call:
--   1. Upserts the row for `p_key`.
--   2. If the existing row's window has expired (window_start + window_ms <
--      now), resets count to 1 and starts a new window.
--   3. Otherwise increments count by 1.
--   4. Returns whether the new count is within `p_max` along with the
--      reset timestamp (as epoch ms) and remaining quota.
--
-- The on-conflict path is a single statement, so concurrent callers from
-- different Vercel instances cannot both read "count=4" and decide they
-- are both allowed — the row update is atomic.
create or replace function check_rate_limit(
  p_key text,
  p_max int,
  p_window_ms int
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row rate_limits%rowtype;
  v_now timestamptz := now();
  v_window_end timestamptz;
begin
  insert into rate_limits (key, count, window_start, window_ms)
  values (p_key, 1, v_now, p_window_ms)
  on conflict (key) do update
    set count = case
                  when rate_limits.window_start + (rate_limits.window_ms || ' milliseconds')::interval < v_now
                  then 1
                  else rate_limits.count + 1
                end,
        window_start = case
                         when rate_limits.window_start + (rate_limits.window_ms || ' milliseconds')::interval < v_now
                         then v_now
                         else rate_limits.window_start
                       end,
        window_ms = p_window_ms
  returning * into v_row;

  v_window_end := v_row.window_start + (v_row.window_ms || ' milliseconds')::interval;

  return jsonb_build_object(
    'allowed', v_row.count <= p_max,
    'count', v_row.count,
    'remaining', greatest(0, p_max - v_row.count),
    'reset_at_ms', (extract(epoch from v_window_end) * 1000)::bigint
  );
end;
$$;

-- Grant execute to the service role only. The anon role never calls this
-- directly — every rateLimit() invocation runs on the server via the
-- admin Supabase client.
revoke all on function check_rate_limit(text, int, int) from public;
grant execute on function check_rate_limit(text, int, int) to service_role;

-- House-keeping helper: delete entries whose window expired more than 24h
-- ago. Called from the warm-cache cron once a day to keep the table small.
create or replace function purge_expired_rate_limits()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted int;
begin
  with deleted as (
    delete from rate_limits
    where window_start + (window_ms || ' milliseconds')::interval
        < now() - interval '24 hours'
    returning 1
  )
  select count(*)::int into v_deleted from deleted;
  return v_deleted;
end;
$$;

revoke all on function purge_expired_rate_limits() from public;
grant execute on function purge_expired_rate_limits() to service_role;

-- RLS: keep direct table access locked down. Nothing should ever read this
-- table except the SECURITY DEFINER functions above.
alter table rate_limits enable row level security;
