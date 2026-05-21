// Curated preset lists used by the module configuration forms.
//
// Goal: give users a "ton of stuff to pick from" so they don't have to type
// from scratch, while still allowing freeform input via the "Other" field on
// the picker component. Values stored in DB are the lowercase canonical
// string (e.g. "us politics"), the label is the display text shown in the
// chip (e.g. "US politics").
//
// Adding to a list here is safe — values are validated by the per-module zod
// schema, not by this list. Removing or renaming a value should be done with
// migration care; an old DB row with the old value will still render fine as
// a chip but won't match a preset.

export interface Preset {
  value: string;
  label: string;
}

// ── News topics ──────────────────────────────────────────────
// Curated to roughly mirror what the major outlets organize their front
// pages around. Order is rough relevance (news consumption surveys + a
// touch of opinion).
export const NEWS_TOPIC_PRESETS: Preset[] = [
  { value: 'us politics', label: 'US politics' },
  { value: 'world news', label: 'World news' },
  { value: 'business', label: 'Business' },
  { value: 'technology', label: 'Technology' },
  { value: 'ai', label: 'AI' },
  { value: 'climate', label: 'Climate' },
  { value: 'science', label: 'Science' },
  { value: 'health', label: 'Health' },
  { value: 'finance', label: 'Finance' },
  { value: 'markets', label: 'Markets' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'real estate', label: 'Real estate' },
  { value: 'sports', label: 'Sports' },
  { value: 'culture', label: 'Culture' },
  { value: 'media', label: 'Media' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'film', label: 'Film' },
  { value: 'music', label: 'Music' },
  { value: 'books', label: 'Books' },
  { value: 'food', label: 'Food' },
  { value: 'travel', label: 'Travel' },
  { value: 'opinion', label: 'Opinion' },
  { value: 'education', label: 'Education' },
  { value: 'space', label: 'Space' },
  { value: 'energy', label: 'Energy' },
  { value: 'startups', label: 'Startups' },
  { value: 'autos', label: 'Autos' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'national security', label: 'National security' },
  { value: 'middle east', label: 'Middle East' },
  { value: 'europe', label: 'Europe' },
  { value: 'asia', label: 'Asia' },
  { value: 'latin america', label: 'Latin America' },
  { value: 'africa', label: 'Africa' },
];

// ── News sources ─────────────────────────────────────────────
// Pre-pinned publication names. The send pipeline treats this as a hard
// whitelist when set, so anything here gets used verbatim.
export const NEWS_SOURCE_PRESETS: Preset[] = [
  { value: 'Reuters', label: 'Reuters' },
  { value: 'Associated Press', label: 'Associated Press' },
  { value: 'BBC', label: 'BBC' },
  { value: 'The New York Times', label: 'The New York Times' },
  { value: 'The Washington Post', label: 'The Washington Post' },
  { value: 'The Wall Street Journal', label: 'The Wall Street Journal' },
  { value: 'Bloomberg', label: 'Bloomberg' },
  { value: 'Financial Times', label: 'Financial Times' },
  { value: 'The Guardian', label: 'The Guardian' },
  { value: 'The Economist', label: 'The Economist' },
  { value: 'NPR', label: 'NPR' },
  { value: 'CNN', label: 'CNN' },
  { value: 'CNBC', label: 'CNBC' },
  { value: 'Axios', label: 'Axios' },
  { value: 'Politico', label: 'Politico' },
  { value: 'The Verge', label: 'The Verge' },
  { value: 'Ars Technica', label: 'Ars Technica' },
  { value: 'TechCrunch', label: 'TechCrunch' },
  { value: 'Wired', label: 'Wired' },
  { value: 'MIT Technology Review', label: 'MIT Technology Review' },
  { value: 'The Athletic', label: 'The Athletic' },
  { value: 'ESPN', label: 'ESPN' },
  { value: 'Variety', label: 'Variety' },
];

