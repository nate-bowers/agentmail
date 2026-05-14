-- Drop existing check constraint (name may vary)
ALTER TABLE modules DROP CONSTRAINT IF EXISTS modules_module_type_check;

-- Re-add with all 22 supported module types
ALTER TABLE modules ADD CONSTRAINT modules_module_type_check
CHECK (module_type IN (
  'weather',
  'news',
  'quote',
  'markets',
  'sports',
  'word_of_day',
  'workout',
  'mindfulness',
  'on_this_day',
  'currency',
  'podcast',
  'fact',
  'recipe',
  'book',
  'reddit',
  'horoscope',
  'language',
  'affirmation',
  'ai_tech',
  'local_events',
  'week_history',
  'challenge'
));
