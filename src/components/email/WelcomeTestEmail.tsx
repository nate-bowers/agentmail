import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import { getTheme, type EmailThemeColors } from '@/lib/email/themes';

export interface WelcomeTestEmailProps {
  userName: string;
  date: string;
  theme?: string;
}

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

export default function WelcomeTestEmail({ userName, date, theme }: WelcomeTestEmailProps) {
  const firstName = (userName?.split(' ')[0]) || 'there';
  const { colors: c } = getTheme(theme ?? 'light');

  const bodyStyles: React.CSSProperties = {
    backgroundColor: c.bg, fontFamily: fontStack, margin: '0', padding: '0',
  };
  const containerStyles: React.CSSProperties = {
    backgroundColor: c.containerBg, borderRadius: '8px', margin: '32px auto',
    maxWidth: '600px', padding: '40px 48px',
  };
  const dividerStyle: React.CSSProperties = { borderColor: c.border, margin: '24px 0' };
  const calloutStyle: React.CSSProperties = {
    backgroundColor: c.border, borderRadius: '8px', padding: '16px 18px', margin: '8px 0 16px',
  };

  return (
    <Html lang="en">
      <Head />
      <Preview>Please move this to your primary inbox so your daily briefs arrive there too</Preview>
      <Body style={bodyStyles}>
        <Container style={containerStyles}>
          <Section style={{ paddingBottom: '8px' }}>
            <Heading as="h1" style={{ color: c.text, fontSize: '24px', fontWeight: '600', margin: '0 0 4px' }}>
              Welcome to Daily Brief, {firstName}.
            </Heading>
            <Text style={{ ...mutedStyle(c), margin: '0' }}>{date}</Text>
          </Section>

          <Hr style={dividerStyle} />

          <Section>
            <Heading as="h2" style={headingStyle(c)}>One quick thing</Heading>
            <Text style={bodyStyle(c)}>
              This is a test email from us before your real daily brief starts arriving.
              If you found this in spam or Promotions, that is exactly why we sent it.
            </Text>
            <Text style={bodyStyle(c)}>
              Please move this email to your primary inbox and, if your provider asks,
              mark it as &ldquo;Not spam&rdquo;. That one action teaches your inbox to deliver
              every future brief to the right place, so you never miss a morning.
            </Text>
          </Section>

          <Section style={calloutStyle}>
            <Text style={{ ...bodyStyle(c), fontWeight: '600', margin: '0 0 6px' }}>
              On Gmail
            </Text>
            <Text style={{ ...mutedStyle(c), margin: '0' }}>
              Drag this email from Promotions into Primary, or tap the three-dot menu and
              choose &ldquo;Move to Primary&rdquo;. If it landed in Spam, open it and tap &ldquo;Report not spam&rdquo;.
            </Text>
          </Section>

          <Hr style={dividerStyle} />

          <Section>
            <Heading as="h2" style={headingStyle(c)}>A note from us</Heading>
            <Text style={{ ...bodyStyle(c), fontStyle: 'italic' }}>
              We send one calm, well-written email every morning. No tracking pixels,
              no marketing fluff. Just the stories, weather, quotes, and modules you picked,
              written for your day. Thanks for letting us into your inbox.
            </Text>
            <Text style={{ ...mutedStyle(c), margin: '8px 0 0' }}>
              — The Daily Brief team
            </Text>
          </Section>

          <Hr style={dividerStyle} />

          <Section>
            <Heading as="h2" style={headingStyle(c)}>A preview of what is coming</Heading>
            <Text style={{ ...mutedStyle(c), margin: '0 0 12px' }}>
              Your first real brief will look something like this:
            </Text>

            <Section style={{ marginBottom: '14px' }}>
              <Text style={{ ...bodyStyle(c), fontWeight: '600', margin: '0 0 2px' }}>☀️ Weather</Text>
              <Text style={{ ...mutedStyle(c), margin: '0' }}>
                A short read on today&rsquo;s conditions for your city, with highs, lows, and what to wear.
              </Text>
            </Section>

            <Section style={{ marginBottom: '14px' }}>
              <Text style={{ ...bodyStyle(c), fontWeight: '600', margin: '0 0 2px' }}>📰 News</Text>
              <Text style={{ ...mutedStyle(c), margin: '0' }}>
                A handful of stories on the topics you care about, summarized in plain English.
              </Text>
            </Section>

            <Section style={{ marginBottom: '14px' }}>
              <Text style={{ ...bodyStyle(c), fontWeight: '600', margin: '0 0 2px' }}>💬 Quote</Text>
              <Text style={{ ...mutedStyle(c), margin: '0', fontStyle: 'italic' }}>
                &ldquo;The unexamined life is not worth living.&rdquo;
              </Text>
              <Text style={{ ...mutedStyle(c), margin: '0' }}>— Socrates</Text>
            </Section>
          </Section>

          <Hr style={dividerStyle} />

          <Section style={{ paddingTop: '4px' }}>
            <Text style={{ ...mutedStyle(c), textAlign: 'center' }}>
              You are receiving this welcome test because you just signed up for Daily Brief.
              Your morning briefs will start arriving once your setup is complete.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
