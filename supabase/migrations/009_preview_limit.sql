ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preview_generations_today integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preview_generations_date  date;
