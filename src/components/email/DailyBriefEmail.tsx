import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import { getTheme, type EmailThemeColors } from '@/lib/email/themes';
import { stripCitationArtifacts } from '@/lib/email/newsValidation';

// ─────────────────────────────────────────────────────────────
// Section data shapes
// ─────────────────────────────────────────────────────────────

interface WeatherLocation {
  name: string; tempF: number; condition: string; humidity: string; high: number; low: number;
}
interface NewsArticle { headline: string; source: string; summary: string; whyItMatters?: string; url?: string; }
interface MarketSymbol { symbol: string; price: string; change: string; changePercent: string; direction: 'up' | 'down'; }
interface SportsResult { team: string; opponent: string; score: string; result: 'win' | 'loss' | 'draw'; nextGame?: string; }
interface WorkoutExercise { exercise: string; sets?: string; reps?: string; duration?: string; }
interface CurrencyRate { target: string; rate: string; direction: 'up' | 'down' | 'flat'; change?: string; }
interface PodcastData { showName: string; episodeTitle: string; length: string; guest?: string; description: string; url?: string; }
interface RedditPost { subreddit: string; title: string; summary: string; upvotes: string; url: string; }
interface AiTechStory { headline: string; source: string; summary: string; }
interface LocalEvent { name: string; datetime: string; venue: string; description: string; price: string; url?: string; }
interface WeekHistoryEvent { year: string; title: string; context: string; }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SectionData = { type: string; data: Record<string, any> };

export interface DailyBriefEmailProps {
  userName: string;
  date: string;
  intro?: string; // retained for API compatibility, no longer rendered
  sections: SectionData[];
  unsubscribeToken: string;
  theme?: string;
  showUpgradeCta?: boolean;
  /** Physical mailing address required by CAN-SPAM. Set via BUSINESS_MAILING_ADDRESS env var on the server. */
  mailingAddress: string;
  /**
   * Optional one-line peek line directly under the date. Used to situate
   * the reader in their morning rather than just on the calendar. E.g.
   * "Clear and 77° in New York." or "Halfway through the week."
   */
  contextLine?: string;
}

// ─────────────────────────────────────────────────────────────
// Type system — editorial fonts and shared styles
// ─────────────────────────────────────────────────────────────
//
// Email clients strip @font-face and most custom fonts. We use a stack of
// well-installed system serifs ordered to approximate Instrument Serif's
// feel: tall x-height, refined italics. Outlook and Windows Mail fall
// straight through to Georgia, which is acceptable.

const SERIF_STACK = '"Iowan Old Style", "Hoefler Text", "Apple Garamond", Georgia, "Times New Roman", serif';
const SANS_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", Roboto, Helvetica, Arial, sans-serif';
const MONO_STACK = '"SF Mono", "Roboto Mono", Menlo, Consolas, monospace';

function kickerStyle(c: EmailThemeColors): React.CSSProperties {
  return {
    color: c.muted,
    fontFamily: MONO_STACK,
    fontSize: '11px',
    fontWeight: 500,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    margin: '0 0 12px',
  };
}
function serifHeadlineStyle(c: EmailThemeColors): React.CSSProperties {
  return {
    color: c.text,
    fontFamily: SERIF_STACK,
    fontSize: '32px',
    fontWeight: 400,
    fontStyle: 'italic',
    lineHeight: '1.15',
    letterSpacing: '-0.01em',
    margin: '0',
  };
}
function bodyStyle(c: EmailThemeColors): React.CSSProperties {
  return { color: c.text, fontFamily: SANS_STACK, fontSize: '16px', lineHeight: '1.65', margin: '0 0 10px' };
}
function mutedStyle(c: EmailThemeColors): React.CSSProperties {
  return { color: c.muted, fontFamily: SANS_STACK, fontSize: '14px', lineHeight: '1.55', margin: '0 0 4px' };
}
function smallcapStyle(c: EmailThemeColors): React.CSSProperties {
  return {
    color: c.muted,
    fontFamily: MONO_STACK,
    fontSize: '10px',
    fontWeight: 500,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    margin: '0',
  };
}

// ─────────────────────────────────────────────────────────────
// Decorative dot divider — thin rule + three centered dots
// ─────────────────────────────────────────────────────────────

