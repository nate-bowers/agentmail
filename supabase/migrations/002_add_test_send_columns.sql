-- Add test send rate-limiting columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS test_sends_today   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS test_sends_date    date;

COMMENT ON COLUMN profiles.test_sends_today IS 'Number of test sends issued on test_sends_date (reset to 0 each new day)';
COMMENT ON COLUMN profiles.test_sends_date  IS 'The calendar date (UTC) when test_sends_today was last incremented';
