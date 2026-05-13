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

type SectionData =
  | { type: 'weather'; data: { locations: WeatherLocation[] } }
  | { type: 'news'; data: { articles: NewsArticle[] } }
  | { type: 'quote'; data: { text: string; author: string } }
  | { type: 'markets'; data: { symbols: MarketSymbol[] } }
  | { type: 'sports'; data: { results: SportsResult[]; standingsNote?: string } }
  | { type: 'word_of_day'; data: { word: string; partOfSpeech: string; definition: string; etymology: string; exampleSentence: string } }
  | { type: 'workout'; data: { intro: string; warmup: { exercise: string; duration: string }[]; circuit: WorkoutExercise[]; cooldown: string } }
  | { type: 'mindfulness'; data: { prompt: string; style: string } }
  | { type: 'on_this_day'; data: { year: string; title: string; context: string } }
  | { type: 'currency'; data: { base: string; rates: CurrencyRate[] } }
  | { type: 'podcast'; data: PodcastData }
  | { type: 'fact'; data: { fact: string; explanation: string; category: string } };

export interface DailyBriefEmailProps {
  userName: string;
  date: string;
  sections: SectionData[];
  unsubscribeToken: string;
}

// ─────────────────────────────────────────────────────────────
// Section renderers — original four
// ─────────────────────────────────────────────────────────────

function WeatherSection({ data }: { data: { locations: WeatherLocation[] } }) {
  return (
    <Section>
      <Heading as="h2" style={sectionHeading}>☀️ Weather</Heading>
      {data.locations.map((loc) => (
        <Section key={loc.name} style={{ marginBottom: '12px' }}>
          <Text style={{ ...bodyText, fontWeight: '600', marginBottom: '2px' }}>{loc.name}</Text>
          <Text style={{ ...bodyText, fontSize: '28px', fontWeight: '300', margin: '0 0 4px' }}>
            {loc.tempF}°F &nbsp;<span style={{ fontSize: '16px', color: colors.muted }}>{loc.condition}</span>
          </Text>
          <Text style={{ ...metaText, margin: '0' }}>H: {loc.high}° &nbsp;·&nbsp; L: {loc.low}° &nbsp;·&nbsp; Humidity: {loc.humidity}</Text>
        </Section>
      ))}
    </Section>
  );
}

function NewsSection({ data }: { data: { articles: NewsArticle[] } }) {
  return (
    <Section>
      <Heading as="h2" style={sectionHeading}>📰 News</Heading>
      {data.articles.map((article, i) => (
        <Section key={i} style={{ marginBottom: '16px' }}>
          <Text style={{ ...bodyText, fontWeight: '600', marginBottom: '2px' }}>{article.headline}</Text>
          <Text style={{ ...metaText, marginBottom: '4px' }}>{article.source}</Text>
          <Text style={{ ...bodyText, color: colors.muted, margin: '0' }}>{article.summary}</Text>
        </Section>
      ))}
    </Section>
  );
}

function QuoteSection({ data }: { data: { text: string; author: string } }) {
  return (
    <Section>
      <Heading as="h2" style={sectionHeading}>💬 Quote</Heading>
      <Section style={{ borderLeft: `3px solid ${colors.border}`, paddingLeft: '16px', margin: '8px 0' }}>
        <Text style={{ ...bodyText, fontSize: '17px', fontStyle: 'italic', color: colors.text, margin: '0 0 8px' }}>
          &ldquo;{data.text}&rdquo;
        </Text>
        <Text style={{ ...metaText, margin: '0' }}>— {data.author}</Text>
      </Section>
    </Section>
  );
}

