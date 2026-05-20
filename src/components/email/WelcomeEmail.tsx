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

// ─────────────────────────────────────────────────────────────
// Welcome email — fired exactly once after signup confirms.
// ─────────────────────────────────────────────────────────────
//
// Visual language deliberately mirrors DailyBriefEmail: editorial Iowan-style
// serif headline, mono kicker, pure-white background, compliance footer with
// mailing address + unsubscribe. Single editorial message: "you're signed
// up, your first brief lands tomorrow morning, here's how to set things up."

export interface WelcomeEmailProps {
  userName: string;
  /** Per-user unsubscribe token. Required so the footer link works. */
  unsubscribeToken: string;
  theme?: string;
  /** Physical mailing address from BUSINESS_MAILING_ADDRESS env var. CAN-SPAM. */
  mailingAddress: string;
}

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
    fontSize: '30px',
    fontWeight: 400,
    fontStyle: 'italic',
    lineHeight: '1.2',
    letterSpacing: '-0.01em',
    margin: '0',
  };
}
function bodyStyle(c: EmailThemeColors): React.CSSProperties {
  return { color: c.text, fontFamily: SANS_STACK, fontSize: '16px', lineHeight: '1.65', margin: '0 0 14px' };
}
function mutedStyle(c: EmailThemeColors): React.CSSProperties {
  return { color: c.muted, fontFamily: SANS_STACK, fontSize: '14px', lineHeight: '1.55', margin: '0 0 4px' };
}

function DotDivider({ c }: { c: EmailThemeColors }) {
  return (
    <Section style={{ position: 'relative', margin: '32px 0', textAlign: 'center' }}>
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

export default function WelcomeEmail({
  userName, unsubscribeToken, theme, mailingAddress,
}: WelcomeEmailProps) {
  const firstName = (userName?.split(' ')[0]) || 'there';
  const { colors: c } = getTheme(theme ?? 'light');

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
      <Preview>Welcome to Daily Brief. Your first morning email lands tomorrow.</Preview>
      <Body style={bodyStyles}>
        <Container style={containerStyles}>
          {/* Masthead — mirrors DailyBriefEmail */}
          <Section style={{ paddingBottom: '4px' }}>
            <Text style={{ ...kickerStyle(c), margin: '0 0 12px' }}>Daily Brief</Text>
            <Heading as="h1" style={serifHeadlineStyle(c)}>
              Welcome aboard, {firstName}.
            </Heading>
            <Text style={{ ...mutedStyle(c), margin: '10px 0 0', fontSize: '13px' }}>
              Your first brief lands tomorrow morning.
            </Text>
          </Section>

          <DotDivider c={c} />

          <Section>
            <Text style={bodyStyle(c)}>
              Thanks for signing up. Daily Brief is one calm, well-written email
              every morning, built from the modules you pick. No tracking
              pixels, no marketing fluff. Just weather, news, quotes, and
              whatever else you choose, written for the day ahead.
            </Text>
            <Text style={bodyStyle(c)}>
              If you have not yet picked your modules or set your delivery
              time, this is the moment. Head to your dashboard and the
              setup takes about two minutes.
            </Text>
          </Section>

          <Section style={{ textAlign: 'center', padding: '8px 0 16px' }}>
            <Link
              href="https://dailybriefmail.com/dashboard"
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
              Open your dashboard
            </Link>
          </Section>

          <Section>
            <Text style={{ ...mutedStyle(c), fontFamily: SERIF_STACK, fontStyle: 'italic', fontSize: '15px', margin: '0' }}>
              One last thing: your first brief may land in Promotions or
              spam. If it does, drag it to your primary inbox so future
              briefs arrive in the right place.
            </Text>
          </Section>

          <DotDivider c={c} />

          {/* Footer — same shape as DailyBriefEmail */}
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
              See you in the morning.
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
