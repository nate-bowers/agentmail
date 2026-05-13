-- Add email_theme column to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email_theme TEXT NOT NULL DEFAULT 'light';
