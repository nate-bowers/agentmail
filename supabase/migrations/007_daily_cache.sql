-- Daily cache for pre-fetched module data.
-- Entries are keyed by (cache_key, cache_date) and auto-expire after 2 days
-- via a cleanup cron, so the table stays small indefinitely.

CREATE TABLE IF NOT EXISTS daily_cache (
  cache_key  text        NOT NULL,
  cache_date date        NOT NULL DEFAULT CURRENT_DATE,
  data       jsonb       NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cache_key, cache_date)
);

CREATE INDEX IF NOT EXISTS daily_cache_date_idx ON daily_cache (cache_date);

-- Service role has full access; no user-facing RLS needed.