// ── Reddit subreddits ────────────────────────────────────────
// Big enough that a typical user finds at least 3 they want to follow.
export const REDDIT_SUBREDDIT_PRESETS: Preset[] = [
  { value: 'todayilearned', label: 'todayilearned' },
  { value: 'science', label: 'science' },
  { value: 'technology', label: 'technology' },
  { value: 'programming', label: 'programming' },
  { value: 'webdev', label: 'webdev' },
  { value: 'MachineLearning', label: 'MachineLearning' },
  { value: 'singularity', label: 'singularity' },
  { value: 'OpenAI', label: 'OpenAI' },
  { value: 'apple', label: 'apple' },
  { value: 'android', label: 'android' },
  { value: 'startups', label: 'startups' },
  { value: 'Entrepreneur', label: 'Entrepreneur' },
  { value: 'investing', label: 'investing' },
  { value: 'personalfinance', label: 'personalfinance' },
  { value: 'wallstreetbets', label: 'wallstreetbets' },
  { value: 'stocks', label: 'stocks' },
  { value: 'CryptoCurrency', label: 'CryptoCurrency' },
  { value: 'worldnews', label: 'worldnews' },
  { value: 'politics', label: 'politics' },
  { value: 'neutralpolitics', label: 'neutralpolitics' },
  { value: 'economics', label: 'economics' },
  { value: 'space', label: 'space' },
  { value: 'EverythingScience', label: 'EverythingScience' },
  { value: 'futurology', label: 'futurology' },
  { value: 'askscience', label: 'askscience' },
  { value: 'history', label: 'history' },
  { value: 'AskHistorians', label: 'AskHistorians' },
  { value: 'books', label: 'books' },
  { value: 'movies', label: 'movies' },
  { value: 'television', label: 'television' },
  { value: 'Music', label: 'Music' },
  { value: 'gaming', label: 'gaming' },
  { value: 'soccer', label: 'soccer' },
  { value: 'nba', label: 'nba' },
  { value: 'nfl', label: 'nfl' },
  { value: 'formula1', label: 'formula1' },
  { value: 'food', label: 'food' },
  { value: 'cooking', label: 'cooking' },
  { value: 'fitness', label: 'fitness' },
  { value: 'travel', label: 'travel' },
  { value: 'Frugal', label: 'Frugal' },
  { value: 'productivity', label: 'productivity' },
  { value: 'getmotivated', label: 'getmotivated' },
];

// ── Podcast interests ────────────────────────────────────────
export const PODCAST_INTEREST_PRESETS: Preset[] = [
  { value: 'technology', label: 'Technology' },
  { value: 'business', label: 'Business' },
  { value: 'startups', label: 'Startups' },
  { value: 'venture capital', label: 'Venture capital' },
  { value: 'finance', label: 'Finance' },
  { value: 'investing', label: 'Investing' },
  { value: 'economics', label: 'Economics' },
  { value: 'politics', label: 'Politics' },
  { value: 'history', label: 'History' },
  { value: 'science', label: 'Science' },
  { value: 'ai', label: 'AI' },
  { value: 'design', label: 'Design' },
  { value: 'creativity', label: 'Creativity' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'self-improvement', label: 'Self-improvement' },
  { value: 'philosophy', label: 'Philosophy' },
  { value: 'true crime', label: 'True crime' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'sports', label: 'Sports' },
  { value: 'culture', label: 'Culture' },
  { value: 'film', label: 'Film' },
  { value: 'music', label: 'Music' },
  { value: 'literature', label: 'Literature' },
  { value: 'health', label: 'Health' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'cooking', label: 'Cooking' },
  { value: 'travel', label: 'Travel' },
  { value: 'climate', label: 'Climate' },
];

// ── AI & Tech subtopics ──────────────────────────────────────
export const AITECH_SUBTOPIC_PRESETS: Preset[] = [
  { value: 'AI models', label: 'AI models' },
  { value: 'AI policy', label: 'AI policy' },
  { value: 'AI safety', label: 'AI safety' },
  { value: 'AI research', label: 'AI research' },
  { value: 'startups', label: 'Startups' },
  { value: 'big tech', label: 'Big tech' },
  { value: 'open source', label: 'Open source' },
  { value: 'developer tools', label: 'Developer tools' },
  { value: 'chips and hardware', label: 'Chips & hardware' },
  { value: 'data centers', label: 'Data centers' },
  { value: 'robotics', label: 'Robotics' },
  { value: 'autonomous vehicles', label: 'Autonomous vehicles' },
  { value: 'cybersecurity', label: 'Cybersecurity' },
  { value: 'cloud and infrastructure', label: 'Cloud & infra' },
  { value: 'consumer products', label: 'Consumer products' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'crypto and web3', label: 'Crypto & Web3' },
  { value: 'biotech', label: 'Biotech' },
  { value: 'climate tech', label: 'Climate tech' },
  { value: 'space tech', label: 'Space tech' },
  { value: 'M&A and IPOs', label: 'M&A and IPOs' },
];

