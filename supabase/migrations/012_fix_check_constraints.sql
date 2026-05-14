-- Fix subscription_status constraint
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_subscription_status_check
CHECK (subscription_status IN (
  'free',
  'pro',
  'unlimited',
  'active',
  'canceled',
  'past_due'
));

-- Fix module_type constraint
ALTER TABLE modules
DROP CONSTRAINT IF EXISTS modules_module_type_check;

ALTER TABLE modules
ADD CONSTRAINT modules_module_type_check
CHECK (module_type IN (
  'weather', 'news', 'quote', 'markets', 'sports',
  'word_of_day', 'workout', 'mindfulness', 'on_this_day',
  'currency', 'podcast', 'fact', 'recipe', 'book',
  'reddit', 'horoscope', 'language', 'affirmation',
  'ai_tech', 'local_events', 'week_history', 'challenge'
));
