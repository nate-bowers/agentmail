ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_onboarded boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_step integer NOT NULL DEFAULT 0;