function MarketsSection({ data }: { data: { symbols: MarketSymbol[] } }) {
  return (
    <Section>
      <Heading as="h2" style={sectionHeading}>📈 Markets</Heading>
      {data.symbols.map((s) => (
        <Section key={s.symbol} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <Text style={{ ...bodyText, fontWeight: '600', margin: '0', display: 'inline' }}>{s.symbol}</Text>
          <Text style={{ ...bodyText, margin: '0 0 0 12px', display: 'inline' }}>{s.price}</Text>
          <Text style={{ ...bodyText, margin: '0 0 0 12px', display: 'inline', color: s.direction === 'up' ? colors.positive : colors.negative, fontWeight: '500' }}>
            {s.direction === 'up' ? '▲' : '▼'} {s.changePercent} ({s.change})
          </Text>
        </Section>
      ))}
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────
// Section renderers — new eight
// ─────────────────────────────────────────────────────────────

function SportsSection({ data }: { data: { results: SportsResult[]; standingsNote?: string } }) {
  return (
    <Section>
      <Heading as="h2" style={sectionHeading}>🏆 Sports Scores</Heading>
      {data.results.map((r, i) => (
        <Section key={i} style={{ marginBottom: '14px' }}>
          <Text style={{ ...bodyText, fontWeight: '700', margin: '0 0 2px' }}>{r.team}</Text>
          <Text style={{ ...bodyText, fontSize: '20px', fontWeight: '300', margin: '0 0 2px' }}>
            {r.score}
            <span style={{ fontSize: '13px', color: r.result === 'win' ? colors.positive : r.result === 'loss' ? colors.negative : colors.muted, marginLeft: '8px', fontWeight: '500' }}>
              {r.result.toUpperCase()}
            </span>
          </Text>
          <Text style={{ ...metaText, margin: '0' }}>vs {r.opponent}{r.nextGame ? ` · Next: ${r.nextGame}` : ''}</Text>
        </Section>
      ))}
      {data.standingsNote && (
        <Text style={{ ...metaText, fontStyle: 'italic', marginTop: '4px' }}>{data.standingsNote}</Text>
      )}
    </Section>
  );
}

function WordOfDaySection({ data }: { data: { word: string; partOfSpeech: string; definition: string; etymology: string; exampleSentence: string } }) {
  return (
    <Section>
      <Heading as="h2" style={sectionHeading}>📖 Word of the Day</Heading>
      <Text style={{ ...bodyText, fontSize: '26px', fontWeight: '700', fontFamily: 'Georgia, serif', margin: '0 0 2px' }}>
        {data.word}
        <span style={{ fontSize: '14px', fontWeight: '400', fontStyle: 'italic', color: colors.muted, marginLeft: '10px', fontFamily: 'inherit' }}>
          {data.partOfSpeech}
        </span>
      </Text>
      <Text style={{ ...bodyText, margin: '8px 0' }}>{data.definition}</Text>
      <Text style={{ ...metaText, fontStyle: 'italic', margin: '4px 0' }}>Origin: {data.etymology}</Text>
      <Section style={{ backgroundColor: '#f9fafb', borderRadius: '6px', padding: '12px 16px', margin: '8px 0 0' }}>
        <Text style={{ ...bodyText, fontStyle: 'italic', color: colors.muted, margin: '0' }}>&ldquo;{data.exampleSentence}&rdquo;</Text>
      </Section>
    </Section>
  );
}

function WorkoutSection({ data }: { data: { intro: string; warmup: { exercise: string; duration: string }[]; circuit: WorkoutExercise[]; cooldown: string } }) {
  return (
    <Section>
      <Heading as="h2" style={sectionHeading}>🏋️ Daily Workout</Heading>
      <Text style={{ ...bodyText, fontStyle: 'italic', color: colors.muted, margin: '0 0 12px' }}>{data.intro}</Text>
      <Text style={{ ...bodyText, fontWeight: '600', fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 6px' }}>Warm-Up</Text>
      {data.warmup.map((ex, i) => (
        <Text key={i} style={{ ...bodyText, margin: '0 0 4px', paddingLeft: '12px' }}>· {ex.exercise} — {ex.duration}</Text>
      ))}
      <Text style={{ ...bodyText, fontWeight: '600', fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '12px 0 6px' }}>Circuit</Text>
      {data.circuit.map((ex, i) => {
        const detail = [ex.sets && ex.reps ? `${ex.sets} × ${ex.reps}` : null, ex.duration].filter(Boolean).join(' · ');
        return (
          <Text key={i} style={{ ...bodyText, margin: '0 0 4px', paddingLeft: '12px' }}>· {ex.exercise}{detail ? ` — ${detail}` : ''}</Text>
        );
      })}
      <Text style={{ ...metaText, fontStyle: 'italic', marginTop: '10px' }}>Cool-down: {data.cooldown}</Text>
    </Section>
  );
}

function MindfulnessSection({ data }: { data: { prompt: string; style: string } }) {
  return (
    <Section>
      <Heading as="h2" style={sectionHeading}>🧘 Mindfulness</Heading>
      <Section style={{ borderLeft: `4px solid #7C5CFC`, paddingLeft: '16px', margin: '8px 0' }}>
        <Text style={{ ...bodyText, fontSize: '17px', fontStyle: 'italic', margin: '0 0 8px' }}>{data.prompt}</Text>
        <Text style={{ ...metaText, fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0' }}>
          Daily {data.style}
        </Text>
      </Section>
    </Section>
  );
}

function OnThisDaySection({ data }: { data: { year: string; title: string; context: string } }) {
  return (
    <Section>
      <Heading as="h2" style={sectionHeading}>📅 On This Day in History</Heading>
      <Text style={{ ...bodyText, fontSize: '32px', fontWeight: '700', color: colors.muted, margin: '0 0 4px', lineHeight: '1.1' }}>{data.year}</Text>
      <Text style={{ ...bodyText, fontWeight: '600', margin: '0 0 8px' }}>{data.title}</Text>
      <Text style={{ ...bodyText, color: colors.muted, margin: '0' }}>{data.context}</Text>
    </Section>
  );
}

function CurrencySection({ data }: { data: { base: string; rates: CurrencyRate[] } }) {
  return (
    <Section>
      <Heading as="h2" style={sectionHeading}>💱 Currency Rates</Heading>
      {data.rates.map((r) => (
        <Section key={r.target} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <Text style={{ ...metaText, margin: '0', display: 'inline' }}>1 {data.base} =</Text>
          <Text style={{ ...bodyText, fontWeight: '600', margin: '0 0 0 8px', display: 'inline' }}>{r.rate} {r.target}</Text>
          <Text style={{ ...metaText, margin: '0 0 0 8px', display: 'inline', color: r.direction === 'up' ? colors.positive : r.direction === 'down' ? colors.negative : colors.muted }}>
            {r.direction === 'up' ? '▲' : r.direction === 'down' ? '▼' : '–'}
            {r.change ? ` ${r.change}` : ''}
          </Text>
        </Section>
      ))}
    </Section>
  );
}

function PodcastSection({ data }: { data: PodcastData }) {
  return (
    <Section>
      <Heading as="h2" style={sectionHeading}>🎙️ Podcast Pick</Heading>
      <Text style={{ ...metaText, margin: '0 0 2px' }}>{data.showName}</Text>
      <Text style={{ ...bodyText, fontWeight: '600', margin: '0 0 4px' }}>{data.episodeTitle}</Text>
      <Text style={{ ...metaText, margin: '0 0 8px' }}>
        {data.length}{data.guest ? ` · with ${data.guest}` : ''}
      </Text>
      <Text style={{ ...bodyText, margin: '0 0 8px' }}>{data.description}</Text>
      {data.url && (
        <Link href={data.url} style={{ color: '#7C5CFC', fontSize: '14px' }}>Listen now →</Link>
      )}
    </Section>
  );
}

function FactSection({ data }: { data: { fact: string; explanation: string; category: string } }) {
  return (
    <Section style={{ textAlign: 'center' }}>
      <Heading as="h2" style={sectionHeading}>💡 Interesting Fact</Heading>
      <Text style={{ ...bodyText, fontSize: '16px', fontWeight: '500', margin: '0 0 8px' }}>💡 {data.fact}</Text>
      <Text style={{ ...metaText, margin: '0' }}>{data.explanation}</Text>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

export default function DailyBriefEmail({ userName, date, sections, unsubscribeToken }: DailyBriefEmailProps) {
  const firstName = userName.split(' ')[0];

  return (
    <Html lang="en">
      <Head />
      <Preview>Your daily brief for {date}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={{ paddingBottom: '8px' }}>
            <Heading as="h1" style={headerTitle}>Good morning, {firstName}.</Heading>
            <Text style={{ ...metaText, margin: '0' }}>{date}</Text>
          </Section>

          <Hr style={divider} />

          {sections.map((section, i) => (
            <div key={i}>
              {section.type === 'weather' && <WeatherSection data={section.data as { locations: WeatherLocation[] }} />}
              {section.type === 'news' && <NewsSection data={section.data as { articles: NewsArticle[] }} />}
              {section.type === 'quote' && <QuoteSection data={section.data as { text: string; author: string }} />}
              {section.type === 'markets' && <MarketsSection data={section.data as { symbols: MarketSymbol[] }} />}
              {section.type === 'sports' && <SportsSection data={section.data as { results: SportsResult[]; standingsNote?: string }} />}
              {section.type === 'word_of_day' && <WordOfDaySection data={section.data as { word: string; partOfSpeech: string; definition: string; etymology: string; exampleSentence: string }} />}
              {section.type === 'workout' && <WorkoutSection data={section.data as { intro: string; warmup: { exercise: string; duration: string }[]; circuit: WorkoutExercise[]; cooldown: string }} />}
              {section.type === 'mindfulness' && <MindfulnessSection data={section.data as { prompt: string; style: string }} />}
              {section.type === 'on_this_day' && <OnThisDaySection data={section.data as { year: string; title: string; context: string }} />}
              {section.type === 'currency' && <CurrencySection data={section.data as { base: string; rates: CurrencyRate[] }} />}
              {section.type === 'podcast' && <PodcastSection data={section.data as PodcastData} />}
              {section.type === 'fact' && <FactSection data={section.data as { fact: string; explanation: string; category: string }} />}
              {i < sections.length - 1 && <Hr style={divider} />}
            </div>
          ))}

          <Hr style={divider} />

          <Section style={{ paddingTop: '4px' }}>
            <Text style={{ ...metaText, textAlign: 'center' }}>
              You&rsquo;re receiving this because you set up a daily brief.{' '}
              <Link href={`/unsubscribe?token=${unsubscribeToken}`} style={{ color: colors.muted, textDecoration: 'underline' }}>
                Unsubscribe
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const colors = {
  text: '#111827', muted: '#6b7280', border: '#e5e7eb',
  positive: '#16a34a', negative: '#dc2626', bg: '#ffffff',
};

const fontStack = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", Roboto, Helvetica, Arial, sans-serif';

const body: React.CSSProperties = { backgroundColor: '#f9fafb', fontFamily: fontStack, margin: '0', padding: '0' };
const container: React.CSSProperties = { backgroundColor: colors.bg, borderRadius: '8px', margin: '32px auto', maxWidth: '600px', padding: '40px 48px' };
const headerTitle: React.CSSProperties = { color: colors.text, fontSize: '24px', fontWeight: '600', margin: '0 0 4px' };
const sectionHeading: React.CSSProperties = { color: colors.text, fontSize: '13px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 12px' };
const bodyText: React.CSSProperties = { color: colors.text, fontSize: '15px', lineHeight: '1.6', margin: '0 0 8px' };
const metaText: React.CSSProperties = { color: colors.muted, fontSize: '13px', lineHeight: '1.5', margin: '0 0 4px' };
const divider: React.CSSProperties = { borderColor: colors.border, borderTopWidth: '1px', margin: '24px 0' };
