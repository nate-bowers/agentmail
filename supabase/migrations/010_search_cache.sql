CREATE TABLE IF NOT EXISTS search_cache (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key  text NOT NULL UNIQUE,
  data       jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS search_cache_expires_at_idx ON search_cache(expires_at);