// ── Sports leagues ───────────────────────────────────────────
// Fixed set — these are the leagues we tell Claude to look up scores for.
export const SPORTS_LEAGUE_PRESETS: Preset[] = [
  { value: 'NBA', label: 'NBA' },
  { value: 'NFL', label: 'NFL' },
  { value: 'MLB', label: 'MLB' },
  { value: 'NHL', label: 'NHL' },
  { value: 'MLS', label: 'MLS' },
  { value: 'NCAA Basketball', label: 'NCAA Basketball' },
  { value: 'NCAA Football', label: 'NCAA Football' },
  { value: 'Premier League', label: 'Premier League' },
  { value: 'La Liga', label: 'La Liga' },
  { value: 'Bundesliga', label: 'Bundesliga' },
  { value: 'Serie A', label: 'Serie A' },
  { value: 'Ligue 1', label: 'Ligue 1' },
  { value: 'UEFA Champions League', label: 'UEFA Champions League' },
  { value: 'WNBA', label: 'WNBA' },
  { value: 'PGA Tour', label: 'PGA Tour' },
  { value: 'LPGA', label: 'LPGA' },
  { value: 'Formula 1', label: 'Formula 1' },
  { value: 'NASCAR', label: 'NASCAR' },
  { value: 'IndyCar', label: 'IndyCar' },
  { value: 'ATP', label: 'ATP' },
  { value: 'WTA', label: 'WTA' },
  { value: 'UFC', label: 'UFC' },
  { value: 'Boxing', label: 'Boxing' },
];

// ── Markets symbols ──────────────────────────────────────────
// Tickers users actually watch. The form still accepts freeform symbols
// so power users can type AMZN, BRK.B, IWM, whatever.
export const MARKETS_SYMBOL_PRESETS: Preset[] = [
  { value: 'SPY', label: 'SPY · S&P 500' },
  { value: 'QQQ', label: 'QQQ · Nasdaq 100' },
  { value: 'DIA', label: 'DIA · Dow Jones' },
  { value: 'VTI', label: 'VTI · Total Market' },
  { value: 'AAPL', label: 'AAPL · Apple' },
  { value: 'MSFT', label: 'MSFT · Microsoft' },
  { value: 'GOOGL', label: 'GOOGL · Alphabet' },
  { value: 'AMZN', label: 'AMZN · Amazon' },
  { value: 'META', label: 'META · Meta' },
  { value: 'NVDA', label: 'NVDA · Nvidia' },
  { value: 'TSLA', label: 'TSLA · Tesla' },
  { value: 'AMD', label: 'AMD · AMD' },
  { value: 'NFLX', label: 'NFLX · Netflix' },
  { value: 'COIN', label: 'COIN · Coinbase' },
  { value: 'JPM', label: 'JPM · JPMorgan' },
  { value: 'BTC-USD', label: 'BTC-USD · Bitcoin' },
  { value: 'ETH-USD', label: 'ETH-USD · Ethereum' },
  { value: 'SOL-USD', label: 'SOL-USD · Solana' },
  { value: 'GLD', label: 'GLD · Gold' },
  { value: 'TLT', label: 'TLT · Long-term Treasuries' },
];

// ── Recipe cuisines ──────────────────────────────────────────
export const RECIPE_CUISINE_PRESETS: Preset[] = [
  { value: 'any', label: 'Any cuisine' },
  { value: 'italian', label: 'Italian' },
  { value: 'mexican', label: 'Mexican' },
  { value: 'mediterranean', label: 'Mediterranean' },
  { value: 'french', label: 'French' },
  { value: 'spanish', label: 'Spanish' },
  { value: 'greek', label: 'Greek' },
  { value: 'middle eastern', label: 'Middle Eastern' },
  { value: 'indian', label: 'Indian' },
  { value: 'thai', label: 'Thai' },
  { value: 'vietnamese', label: 'Vietnamese' },
  { value: 'japanese', label: 'Japanese' },
  { value: 'korean', label: 'Korean' },
  { value: 'chinese', label: 'Chinese' },
  { value: 'american', label: 'American' },
  { value: 'southern', label: 'Southern (US)' },
  { value: 'cajun', label: 'Cajun' },
  { value: 'caribbean', label: 'Caribbean' },
  { value: 'brazilian', label: 'Brazilian' },
  { value: 'peruvian', label: 'Peruvian' },
  { value: 'ethiopian', label: 'Ethiopian' },
  { value: 'moroccan', label: 'Moroccan' },
];

