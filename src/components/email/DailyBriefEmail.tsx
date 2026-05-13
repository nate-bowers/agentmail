import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import { getTheme, type EmailThemeColors } from '@/lib/email/themes';

// ─────────────────────────────────────────────────────────────
// Section data shapes
// ─────────────────────────────────────────────────────────────

interface WeatherLocation {
  name: string; tempF: number; condition: string; humidity: string; high: number; low: number;
}
interface NewsArticle { headline: string; source: string; summary: string; }
interface MarketSymbol { symbol: string; price: string; change: string; changePercent: string; direction: 'up' | 'down'; }
interface SportsResult { team: string; opponent: string; score: string; result: 'win' | 'loss' | 'draw'; nextGame?: string; }
interface WorkoutExercise { exercise: string; sets?: string; reps?: string; duration?: string; }
interface CurrencyRate { target: string; rate: string; direction: 'up' | 'down' | 'flat'; change?: string; }
interface PodcastData { showName: string; episodeTitle: string; length: string; guest?: string; description: string; url?: string; }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SectionData = { type: string; data: Record<string, any> };

export interface DailyBriefEmailProps {
  userName: string;
  date: string;
  intro?: string;
  sections: SectionData[];
  unsubscribeToken: string;
  theme?: string;
}

// ─────────────────────────────────────────────────────────────
// Error fallback
// ─────────────────────────────────────────────────────────────

function SectionErrorFallback({ label, c }: { label: string; c: EmailThemeColors }) {
  return (
    <Section>
      <Text style={{ color: c.muted, fontStyle: 'italic', margin: '0', fontSize: '14px' }}>
        {label} data is unavailable today.
      </Text>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────
// Section renderers
// ─────────────────────────────────────────────────────────────

function WeatherSection({ data, c }: { data: Record<string, unknown>; c: EmailThemeColors }) {
  if (data?.error) return <SectionErrorFallback label="Weather" c={c} />;
  const locations = data.locations as WeatherLocation[];
  return (
    <Section>
      <Heading as="h2" style={headingStyle(c)}>☀️ Weather</Heading>
      {locations.map((loc) => (
        <Section key={loc.name} style={{ marginBottom: '12px' }}>
          <Text style={{ ...bodyStyle(c), fontWeight: '600', marginBottom: '2px' }}>{loc.name}</Text>
          <Text style={{ ...bodyStyle(c), fontSize: '28px', fontWeight: '300', margin: '0 0 4px' }}>
            {loc.tempF}° &nbsp;<span style={{ fontSize: '16px', color: c.muted }}>{loc.condition}</span>
          </Text>
          <Text style={{ ...mutedStyle(c), margin: '0' }}>H: {loc.high}° &nbsp;·&nbsp; L: {loc.low}° &nbsp;·&nbsp; Humidity: {loc.humidity}</Text>
        </Section>
      ))}
    </Section>
  );
}

function NewsSection({ data, c }: { data: Record<string, unknown>; c: EmailThemeColors }) {
  if (data?.error) return <SectionErrorFallback label="News" c={c} />;
  const articles = data.articles as NewsArticle[];
  const compact = articles.length >= 10;
  return (
    <Section>
      <Heading as="h2" style={headingStyle(c)}>📰 News</Heading>
      {articles.map((article, i) => (
        compact ? (
          <Section key={i} style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: `1px solid ${c.border}` }}>
            <Text style={{ ...bodyStyle(c), fontWeight: '600', margin: '0 0 1px' }}>{article.headline}</Text>
            <Text style={{ ...mutedStyle(c), margin: '0' }}>{article.source} — {article.summary}</Text>
          </Section>
        ) : (
          <Section key={i} style={{ marginBottom: '16px' }}>
            <Text style={{ ...bodyStyle(c), fontWeight: '600', marginBottom: '2px' }}>{article.headline}</Text>
            <Text style={{ ...mutedStyle(c), marginBottom: '4px' }}>{article.source}</Text>
            <Text style={{ ...bodyStyle(c), color: c.muted, margin: '0' }}>{article.summary}</Text>
          </Section>
        )
      ))}
    </Section>
  );
}

