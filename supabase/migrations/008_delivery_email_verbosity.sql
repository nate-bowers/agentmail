-- delivery_email: optional alternate send address (null = use auth email)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS delivery_email text;

-- email_verbosity: controls Claude output length, independent of theme/appearance
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verbosity text NOT NULL DEFAULT 'medium';