// ── Dietary restrictions ─────────────────────────────────────
export const DIETARY_PRESETS: Preset[] = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'gluten-free', label: 'Gluten-free' },
  { value: 'dairy-free', label: 'Dairy-free' },
  { value: 'nut-free', label: 'Nut-free' },
  { value: 'pescatarian', label: 'Pescatarian' },
  { value: 'keto', label: 'Keto' },
  { value: 'paleo', label: 'Paleo' },
  { value: 'low-carb', label: 'Low-carb' },
  { value: 'low-sodium', label: 'Low-sodium' },
  { value: 'low-sugar', label: 'Low-sugar' },
  { value: 'halal', label: 'Halal' },
  { value: 'kosher', label: 'Kosher' },
];

// ── Book genres ──────────────────────────────────────────────
export const BOOK_GENRE_PRESETS: Preset[] = [
  { value: 'literary fiction', label: 'Literary fiction' },
  { value: 'mystery', label: 'Mystery' },
  { value: 'thriller', label: 'Thriller' },
  { value: 'science fiction', label: 'Science fiction' },
  { value: 'fantasy', label: 'Fantasy' },
  { value: 'historical fiction', label: 'Historical fiction' },
  { value: 'romance', label: 'Romance' },
  { value: 'horror', label: 'Horror' },
  { value: 'classic', label: 'Classic' },
  { value: 'biography', label: 'Biography' },
  { value: 'memoir', label: 'Memoir' },
  { value: 'history', label: 'History' },
  { value: 'philosophy', label: 'Philosophy' },
  { value: 'science', label: 'Science' },
  { value: 'business', label: 'Business' },
  { value: 'self-improvement', label: 'Self-improvement' },
  { value: 'psychology', label: 'Psychology' },
  { value: 'economics', label: 'Economics' },
  { value: 'politics', label: 'Politics' },
  { value: 'essays', label: 'Essays' },
  { value: 'poetry', label: 'Poetry' },
  { value: 'travel', label: 'Travel' },
];

// ── Languages ────────────────────────────────────────────────
// Common-enough to recommend a daily word; freeform "Other" still works.
export const LANGUAGE_PRESETS: Preset[] = [
  { value: 'Spanish', label: 'Spanish' },
  { value: 'French', label: 'French' },
  { value: 'German', label: 'German' },
  { value: 'Italian', label: 'Italian' },
  { value: 'Portuguese', label: 'Portuguese' },
  { value: 'Dutch', label: 'Dutch' },
  { value: 'Swedish', label: 'Swedish' },
  { value: 'Norwegian', label: 'Norwegian' },
  { value: 'Polish', label: 'Polish' },
  { value: 'Russian', label: 'Russian' },
  { value: 'Greek', label: 'Greek' },
  { value: 'Latin', label: 'Latin' },
  { value: 'Hebrew', label: 'Hebrew' },
  { value: 'Arabic', label: 'Arabic' },
  { value: 'Turkish', label: 'Turkish' },
  { value: 'Hindi', label: 'Hindi' },
  { value: 'Mandarin Chinese', label: 'Mandarin Chinese' },
  { value: 'Cantonese', label: 'Cantonese' },
  { value: 'Japanese', label: 'Japanese' },
  { value: 'Korean', label: 'Korean' },
  { value: 'Vietnamese', label: 'Vietnamese' },
  { value: 'Thai', label: 'Thai' },
  { value: 'Swahili', label: 'Swahili' },
];

// ── Local-events categories ──────────────────────────────────
// Already used by LocalEventsForm; lifted out so it shares the
// PresetChipPicker pattern and the "Other" fallback.
export const LOCAL_EVENTS_CATEGORY_PRESETS: Preset[] = [
  { value: 'music', label: 'Music' },
  { value: 'food & drink', label: 'Food & Drink' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'art & culture', label: 'Art & Culture' },
  { value: 'sports', label: 'Sports' },
  { value: 'networking', label: 'Networking' },
  { value: 'family', label: 'Family' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'film', label: 'Film' },
  { value: 'theater', label: 'Theater' },
  { value: 'tech', label: 'Tech' },
  { value: 'wellness', label: 'Wellness' },
  { value: 'nightlife', label: 'Nightlife' },
];