function QuoteSection({ data, c }: { data: Record<string, unknown>; c: EmailThemeColors }) {
  if (data?.error) return <SectionErrorFallback label="Quote" c={c} />;
  const { text, author } = data as { text: string; author: string };
  return (
    <Section>
      <Heading as="h2" style={headingStyle(c)}>💬 Quote</Heading>
      <Section style={{ borderLeft: `3px solid ${c.border}`, paddingLeft: '16px', margin: '8px 0' }}>
        <Text style={{ ...bodyStyle(c), fontSize: '17px', fontStyle: 'italic', margin: '0 0 8px' }}>
          &ldquo;{text}&rdquo;
        </Text>
        <Text style={{ ...mutedStyle(c), margin: '0' }}>— {author}</Text>
      </Section>
    </Section>
  );
}

function MarketsSection({ data, c }: { data: Record<string, unknown>; c: EmailThemeColors }) {
  if (data?.error) return <SectionErrorFallback label="Markets" c={c} />;
  const symbols = data.symbols as MarketSymbol[];
  return (
    <Section>
      <Heading as="h2" style={headingStyle(c)}>📈 Markets</Heading>
      {symbols.map((s) => (
        <Section key={s.symbol} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <Text style={{ ...bodyStyle(c), fontWeight: '600', margin: '0', display: 'inline' }}>{s.symbol}</Text>
          <Text style={{ ...bodyStyle(c), margin: '0 0 0 12px', display: 'inline' }}>{s.price}</Text>
          <Text style={{ ...bodyStyle(c), margin: '0 0 0 12px', display: 'inline', color: s.direction === 'up' ? c.positive : c.negative, fontWeight: '500' }}>
            {s.direction === 'up' ? '▲' : '▼'} {s.changePercent} ({s.change})
          </Text>
        </Section>
      ))}
    </Section>
  );
}

