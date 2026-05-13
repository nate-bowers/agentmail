-- Add generation_tokens column to email_logs
ALTER TABLE email_logs
  ADD COLUMN IF NOT EXISTS generation_tokens INTEGER;
