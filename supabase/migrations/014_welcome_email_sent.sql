-- Welcome email at signup.
-- Tracks whether the one-time welcome email has been sent to a profile so
-- the trigger is idempotent across the OAuth callback and the password
-- signup confirmation. A second invocation observes the true flag and
-- silently no-ops.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS welcome_email_sent boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN profiles.welcome_email_sent IS 'True once the post-signup welcome email has been delivered. Flag is set by /api/welcome-email after a successful Resend send. Single-fire.';