function SportsSection({ data, c }: { data: Record<string, unknown>; c: EmailThemeColors }) {
  if (data?.error) return <SectionErrorFallback label="Sports" c={c} />;
  const { results, standingsNote } = data as { results: SportsResult[]; standingsNote?: string };
  return (
    <Section>
      <Heading as="h2" style={headingStyle(c)}>🏆 Sports Scores</Heading>
      {results.map((r, i) => (
        <Section key={i} style={{ marginBottom: '14px' }}>
          <Text style={{ ...bodyStyle(c), fontWeight: '700', margin: '0 0 2px' }}>{r.team}</Text>
          <Text style={{ ...bodyStyle(c), fontSize: '20px', fontWeight: '300', margin: '0 0 2px' }}>
            {r.score}
            <span style={{ fontSize: '13px', color: r.result === 'win' ? c.positive : r.result === 'loss' ? c.negative : c.muted, marginLeft: '8px', fontWeight: '500' }}>
              {r.result.toUpperCase()}
            </span>
          </Text>
          <Text style={{ ...mutedStyle(c), margin: '0' }}>vs {r.opponent}{r.nextGame ? ` · Next: ${r.nextGame}` : ''}</Text>
        </Section>
      ))}
      {standingsNote && (
        <Text style={{ ...mutedStyle(c), fontStyle: 'italic', marginTop: '4px' }}>{standingsNote}</Text>
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
      <Heading as="h2" style={headingStyle(c)}>📖 Word of the Day</Heading>
      <Text style={{ ...bodyStyle(c), fontSize: '26px', fontWeight: '700', fontFamily: 'Georgia, serif', margin: '0 0 2px' }}>
        {word}
        <span style={{ fontSize: '14px', fontWeight: '400', fontStyle: 'italic', color: c.muted, marginLeft: '10px', fontFamily: 'inherit' }}>
          {partOfSpeech}
        </span>
      </Text>
      <Text style={{ ...bodyStyle(c), margin: '8px 0' }}>{definition}</Text>
      <Text style={{ ...mutedStyle(c), fontStyle: 'italic', margin: '4px 0' }}>Origin: {etymology}</Text>
      <Section style={{ backgroundColor: c.border, borderRadius: '6px', padding: '12px 16px', margin: '8px 0 0' }}>
        <Text style={{ ...bodyStyle(c), fontStyle: 'italic', color: c.muted, margin: '0' }}>&ldquo;{exampleSentence}&rdquo;</Text>
      </Section>
    </Section>
  );
}

function WorkoutSection({ data, c }: { data: Record<string, unknown>; c: EmailThemeColors }) {
  if (data?.error) return <SectionErrorFallback label="Workout" c={c} />;
  const { intro, warmup, circuit, cooldown } = data as {
    intro: string;
    warmup: { exercise: string; duration: string }[];
    circuit: WorkoutExercise[];
    cooldown: string;
  };
  return (
    <Section>
      <Heading as="h2" style={headingStyle(c)}>🏋️ Daily Workout</Heading>
      <Text style={{ ...bodyStyle(c), fontStyle: 'italic', color: c.muted, margin: '0 0 12px' }}>{intro}</Text>
      <Text style={{ ...bodyStyle(c), fontWeight: '600', fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 6px' }}>Warm-Up</Text>
      {warmup.map((ex, i) => (
        <Text key={i} style={{ ...bodyStyle(c), margin: '0 0 4px', paddingLeft: '12px' }}>· {ex.exercise} — {ex.duration}</Text>
      ))}
      <Text style={{ ...bodyStyle(c), fontWeight: '600', fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '12px 0 6px' }}>Circuit</Text>
      {circuit.map((ex, i) => {
        const detail = [ex.sets && ex.reps ? `${ex.sets} × ${ex.reps}` : null, ex.duration].filter(Boolean).join(' · ');
        return (
          <Text key={i} style={{ ...bodyStyle(c), margin: '0 0 4px', paddingLeft: '12px' }}>· {ex.exercise}{detail ? ` — ${detail}` : ''}</Text>
        );
      })}
      <Text style={{ ...mutedStyle(c), fontStyle: 'italic', marginTop: '10px' }}>Cool-down: {cooldown}</Text>
    </Section>
  );
}

function MindfulnessSection({ data, c }: { data: Record<string, unknown>; c: EmailThemeColors }) {
  if (data?.error) return <SectionErrorFallback label="Mindfulness" c={c} />;
  const { prompt, style } = data as { prompt: string; style: string };
  return (
    <Section>
      <Heading as="h2" style={headingStyle(c)}>🧘 Mindfulness</Heading>
      <Section style={{ borderLeft: `4px solid ${c.accent}`, paddingLeft: '16px', margin: '8px 0' }}>
        <Text style={{ ...bodyStyle(c), fontSize: '17px', fontStyle: 'italic', margin: '0 0 8px' }}>{prompt}</Text>
        <Text style={{ ...mutedStyle(c), fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0' }}>
          Daily {style}
        </Text>
      </Section>
    </Section>
  );
}

function OnThisDaySection({ data, c }: { data: Record<string, unknown>; c: EmailThemeColors }) {
  if (data?.error) return <SectionErrorFallback label="On This Day" c={c} />;
  const { year, title, context } = data as { year: string; title: string; context: string };
  return (
    <Section>
      <Heading as="h2" style={headingStyle(c)}>📅 On This Day in History</Heading>
      <Text style={{ ...bodyStyle(c), fontSize: '32px', fontWeight: '700', color: c.muted, margin: '0 0 4px', lineHeight: '1.1' }}>{year}</Text>
      <Text style={{ ...bodyStyle(c), fontWeight: '600', margin: '0 0 8px' }}>{title}</Text>
      <Text style={{ ...bodyStyle(c), color: c.muted, margin: '0' }}>{context}</Text>
    </Section>
  );
}

function CurrencySection({ data, c }: { data: Record<string, unknown>; c: EmailThemeColors }) {
  if (data?.error) return <SectionErrorFallback label="Currency" c={c} />;
  const { base, rates } = data as { base: string; rates: CurrencyRate[] };
  return (
    <Section>
      <Heading as="h2" style={headingStyle(c)}>💱 Currency Rates</Heading>
      {rates.map((r) => (
        <Section key={r.target} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <Text style={{ ...mutedStyle(c), margin: '0', display: 'inline' }}>1 {base} =</Text>
          <Text style={{ ...bodyStyle(c), fontWeight: '600', margin: '0 0 0 8px', display: 'inline' }}>{r.rate} {r.target}</Text>
          <Text style={{ ...mutedStyle(c), margin: '0 0 0 8px', display: 'inline', color: r.direction === 'up' ? c.positive : r.direction === 'down' ? c.negative : c.muted }}>
            {r.direction === 'up' ? '▲' : r.direction === 'down' ? '▼' : '–'}
            {r.change ? ` ${r.change}` : ''}
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
      <Heading as="h2" style={headingStyle(c)}>🎙️ Podcast Pick</Heading>
      <Text style={{ ...mutedStyle(c), margin: '0 0 2px' }}>{d.showName}</Text>
      <Text style={{ ...bodyStyle(c), fontWeight: '600', margin: '0 0 4px' }}>{d.episodeTitle}</Text>
      <Text style={{ ...mutedStyle(c), margin: '0 0 8px' }}>
        {d.length}{d.guest ? ` · with ${d.guest}` : ''}
      </Text>
      <Text style={{ ...bodyStyle(c), margin: '0 0 8px' }}>{d.description}</Text>
      {d.url && (
        <Link href={d.url} style={{ color: c.accent, fontSize: '14px' }}>Listen now →</Link>
      )}
    </Section>
  );
}

function FactSection({ data, c }: { data: Record<string, unknown>; c: EmailThemeColors }) {
  if (data?.error) return <SectionErrorFallback label="Fact" c={c} />;
  const { fact, explanation } = data as { fact: string; explanation: string; category: string };
  return (
    <Section style={{ textAlign: 'center' }}>
      <Heading as="h2" style={headingStyle(c)}>💡 Interesting Fact</Heading>
      <Text style={{ ...bodyStyle(c), fontSize: '16px', fontWeight: '500', margin: '0 0 8px' }}>💡 {fact}</Text>
      <Text style={{ ...mutedStyle(c), margin: '0' }}>{explanation}</Text>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

const fontStack = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", Roboto, Helvetica, Arial, sans-serif';

function headingStyle(c: EmailThemeColors): React.CSSProperties {
  return { color: c.text, fontSize: '13px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 12px' };
}
function bodyStyle(c: EmailThemeColors): React.CSSProperties {
  return { color: c.text, fontSize: '15px', lineHeight: '1.6', margin: '0 0 8px' };
}
function mutedStyle(c: EmailThemeColors): React.CSSProperties {
  return { color: c.muted, fontSize: '13px', lineHeight: '1.5', margin: '0 0 4px' };
}

export default function DailyBriefEmail({
  userName, date, intro, sections, unsubscribeToken, theme,
}: DailyBriefEmailProps) {
  const firstName = userName.split(' ')[0];
  const { colors: c } = getTheme(theme ?? 'light');

  const bodyStyles: React.CSSProperties = {
    backgroundColor: c.bg, fontFamily: fontStack, margin: '0', padding: '0',
  };
  const containerStyles: React.CSSProperties = {
    backgroundColor: c.containerBg, borderRadius: '8px', margin: '32px auto',
    maxWidth: '600px', padding: '40px 48px',
  };
  const dividerStyle: React.CSSProperties = { borderColor: c.border, margin: '24px 0' };

  return (
    <Html lang="en">
      <Head />
      <Preview>Your daily brief for {date}</Preview>
      <Body style={bodyStyles}>
        <Container style={containerStyles}>
          <Section style={{ paddingBottom: '8px' }}>
            <Heading as="h1" style={{ color: c.text, fontSize: '24px', fontWeight: '600', margin: '0 0 4px' }}>
              Good morning, {firstName}.
            </Heading>
            <Text style={{ ...mutedStyle(c), margin: '0' }}>{date}</Text>
          </Section>

          {intro && (
            <>
              <Hr style={dividerStyle} />
              <Section>
                <Text style={{ ...bodyStyle(c), fontStyle: 'italic', margin: '0' }}>{intro}</Text>
              </Section>
            </>
          )}

          <Hr style={dividerStyle} />

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
              {i < sections.length - 1 && <Hr style={dividerStyle} />}
            </div>
          ))}

          <Hr style={dividerStyle} />

          <Section style={{ paddingTop: '4px' }}>
            <Text style={{ ...mutedStyle(c), textAlign: 'center' }}>
              You&rsquo;re receiving this because you set up a daily brief.{' '}
              <Link href={`https://dailybriefmail.com/unsubscribe?token=${unsubscribeToken}`} style={{ color: c.muted, textDecoration: 'underline' }}>
                Unsubscribe
              </Link>
              {' '}·{' '}
              <Link href="https://dailybriefmail.com/privacy" style={{ color: c.muted, textDecoration: 'underline' }}>
                Privacy Policy
              </Link>
              {' '}·{' '}
              <Link href="https://dailybriefmail.com/terms" style={{ color: c.muted, textDecoration: 'underline' }}>
                Terms of Service
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