function DotDivider({ c }: { c: EmailThemeColors }) {
  // Outlook tip: we use a table-style flex inside React Email Sections, since
  // Outlook ignores flex but renders the row of dot spans correctly inline.
  return (
    <Section style={{ position: 'relative', margin: '36px 0', textAlign: 'center' }}>
      <div style={{ position: 'relative', height: '1px', backgroundColor: c.border }} aria-hidden="true" />
      <div style={{ marginTop: '-7px', textAlign: 'center' }}>
        <span style={{
          display: 'inline-block',
          padding: '0 12px',
          backgroundColor: c.containerBg,
          color: c.border,
          fontFamily: SANS_STACK,
          fontSize: '14px',
          lineHeight: '14px',
          letterSpacing: '0.4em',
        }}>
          • • •
        </span>
      </div>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────
// Error fallback
// ─────────────────────────────────────────────────────────────

function SectionErrorFallback({ label, c }: { label: string; c: EmailThemeColors }) {
  return (
    <Section>
      <Text style={kickerStyle(c)}>{label}</Text>
      <Text style={{ ...mutedStyle(c), fontStyle: 'italic', margin: '0' }}>
        Not available this morning.
      </Text>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────
// Section renderers
// ─────────────────────────────────────────────────────────────

function WeatherSection({ data, c }: { data: Record<string, unknown>; c: EmailThemeColors }) {
  if (data?.error) return <SectionErrorFallback label="Weather" c={c} />;
  const locations = (data.locations as WeatherLocation[] | undefined) ?? [];
  if (locations.length === 0) return <SectionErrorFallback label="Weather" c={c} />;
  return (
    <Section>
      <Text style={kickerStyle(c)}>Weather</Text>
      {locations.map((loc, idx) => (
        <Section key={loc.name} style={{ marginBottom: idx < locations.length - 1 ? '20px' : '0' }}>
          <Text style={{ ...smallcapStyle(c), margin: '0 0 6px' }}>{loc.name}</Text>
          <Text style={{
            color: c.text,
            fontFamily: SERIF_STACK,
            fontSize: '44px',
            fontWeight: 300,
            lineHeight: '1',
            margin: '0 0 6px',
          }}>
            {loc.tempF}°
            <span style={{
              fontFamily: SANS_STACK,
              fontSize: '14px',
              fontWeight: 500,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: c.muted,
              marginLeft: '14px',
              verticalAlign: 'middle',
            }}>
              {loc.condition}
            </span>
          </Text>
          <Text style={{ ...mutedStyle(c), fontSize: '13px', margin: '0' }}>
            High {loc.high}° &nbsp; Low {loc.low}° &nbsp; Humidity {loc.humidity}
          </Text>
        </Section>
      ))}
    </Section>
  );
}

function NewsSection({ data, c }: { data: Record<string, unknown>; c: EmailThemeColors }) {
  if (data?.error) return <SectionErrorFallback label="News" c={c} />;
  // News is hardcoded to 3 articles. Slice as a defensive cap so legacy
  // search-cache entries (built when articleCount was 5 or 10) don't render
  // more than three even if the cached payload still carries them.
  const articlesRaw = ((data.articles as NewsArticle[] | undefined) ?? []).slice(0, 3);
  // Defense in depth: strip citation/arrow artifacts at render time. Upstream
  // validation already runs but a leak here is a visible regression.
  const articles: NewsArticle[] = articlesRaw.map((a) => ({
    headline: stripCitationArtifacts(a.headline) ?? a.headline,
    source: stripCitationArtifacts(a.source) ?? a.source,
    summary: stripCitationArtifacts(a.summary) ?? a.summary,
    whyItMatters: a.whyItMatters ? stripCitationArtifacts(a.whyItMatters) : undefined,
    url: a.url,
  }));
  const editorialNote = typeof data.editorialNote === 'string' ? data.editorialNote : undefined;
  // Build a "Continue at Reuters" / "Continue at Bloomberg" style link label
  // from the article source. Falls back to "Continue reading" if missing.
  const linkLabel = (source: string | undefined): string => {
    const trimmed = (source ?? '').trim();
    return trimmed ? `Continue at ${trimmed}` : 'Continue reading';
  };
  return (
    <Section>
      <Text style={kickerStyle(c)}>News</Text>
      {editorialNote && (
        <Text style={{ ...mutedStyle(c), fontFamily: SERIF_STACK, fontStyle: 'italic', fontSize: '15px', margin: '0 0 16px' }}>{editorialNote}</Text>
      )}
      {articles.map((article, i) => (
        <Section key={i} style={{ marginBottom: i < articles.length - 1 ? '28px' : '0' }}>
          <Text style={{ ...smallcapStyle(c), margin: '0 0 4px' }}>{article.source}</Text>
          <Text style={{
            color: c.text,
            fontFamily: SANS_STACK,
            fontSize: '17px',
            fontWeight: 600,
            lineHeight: '1.35',
            margin: '0 0 6px',
          }}>{article.headline}</Text>
          <Text style={{ ...bodyStyle(c), color: c.muted, fontSize: '15px', margin: '0 0 8px' }}>
            {article.summary}
          </Text>
          {article.whyItMatters && (
            <Text style={{
              ...mutedStyle(c),
              fontFamily: SERIF_STACK,
              fontStyle: 'italic',
              fontSize: '14px',
              color: c.muted,
              margin: '0 0 10px',
            }}>
              Why this matters: {article.whyItMatters}
            </Text>
          )}
          {article.url && (
            <Link href={article.url} style={{
              color: c.text,
              fontFamily: SANS_STACK,
              fontSize: '13px',
              fontWeight: 500,
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
            }}>{linkLabel(article.source)}</Link>
          )}
        </Section>
      ))}
    </Section>
  );
}

function QuoteSection({ data, c }: { data: Record<string, unknown>; c: EmailThemeColors }) {
  if (data?.error) return <SectionErrorFallback label="Quote" c={c} />;
  const { text, author } = data as { text: string; author: string };
  return (
    <Section style={{ textAlign: 'left' }}>
      <Text style={kickerStyle(c)}>Quote of the Day</Text>
      <div style={{ width: '52px', height: '1px', backgroundColor: c.border, margin: '0 0 18px' }} aria-hidden="true" />
      <Text style={{
        color: c.text,
        fontFamily: SERIF_STACK,
        fontSize: '24px',
        fontStyle: 'italic',
        fontWeight: 400,
        lineHeight: '1.4',
        letterSpacing: '-0.005em',
        margin: '0 0 20px',
      }}>
        {text}
      </Text>
      <div style={{ width: '52px', height: '1px', backgroundColor: c.border, margin: '0 0 12px' }} aria-hidden="true" />
      <Text style={{ ...smallcapStyle(c), margin: '0' }}>{author}</Text>
    </Section>
  );
}

function MarketsSection({ data, c }: { data: Record<string, unknown>; c: EmailThemeColors }) {
  if (data?.error) return <SectionErrorFallback label="Markets" c={c} />;
  const symbols = (data.symbols as MarketSymbol[] | undefined) ?? [];
  if (symbols.length === 0) return <SectionErrorFallback label="Markets" c={c} />;
  return (
    <Section>
      <Text style={kickerStyle(c)}>Markets</Text>
      {symbols.map((s, i) => (
        <Section key={s.symbol} style={{
          marginBottom: i < symbols.length - 1 ? '18px' : '0',
          paddingBottom: i < symbols.length - 1 ? '18px' : '0',
          borderBottom: i < symbols.length - 1 ? `1px solid ${c.border}` : 'none',
        }}>
          {/* Ticker eyebrow, scanline-style. */}
          <Text style={{
            ...smallcapStyle(c),
            fontFamily: MONO_STACK,
            margin: '0 0 4px',
          }}>
            {s.symbol}
          </Text>
          {/* Hero: the price. Single dominant element. */}
          <Text style={{
            color: c.text,
            fontFamily: SERIF_STACK,
            fontSize: '32px',
            fontWeight: 300,
            lineHeight: '1.05',
            margin: '0 0 6px',
            letterSpacing: '-0.01em',
          }}>
            {s.price}
          </Text>
          {/* Secondary: % change with direction + absolute change. Muted. */}
          <Text style={{
            ...mutedStyle(c),
            margin: '0',
            fontFamily: MONO_STACK,
            fontSize: '13px',
          }}>
            <span style={{ color: s.direction === 'up' ? c.positive : c.negative, fontWeight: 500 }}>
              {s.direction === 'up' ? '▲' : '▼'} {s.changePercent}
            </span>
            <span style={{ marginLeft: '8px', fontSize: '12px' }}>
              ({s.change})
            </span>
          </Text>
        </Section>
      ))}
    </Section>
  );
}

function SportsSection({ data, c }: { data: Record<string, unknown>; c: EmailThemeColors }) {
  if (data?.error) return <SectionErrorFallback label="Sports" c={c} />;
  const { results: resultsRaw, standingsNote } = data as { results?: SportsResult[]; standingsNote?: string };
  const results = resultsRaw ?? [];
  if (results.length === 0) return <SectionErrorFallback label="Sports" c={c} />;
  return (
    <Section>
      <Text style={kickerStyle(c)}>Sports</Text>
      {results.map((r, i) => (
        <Section key={i} style={{ marginBottom: i < results.length - 1 ? '22px' : '0' }}>
          {/* Team eyebrow. */}
          <Text style={{ ...smallcapStyle(c), margin: '0 0 4px' }}>{r.team}</Text>
          {/* Hero: the score. Single dominant element, matches Weather/Markets. */}
          <Text style={{
            color: c.text,
            fontFamily: SERIF_STACK,
            fontSize: '36px',
            fontWeight: 300,
            margin: '0 0 6px',
            lineHeight: '1.05',
            letterSpacing: '-0.01em',
          }}>
            {r.score}
            <span style={{
              fontFamily: SANS_STACK,
              fontSize: '12px',
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: r.result === 'win' ? c.positive : r.result === 'loss' ? c.negative : c.muted,
              marginLeft: '14px',
              verticalAlign: 'middle',
            }}>
              {r.result}
            </span>
          </Text>
          <Text style={{ ...mutedStyle(c), margin: '0' }}>
            vs {r.opponent}{r.nextGame ? ` · Next: ${r.nextGame}` : ''}
          </Text>
        </Section>
      ))}
      {standingsNote && (
        <Text style={{ ...mutedStyle(c), fontStyle: 'italic', marginTop: '10px' }}>{standingsNote}</Text>
      )}
    </Section>
  );
}

function WordOfDaySection({ data, c }: { data: Record<string, unknown>; c: EmailThemeColors }) {
  if (data?.error) return <SectionErrorFallback label="Word of the Day" c={c} />;
  const { word, partOfSpeech, definition, etymology, exampleSentence } = data as {
    word: string; partOfSpeech: string; definition: string; etymology: string; exampleSentence: string;
  };
  return (
    <Section>
      <Text style={kickerStyle(c)}>Word of the Day</Text>
      <Text style={{
        color: c.text,
        fontFamily: SERIF_STACK,
        fontSize: '34px',
        fontWeight: 400,
        margin: '0 0 4px',
        lineHeight: '1.1',
      }}>
        {word}
        <span style={{
          fontFamily: SANS_STACK,
          fontSize: '13px',
          fontStyle: 'italic',
          color: c.muted,
          marginLeft: '12px',
          verticalAlign: 'middle',
        }}>
          {partOfSpeech}
        </span>
      </Text>
      <Text style={{ ...bodyStyle(c), margin: '10px 0' }}>{definition}</Text>
      <Text style={{ ...mutedStyle(c), fontStyle: 'italic', margin: '0 0 12px' }}>Origin: {etymology}</Text>
      <Text style={{ ...bodyStyle(c), fontFamily: SERIF_STACK, fontStyle: 'italic', color: c.muted, margin: '0' }}>
        {exampleSentence}
      </Text>
    </Section>
  );
}

function WorkoutSection({ data, c }: { data: Record<string, unknown>; c: EmailThemeColors }) {
  if (data?.error) return <SectionErrorFallback label="Workout" c={c} />;
  const { intro, warmup: warmupRaw, circuit: circuitRaw, cooldown } = data as {
    intro?: string;
    warmup?: { exercise: string; duration: string }[];
    circuit?: WorkoutExercise[];
    cooldown?: string;
  };
  const warmup = warmupRaw ?? [];
  const circuit = circuitRaw ?? [];
  if (warmup.length === 0 && circuit.length === 0) return <SectionErrorFallback label="Workout" c={c} />;
  return (
    <Section>
      <Text style={kickerStyle(c)}>Daily Workout</Text>
      <Text style={{ ...bodyStyle(c), fontFamily: SERIF_STACK, fontStyle: 'italic', color: c.muted, margin: '0 0 16px' }}>{intro}</Text>
      <Text style={{ ...smallcapStyle(c), margin: '0 0 8px' }}>Warm-Up</Text>
      {warmup.map((ex, i) => (
        <Text key={i} style={{ ...bodyStyle(c), margin: '0 0 4px' }}>{ex.exercise} <span style={{ color: c.muted }}>· {ex.duration}</span></Text>
      ))}
      <Text style={{ ...smallcapStyle(c), margin: '16px 0 8px' }}>Circuit</Text>
      {circuit.map((ex, i) => {
        const detail = [ex.sets && ex.reps ? `${ex.sets} × ${ex.reps}` : null, ex.duration].filter(Boolean).join(' · ');
        return (
          <Text key={i} style={{ ...bodyStyle(c), margin: '0 0 4px' }}>{ex.exercise}{detail ? <span style={{ color: c.muted }}> · {detail}</span> : ''}</Text>
        );
      })}
      <Text style={{ ...mutedStyle(c), fontStyle: 'italic', marginTop: '14px' }}>Cool-down: {cooldown}</Text>
    </Section>
  );
}

function MindfulnessSection({ data, c }: { data: Record<string, unknown>; c: EmailThemeColors }) {
  if (data?.error) return <SectionErrorFallback label="Mindfulness" c={c} />;
  const { prompt } = data as { prompt: string };
  // Sub-eyebrow removed. The "DAILY {style}" line read ambiguously
  // (especially with stale cached values like "moderate" from an earlier
  // schema). The "Mindfulness" kicker above already labels the section.
  return (
    <Section>
      <Text style={kickerStyle(c)}>Mindfulness</Text>
      <div style={{ width: '52px', height: '1px', backgroundColor: c.border, margin: '0 0 16px' }} aria-hidden="true" />
      <Text style={{
        color: c.text,
        fontFamily: SERIF_STACK,
        fontSize: '20px',
        fontStyle: 'italic',
        lineHeight: '1.45',
        margin: '0',
      }}>
        {prompt}
      </Text>
    </Section>
  );
}

function OnThisDaySection({ data, c }: { data: Record<string, unknown>; c: EmailThemeColors }) {
  if (data?.error) return <SectionErrorFallback label="On This Day" c={c} />;
  const { year, title, context } = data as { year: string; title: string; context: string };
  return (
    <Section>
      <Text style={kickerStyle(c)}>On This Day in History</Text>
      <Text style={{
        color: c.muted,
        fontFamily: SERIF_STACK,
        fontSize: '54px',
        fontWeight: 300,
        lineHeight: '1',
        margin: '0 0 8px',
        letterSpacing: '-0.01em',
      }}>
        {year}
      </Text>
      <Text style={{ ...bodyStyle(c), fontFamily: SERIF_STACK, fontSize: '20px', fontStyle: 'italic', margin: '0 0 10px' }}>{title}</Text>
      <Text style={{ ...bodyStyle(c), color: c.muted, margin: '0' }}>{context}</Text>
    </Section>
  );
}

function CurrencySection({ data, c }: { data: Record<string, unknown>; c: EmailThemeColors }) {
  if (data?.error) return <SectionErrorFallback label="Currency" c={c} />;
  const { base, rates: ratesRaw } = data as { base?: string; rates?: CurrencyRate[] };
  const rates = ratesRaw ?? [];
  if (!base || rates.length === 0) return <SectionErrorFallback label="Currency" c={c} />;
  return (
    <Section>
      <Text style={kickerStyle(c)}>Currency</Text>
      {rates.map((r, i) => (
        <Section key={r.target} style={{
          marginBottom: i < rates.length - 1 ? '10px' : '0',
          paddingBottom: i < rates.length - 1 ? '10px' : '0',
          borderBottom: i < rates.length - 1 ? `1px solid ${c.border}` : 'none',
        }}>
          <Text style={{ ...bodyStyle(c), margin: '0' }}>
            <span style={{ color: c.muted }}>1 {base}</span>
            <span style={{ marginLeft: '10px', fontFamily: MONO_STACK, fontWeight: 600 }}>{r.rate} {r.target}</span>
            {/* Delta column is only rendered when we actually have a change
                value. The old design always emitted a "–" placeholder for
                flat/missing deltas, which read as a trailing punctuation bug. */}
            {r.change && (r.direction === 'up' || r.direction === 'down') && (
              <span style={{
                marginLeft: '12px',
                color: r.direction === 'up' ? c.positive : c.negative,
                fontFamily: MONO_STACK,
                fontSize: '13px',
              }}>
                {r.direction === 'up' ? '▲' : '▼'} {r.change}
              </span>
            )}
          </Text>
        </Section>
      ))}
    </Section>
  );
}

function PodcastSection({ data, c }: { data: Record<string, unknown>; c: EmailThemeColors }) {
  if (data?.error) return <SectionErrorFallback label="Podcast" c={c} />;
  const d = data as unknown as PodcastData;
  return (
    <Section>
      <Text style={kickerStyle(c)}>Podcast Pick</Text>
      <Text style={{ ...smallcapStyle(c), margin: '0 0 6px' }}>{d.showName}</Text>
      <Text style={{
        color: c.text,
        fontFamily: SERIF_STACK,
        fontSize: '22px',
        fontStyle: 'italic',
        fontWeight: 400,
        margin: '0 0 6px',
        lineHeight: '1.3',
      }}>{d.episodeTitle}</Text>
      <Text style={{ ...mutedStyle(c), margin: '0 0 12px' }}>
        {d.length}{d.guest ? ` · with ${d.guest}` : ''}
      </Text>
      <Text style={{ ...bodyStyle(c), color: c.muted, margin: '0 0 10px' }}>{d.description}</Text>
      {d.url && (
        <Link href={d.url} style={{
          color: c.accent, fontFamily: SANS_STACK, fontSize: '13px', fontWeight: 500, textDecoration: 'none',
        }}>Listen now →</Link>
      )}
    </Section>
  );
}

function FactSection({ data, c }: { data: Record<string, unknown>; c: EmailThemeColors }) {
  if (data?.error) return <SectionErrorFallback label="Fact" c={c} />;
  const { fact, explanation } = data as { fact: string; explanation: string; category: string };
  return (
    <Section>
      <Text style={kickerStyle(c)}>Interesting Fact</Text>
      <Text style={{
        color: c.text,
        fontFamily: SERIF_STACK,
        fontSize: '22px',
        fontStyle: 'italic',
        fontWeight: 400,
        lineHeight: '1.4',
        margin: '0 0 12px',
      }}>{fact}</Text>
      <Text style={{ ...bodyStyle(c), color: c.muted, margin: '0' }}>{explanation}</Text>
    </Section>
  );
}

function RecipeSection({ data, c }: { data: Record<string, unknown>; c: EmailThemeColors }) {
  if (data?.error) return <SectionErrorFallback label="Recipe" c={c} />;
  const { name, description, prepTime, cookTime, servings, ingredients: ingredientsRaw, steps: stepsRaw } = data as {
    name?: string; description?: string; prepTime?: string; cookTime?: string; servings?: string;
    ingredients?: string[]; steps?: string[];
  };
  const ingredients = ingredientsRaw ?? [];
  const steps = stepsRaw ?? [];
  if (!name || ingredients.length === 0 || steps.length === 0) return <SectionErrorFallback label="Recipe" c={c} />;
  return (
    <Section>
      <Text style={kickerStyle(c)}>Recipe of the Day</Text>
      <Text style={{
        color: c.text,
        fontFamily: SERIF_STACK,
        fontSize: '26px',
        fontStyle: 'italic',
        margin: '0 0 6px',
        lineHeight: '1.2',
      }}>{name}</Text>
      <Text style={{ ...mutedStyle(c), fontFamily: SERIF_STACK, fontStyle: 'italic', margin: '0 0 16px' }}>{description}</Text>
      <Text style={{ ...mutedStyle(c), margin: '0 0 16px' }}>
        <span style={{ fontFamily: MONO_STACK, textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '11px' }}>
          Prep {prepTime} · Cook {cookTime} · Serves {servings}
        </span>
      </Text>
      <Text style={{ ...smallcapStyle(c), margin: '0 0 8px' }}>Ingredients</Text>
      {ingredients.map((ing, i) => (
        <Text key={i} style={{ ...bodyStyle(c), fontSize: '15px', margin: '0 0 4px' }}>· {ing}</Text>
      ))}
      <Text style={{ ...smallcapStyle(c), margin: '16px 0 8px' }}>Method</Text>
      {steps.map((step, i) => (
        <Text key={i} style={{ ...bodyStyle(c), fontSize: '15px', margin: '0 0 8px' }}>
          <span style={{ color: c.muted, fontFamily: MONO_STACK, marginRight: '8px' }}>{String(i + 1).padStart(2, '0')}</span>
          {step}
        </Text>
      ))}
    </Section>
  );
}

function BookSection({ data, c }: { data: Record<string, unknown>; c: EmailThemeColors }) {
  if (data?.error) return <SectionErrorFallback label="Book" c={c} />;
  const { title, author, year, genre, pages, summary, perfectFor } = data as {
    title: string; author: string; year: string; genre: string; pages: string; summary: string; perfectFor: string;
  };
  return (
    <Section>
      <Text style={kickerStyle(c)}>Book of the Day</Text>
      <Text style={{
        color: c.text,
        fontFamily: SERIF_STACK,
        fontSize: '26px',
        fontStyle: 'italic',
        margin: '0 0 4px',
        lineHeight: '1.2',
      }}>{title}</Text>
      <Text style={{ ...smallcapStyle(c), margin: '0 0 14px' }}>{author} · {year}</Text>
      <Text style={{ ...mutedStyle(c), margin: '0 0 14px' }}>
        <span style={{ fontFamily: MONO_STACK, textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '11px' }}>
          {genre} · {pages} pages
        </span>
      </Text>
      <Text style={{ ...bodyStyle(c), margin: '0 0 12px' }}>{summary}</Text>
      <Text style={{ ...mutedStyle(c), fontStyle: 'italic', margin: '0' }}>Perfect for: {perfectFor}</Text>
    </Section>
  );
}

function RedditSection({ data, c }: { data: Record<string, unknown>; c: EmailThemeColors }) {
  if (data?.error) return <SectionErrorFallback label="Reddit" c={c} />;
  const posts = (data.posts as RedditPost[] | undefined) ?? [];
  if (posts.length === 0) return <SectionErrorFallback label="Reddit" c={c} />;
  return (
    <Section>
      <Text style={kickerStyle(c)}>Reddit Digest</Text>
      {posts.map((post, i) => (
        <Section key={i} style={{
          marginBottom: i < posts.length - 1 ? '16px' : '0',
          paddingBottom: i < posts.length - 1 ? '16px' : '0',
          borderBottom: i < posts.length - 1 ? `1px solid ${c.border}` : 'none',
        }}>
          <Text style={{ ...smallcapStyle(c), color: c.accent, margin: '0 0 4px' }}>r/{post.subreddit}</Text>
          <Text style={{ ...bodyStyle(c), fontWeight: 600, margin: '0 0 4px' }}>{post.title}</Text>
          <Text style={{ ...mutedStyle(c), margin: '0 0 4px' }}>{post.summary}</Text>
          <Text style={{ ...mutedStyle(c), margin: '0', fontSize: '12px' }}>
            <span style={{ fontFamily: MONO_STACK }}>▲ {post.upvotes}</span>
            {post.url && <> &nbsp;·&nbsp; <Link href={post.url} style={{ color: c.accent, textDecoration: 'none' }}>View post →</Link></>}
          </Text>
        </Section>
      ))}
    </Section>
  );
}

function HoroscopeSection({ data, c }: { data: Record<string, unknown>; c: EmailThemeColors }) {
  if (data?.error) return <SectionErrorFallback label="Horoscope" c={c} />;
  const { sign, symbol, reading, focusForToday } = data as {
    sign: string; symbol: string; reading: string; focusForToday: string;
  };
  return (
    <Section>
      <Text style={kickerStyle(c)}>Daily Horoscope</Text>
      <Text style={{
        color: c.text,
        fontFamily: SERIF_STACK,
        fontSize: '24px',
        fontStyle: 'italic',
        margin: '0 0 14px',
        textTransform: 'capitalize',
      }}>
        {sign} <span style={{ marginLeft: '6px' }}>{symbol}</span>
      </Text>
      <Text style={{ ...bodyStyle(c), fontFamily: SERIF_STACK, fontStyle: 'italic', color: c.text, margin: '0 0 14px' }}>
        {reading}
      </Text>
      <Text style={{ ...smallcapStyle(c), margin: '0 0 4px' }}>Focus for today</Text>
      <Text style={{ ...bodyStyle(c), margin: '0' }}>{focusForToday}</Text>
    </Section>
  );
}

function LanguageSection({ data, c }: { data: Record<string, unknown>; c: EmailThemeColors }) {
  if (data?.error) return <SectionErrorFallback label="Language Word" c={c} />;
  const { language, word, romanization, partOfSpeech, translation, memoryTip, exampleOriginal, exampleTranslation } = data as {
    language: string; word: string; romanization?: string; partOfSpeech: string; translation: string;
    memoryTip: string; exampleOriginal: string; exampleTranslation: string;
  };
  return (
    <Section>
      <Text style={kickerStyle(c)}>Language Word</Text>
      <Text style={{ ...smallcapStyle(c), margin: '0 0 8px' }}>{language}</Text>
      <Text style={{
        color: c.text,
        fontFamily: SERIF_STACK,
        fontSize: '36px',
        fontWeight: 400,
        margin: '0 0 4px',
        lineHeight: '1.1',
      }}>{word}</Text>
      {romanization && (
        <Text style={{ ...mutedStyle(c), fontSize: '13px', margin: '0 0 4px' }}>{romanization}</Text>
      )}
      <Text style={{ ...mutedStyle(c), fontStyle: 'italic', margin: '0 0 10px' }}>{partOfSpeech}</Text>
      <Text style={{ ...bodyStyle(c), fontWeight: 500, margin: '0 0 14px' }}>{translation}</Text>
      <Text style={{ ...mutedStyle(c), fontFamily: SERIF_STACK, fontStyle: 'italic', margin: '0 0 14px' }}>{memoryTip}</Text>
      <Text style={{ ...bodyStyle(c), fontWeight: 500, margin: '0 0 2px' }}>{exampleOriginal}</Text>
      <Text style={{ ...mutedStyle(c), margin: '0' }}>{exampleTranslation}</Text>
    </Section>
  );
}

function AffirmationSection({ data, c }: { data: Record<string, unknown>; c: EmailThemeColors }) {
  if (data?.error) return <SectionErrorFallback label="Affirmation" c={c} />;
  const { text, focus } = data as { text: string; focus: string };
  return (
    <Section>
      <Text style={kickerStyle(c)}>Daily Affirmation</Text>
      <div style={{ width: '52px', height: '1px', backgroundColor: c.border, margin: '0 0 16px' }} aria-hidden="true" />
      <Text style={{
        color: c.text,
        fontFamily: SERIF_STACK,
        fontSize: '22px',
        fontStyle: 'italic',
        lineHeight: '1.5',
        margin: '0 0 16px',
      }}>{text}</Text>
      <Text style={{ ...smallcapStyle(c), margin: '0' }}>{focus}</Text>
    </Section>
  );
}

function AiTechSection({ data, c }: { data: Record<string, unknown>; c: EmailThemeColors }) {
  if (data?.error) return <SectionErrorFallback label="AI & Tech" c={c} />;
  const stories = (data.stories as AiTechStory[] | undefined) ?? [];
  if (stories.length === 0) return <SectionErrorFallback label="AI & Tech" c={c} />;
  return (
    <Section>
      <Text style={kickerStyle(c)}>AI &amp; Tech</Text>
      {stories.map((story, i) => (
        <Section key={i} style={{
          marginBottom: i < stories.length - 1 ? '20px' : '0',
          paddingBottom: i < stories.length - 1 ? '20px' : '0',
          borderBottom: i < stories.length - 1 ? `1px solid ${c.border}` : 'none',
        }}>
          <Text style={{ ...smallcapStyle(c), margin: '0 0 4px' }}>{story.source}</Text>
          <Text style={{ ...bodyStyle(c), fontSize: '17px', fontWeight: 600, lineHeight: '1.35', margin: '0 0 6px' }}>{story.headline}</Text>
          <Text style={{ ...bodyStyle(c), color: c.muted, margin: '0' }}>{story.summary}</Text>
        </Section>
      ))}
    </Section>
  );
}

function LocalEventsSection({ data, c }: { data: Record<string, unknown>; c: EmailThemeColors }) {
  if (data?.error) return <SectionErrorFallback label="Local Events" c={c} />;
  const { city, events: eventsRaw } = data as { city?: string; events?: LocalEvent[] };
  const events = eventsRaw ?? [];
  if (!city || events.length === 0) return <SectionErrorFallback label="Local Events" c={c} />;
  return (
    <Section>
      <Text style={kickerStyle(c)}>Local Events · {city}</Text>
      {events.map((ev, i) => (
        <Section key={i} style={{
          marginBottom: i < events.length - 1 ? '18px' : '0',
          paddingBottom: i < events.length - 1 ? '18px' : '0',
          borderBottom: i < events.length - 1 ? `1px solid ${c.border}` : 'none',
        }}>
          <Text style={{ ...smallcapStyle(c), margin: '0 0 4px' }}>{ev.datetime} · {ev.venue}</Text>
          <Text style={{ ...bodyStyle(c), fontSize: '17px', fontWeight: 600, lineHeight: '1.35', margin: '0 0 4px' }}>{ev.name}</Text>
          <Text style={{ ...bodyStyle(c), color: c.muted, fontSize: '14px', margin: '0 0 6px' }}>{ev.description}</Text>
          <Text style={{ ...mutedStyle(c), margin: '0', fontSize: '12px' }}>
            {ev.price}
            {ev.url && <> &nbsp;·&nbsp; <Link href={ev.url} style={{ color: c.accent, textDecoration: 'none' }}>Tickets →</Link></>}
          </Text>
        </Section>
      ))}
    </Section>
  );
}

function WeekHistorySection({ data, c }: { data: Record<string, unknown>; c: EmailThemeColors }) {
  if (data?.error) return <SectionErrorFallback label="This Week in History" c={c} />;
  const events = (data.events as WeekHistoryEvent[] | undefined) ?? [];
  if (events.length === 0) return <SectionErrorFallback label="This Week in History" c={c} />;
  return (
    <Section>
      <Text style={kickerStyle(c)}>This Week in History</Text>
      {events.map((ev, i) => (
        <Section key={i} style={{
          marginBottom: i < events.length - 1 ? '24px' : '0',
          paddingBottom: i < events.length - 1 ? '24px' : '0',
          borderBottom: i < events.length - 1 ? `1px solid ${c.border}` : 'none',
        }}>
          <Text style={{
            color: c.muted,
            fontFamily: SERIF_STACK,
            fontSize: '40px',
            fontWeight: 300,
            margin: '0',
            lineHeight: '1',
            opacity: 0.55,
          }}>{ev.year}</Text>
          <Text style={{ ...bodyStyle(c), fontFamily: SERIF_STACK, fontSize: '20px', fontStyle: 'italic', margin: '8px 0 8px' }}>{ev.title}</Text>
          <Text style={{ ...bodyStyle(c), color: c.muted, margin: '0' }}>{ev.context}</Text>
        </Section>
      ))}
    </Section>
  );
}

function ChallengeSection({ data, c }: { data: Record<string, unknown>; c: EmailThemeColors }) {
  if (data?.error) return <SectionErrorFallback label="Daily Challenge" c={c} />;
  const { type, title, description, whyItMatters } = data as {
    type: string; title: string; description: string; whyItMatters: string;
  };
  return (
    <Section>
      <Text style={kickerStyle(c)}>Daily Challenge</Text>
      <Text style={{ ...smallcapStyle(c), margin: '0 0 6px' }}>{type}</Text>
      <Text style={{
        color: c.text,
        fontFamily: SERIF_STACK,
        fontSize: '24px',
        fontStyle: 'italic',
        margin: '0 0 10px',
        lineHeight: '1.25',
      }}>{title}</Text>
      <Text style={{ ...bodyStyle(c), margin: '0 0 10px' }}>{description}</Text>
      <Text style={{ ...mutedStyle(c), fontFamily: SERIF_STACK, fontStyle: 'italic', margin: '0' }}>Why this matters: {whyItMatters}</Text>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

export default function DailyBriefEmail({
  userName, date, sections, unsubscribeToken, theme, showUpgradeCta, mailingAddress, contextLine,
}: DailyBriefEmailProps) {
  const firstName = userName.split(' ')[0];
  const { colors: c } = getTheme(theme ?? 'light');

  // Pure white background, no card. The container holds the editorial column.
  const bodyStyles: React.CSSProperties = {
    backgroundColor: c.containerBg,
    fontFamily: SANS_STACK,
    margin: '0',
    padding: '0',
    color: c.text,
  };
  const containerStyles: React.CSSProperties = {
    backgroundColor: c.containerBg,
    margin: '0 auto',
    maxWidth: '600px',
    padding: '48px 32px 56px',
  };

  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light only" />
      </Head>
      <Preview>Your daily brief for {date}</Preview>
      <Body style={bodyStyles}>
        <Container style={containerStyles}>
          {/* Masthead */}
          <Section style={{ paddingBottom: '4px' }}>
            <Text style={{ ...kickerStyle(c), margin: '0 0 12px' }}>Daily Brief</Text>
            <Heading as="h1" style={serifHeadlineStyle(c)}>
              Good morning, {firstName}.
            </Heading>
            <Text style={{ ...mutedStyle(c), margin: '10px 0 0', fontSize: '13px' }}>{date}</Text>
            {contextLine && (
              <Text style={{
                ...mutedStyle(c),
                margin: '4px 0 0',
                fontSize: '13px',
              }}>
                {contextLine}
              </Text>
            )}
          </Section>

          <DotDivider c={c} />

          {sections.map((section, i) => (
            <div key={i}>
              {section.type === 'weather' && <WeatherSection data={section.data} c={c} />}
              {section.type === 'news' && <NewsSection data={section.data} c={c} />}
              {section.type === 'quote' && <QuoteSection data={section.data} c={c} />}
              {section.type === 'markets' && <MarketsSection data={section.data} c={c} />}
              {section.type === 'sports' && <SportsSection data={section.data} c={c} />}
              {section.type === 'word_of_day' && <WordOfDaySection data={section.data} c={c} />}
              {section.type === 'workout' && <WorkoutSection data={section.data} c={c} />}
              {section.type === 'mindfulness' && <MindfulnessSection data={section.data} c={c} />}
              {section.type === 'on_this_day' && <OnThisDaySection data={section.data} c={c} />}
              {section.type === 'currency' && <CurrencySection data={section.data} c={c} />}
              {section.type === 'podcast' && <PodcastSection data={section.data} c={c} />}
              {section.type === 'fact' && <FactSection data={section.data} c={c} />}
              {section.type === 'recipe' && <RecipeSection data={section.data} c={c} />}
              {section.type === 'book' && <BookSection data={section.data} c={c} />}
              {section.type === 'reddit' && <RedditSection data={section.data} c={c} />}
              {section.type === 'horoscope' && <HoroscopeSection data={section.data} c={c} />}
              {section.type === 'language' && <LanguageSection data={section.data} c={c} />}
              {section.type === 'affirmation' && <AffirmationSection data={section.data} c={c} />}
              {section.type === 'ai_tech' && <AiTechSection data={section.data} c={c} />}
              {section.type === 'local_events' && <LocalEventsSection data={section.data} c={c} />}
              {section.type === 'week_history' && <WeekHistorySection data={section.data} c={c} />}
              {section.type === 'challenge' && <ChallengeSection data={section.data} c={c} />}
              {i < sections.length - 1 && <DotDivider c={c} />}
            </div>
          ))}

          <DotDivider c={c} />

          {showUpgradeCta && (
            <>
              <Section style={{ textAlign: 'center', padding: '8px 0 16px' }}>
                <Text style={{ ...mutedStyle(c), fontFamily: SERIF_STACK, fontStyle: 'italic', fontSize: '15px', margin: '0 0 14px' }}>
                  You are on the free plan.
                </Text>
                <Link
                  href="https://dailybriefmail.com/dashboard/upgrade"
                  style={{
                    display: 'inline-block',
                    backgroundColor: c.accent,
                    color: '#ffffff',
                    borderRadius: '999px',
                    padding: '10px 22px',
                    fontFamily: SANS_STACK,
                    fontSize: '13px',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                    textDecoration: 'none',
                  }}
                >
                  Unlock all 22 modules
                </Link>
              </Section>
              <DotDivider c={c} />
            </>
          )}

          {/* Footer — fine-print pulled tight to the sign-off so it reads as
              an attached coda rather than a separate section. */}
          <Section style={{ paddingTop: '0' }}>
            <Text style={{
              ...bodyStyle(c),
              fontFamily: SERIF_STACK,
              fontStyle: 'italic',
              fontSize: '15px',
              color: c.muted,
              textAlign: 'center',
              margin: '0 0 8px',
            }}>
              Thanks for reading. Until tomorrow.
            </Text>
            {/* Sits above the legal row in plain sans, slightly larger than
                the all-caps utility links, so the invitation-to-customize
                feels like an editorial sign-off rather than a fine-print link. */}
            <Text style={{
              color: c.text,
              fontFamily: SANS_STACK,
              fontSize: '13px',
              textAlign: 'center',
              margin: '0 0 10px',
            }}>
              <Link href="https://dailybriefmail.com/dashboard" style={{
                color: c.text,
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
              }}>
                Edit your brief
              </Link>
            </Text>
            <Text style={{
              ...mutedStyle(c),
              textAlign: 'center',
              fontSize: '11px',
              fontFamily: MONO_STACK,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              margin: '0',
            }}>
              <Link href={`https://dailybriefmail.com/unsubscribe?token=${unsubscribeToken}`} style={{ color: c.muted, textDecoration: 'underline' }}>
                Unsubscribe
              </Link>
              {' '}·{' '}
              <Link href="https://dailybriefmail.com/privacy" style={{ color: c.muted, textDecoration: 'underline' }}>
                Privacy
              </Link>
              {' '}·{' '}
              <Link href="https://dailybriefmail.com/terms" style={{ color: c.muted, textDecoration: 'underline' }}>
                Terms
              </Link>
            </Text>
            {/* CAN-SPAM: physical mailing address is required. Rendered small
                and muted. Sits between the legal links and the bottom edge,
                close enough that everything below the sign-off reads as one
                attached block of fine print. */}
            <Text style={{
              color: c.muted,
              fontFamily: SANS_STACK,
              fontSize: '11px',
              lineHeight: '1.6',
              letterSpacing: '0.02em',
              textAlign: 'center',
              margin: '6px 0 0',
              opacity: 0.85,
            }}>
              Daily Brief Mail · {mailingAddress}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
