-- Spam-prevention onboarding step tracking.
-- Records whether the user has triggered the welcome test email and whether
-- they have acknowledged the "move to primary inbox" instructions.
-- Hourly rate-limiting counters are stored on the same row for simplicity.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_test_email_sent         boolean   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_test_email_acknowledged boolean   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_test_sends_count        integer   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_test_sends_hour         timestamptz;

COMMENT ON COLUMN profiles.onboarding_test_email_sent         IS 'True once the user has triggered at least one welcome test email during onboarding';
COMMENT ON COLUMN profiles.onboarding_test_email_acknowledged IS 'True once the user has confirmed they moved the welcome test email to their primary inbox';
COMMENT ON COLUMN profiles.onboarding_test_sends_count        IS 'Welcome test emails sent in the current hourly window';
COMMENT ON COLUMN profiles.onboarding_test_sends_hour         IS 'Start of the hourly window that onboarding_test_sends_count is counting against';
