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
  name: string;
  tempF: number;
  condition: string;
  humidity: string;
  high: number;
  low: number;
}

interface NewsArticle {
  headline: string;
  source: string;
  summary: string;
}

interface MarketSymbol {
  symbol: string;
  price: string;
  change: string;
  changePercent: string;
  direction: 'up' | 'down';
}

type SectionData =
  | { type: 'weather'; data: { locations: WeatherLocation[] } }
  | { type: 'news'; data: { articles: NewsArticle[] } }
  | { type: 'quote'; data: { text: string; author: string } }
  | { type: 'markets'; data: { symbols: MarketSymbol[] } };

export interface DailyBriefEmailProps {
  userName: string;
  date: string;
  sections: SectionData[];
  unsubscribeToken: string;
}

// ─────────────────────────────────────────────────────────────
// Section renderers
// ─────────────────────────────────────────────────────────────

function WeatherSection({ data }: { data: { locations: WeatherLocation[] } }) {
  return (
    <Section>
      <Heading as="h2" style={sectionHeading}>
        Weather
      </Heading>
      {data.locations.map((loc) => (
        <Section key={loc.name} style={{ marginBottom: '12px' }}>
          <Text style={{ ...bodyText, fontWeight: '600', marginBottom: '2px' }}>
            {loc.name}
          </Text>
          <Text style={{ ...bodyText, fontSize: '28px', fontWeight: '300', margin: '0 0 4px' }}>
            {loc.tempF}°F &nbsp;
            <span style={{ fontSize: '16px', color: colors.muted }}>{loc.condition}</span>
          </Text>
          <Text style={{ ...metaText, margin: '0' }}>
            H: {loc.high}° &nbsp;·&nbsp; L: {loc.low}° &nbsp;·&nbsp; Humidity: {loc.humidity}
          </Text>
        </Section>
      ))}
    </Section>
  );
}

function NewsSection({ data }: { data: { articles: NewsArticle[] } }) {
  return (
    <Section>
      <Heading as="h2" style={sectionHeading}>
        News
      </Heading>
      {data.articles.map((article, i) => (
        <Section key={i} style={{ marginBottom: '16px' }}>
          <Text style={{ ...bodyText, fontWeight: '600', marginBottom: '2px' }}>
            {article.headline}
          </Text>
          <Text style={{ ...metaText, marginBottom: '4px' }}>{article.source}</Text>
          <Text style={{ ...bodyText, color: colors.muted, margin: '0' }}>
            {article.summary}
          </Text>
        </Section>
      ))}
    </Section>
  );
}

function QuoteSection({ data }: { data: { text: string; author: string } }) {
  return (
    <Section>
      <Heading as="h2" style={sectionHeading}>
        Quote
      </Heading>
      <Section
        style={{
          borderLeft: `3px solid ${colors.border}`,
          paddingLeft: '16px',
          margin: '8px 0',
        }}
      >
        <Text
          style={{
            ...bodyText,
            fontSize: '17px',
            fontStyle: 'italic',
            color: colors.text,
            margin: '0 0 8px',
          }}
        >
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
      <Heading as="h2" style={sectionHeading}>
        Markets
      </Heading>
      {data.symbols.map((s) => (
        <Section
          key={s.symbol}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '10px',
          }}
        >
          <Text style={{ ...bodyText, fontWeight: '600', margin: '0', display: 'inline' }}>
            {s.symbol}
          </Text>
          <Text style={{ ...bodyText, margin: '0 0 0 12px', display: 'inline' }}>
            {s.price}
          </Text>
          <Text
            style={{
              ...bodyText,
              margin: '0 0 0 12px',
              display: 'inline',
              color: s.direction === 'up' ? colors.positive : colors.negative,
              fontWeight: '500',
            }}
          >
            {s.direction === 'up' ? '▲' : '▼'} {s.changePercent} ({s.change})
          </Text>
        </Section>
      ))}
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

export default function DailyBriefEmail({
  userName,
  date,
  sections,
  unsubscribeToken,
}: DailyBriefEmailProps) {
  const firstName = userName.split(' ')[0];

  return (
    <Html lang="en">
      <Head />
      <Preview>Your daily brief for {date}</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <Section style={{ paddingBottom: '8px' }}>
            <Heading as="h1" style={headerTitle}>
              Good morning, {firstName}.
            </Heading>
            <Text style={{ ...metaText, margin: '0' }}>{date}</Text>
          </Section>

          <Hr style={divider} />

          {/* Sections */}
          {sections.map((section, i) => (
            <div key={i}>
              {section.type === 'weather' && (
                <WeatherSection data={section.data as { locations: WeatherLocation[] }} />
              )}
              {section.type === 'news' && (
                <NewsSection data={section.data as { articles: NewsArticle[] }} />
              )}
              {section.type === 'quote' && (
                <QuoteSection data={section.data as { text: string; author: string }} />
              )}
              {section.type === 'markets' && (
                <MarketsSection data={section.data as { symbols: MarketSymbol[] }} />
              )}
              {i < sections.length - 1 && <Hr style={divider} />}
            </div>
          ))}

          <Hr style={divider} />

          {/* Footer */}
          <Section style={{ paddingTop: '4px' }}>
            <Text style={{ ...metaText, textAlign: 'center' }}>
              You&rsquo;re receiving this because you set up a daily brief.{' '}
              <Link
                href={`/unsubscribe?token=${unsubscribeToken}`}
                style={{ color: colors.muted, textDecoration: 'underline' }}
              >
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
  text: '#111827',
  muted: '#6b7280',
  border: '#e5e7eb',
  positive: '#16a34a',
  negative: '#dc2626',
  bg: '#ffffff',
};

const fontStack =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", Roboto, Helvetica, Arial, sans-serif';

const body: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  fontFamily: fontStack,
  margin: '0',
  padding: '0',
};

const container: React.CSSProperties = {
  backgroundColor: colors.bg,
  borderRadius: '8px',
  margin: '32px auto',
  maxWidth: '600px',
  padding: '40px 48px',
};

const headerTitle: React.CSSProperties = {
  color: colors.text,
  fontSize: '24px',
  fontWeight: '600',
  margin: '0 0 4px',
};

const sectionHeading: React.CSSProperties = {
  color: colors.text,
  fontSize: '13px',
  fontWeight: '600',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  margin: '0 0 12px',
};

const bodyText: React.CSSProperties = {
  color: colors.text,
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 8px',
};

const metaText: React.CSSProperties = {
  color: colors.muted,
  fontSize: '13px',
  lineHeight: '1.5',
  margin: '0 0 4px',
};

const divider: React.CSSProperties = {
  borderColor: colors.border,
  borderTopWidth: '1px',
  margin: '24px 0',
};
