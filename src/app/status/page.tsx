import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Status',
  description: 'Live operational status for Daily Brief.',
  robots: { index: true, follow: true },
};

// Always render fresh. This is a status page; cached output defeats the purpose.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type CheckResult = { ok: boolean; latencyMs?: number; error?: string };
type HealthPayload = {
  status: 'ok' | 'degraded' | 'down';
  checks: {
    supabase: CheckResult;
    resend: CheckResult;
    anthropic_key: CheckResult;
  };
  timestamp: string;
};

type FetchOutcome =
  | { kind: 'ok'; data: HealthPayload }
  | { kind: 'unknown' };

const FETCH_TIMEOUT_MS = 4000;

function resolveBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3000';
}

async function fetchHealth(): Promise<FetchOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${resolveBaseUrl()}/api/health`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    // /api/health returns 503 when supabase is down, but the JSON body is
    // still the same shape and is still useful, so we accept any 2xx or 503.
    if (!res.ok && res.status !== 503) return { kind: 'unknown' };
    const data = (await res.json()) as HealthPayload;
    if (!data || typeof data.status !== 'string' || !data.checks) {
      return { kind: 'unknown' };
    }
    return { kind: 'ok', data };
  } catch {
    return { kind: 'unknown' };
  } finally {
    clearTimeout(timer);
  }
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  } catch {
    return iso;
  }
}

type Tone = 'ok' | 'degraded' | 'down' | 'unknown';

function toneFor(check: CheckResult | undefined): Tone {
  if (!check) return 'unknown';
  return check.ok ? 'ok' : 'down';
}

function labelFor(tone: Tone): string {
  switch (tone) {
    case 'ok':
      return 'Operational';
    case 'degraded':
      return 'Degraded';
    case 'down':
      return 'Down';
    case 'unknown':
      return 'Status unknown';
  }
}

function dotColor(tone: Tone): string {
  switch (tone) {
    case 'ok':
      return 'bg-emerald-500';
    case 'degraded':
      return 'bg-amber-500';
    case 'down':
      return 'bg-red-500';
    case 'unknown':
      return 'bg-gray-300';
  }
}

function ServiceRow({
  name,
  check,
  fallbackTone,
}: {
  name: string;
  check?: CheckResult;
  fallbackTone?: Tone;
}) {
  const tone: Tone = check ? toneFor(check) : (fallbackTone ?? 'unknown');
  const latency = check?.latencyMs;
  return (
    <li className="flex items-center justify-between border-b border-gray-100 py-4 last:border-b-0">
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#666]">
        {name}
      </span>
      <span className="flex items-center gap-3">
        {typeof latency === 'number' && tone !== 'unknown' ? (
          <span className="font-mono text-[11px] text-[#bbb]">{latency} ms</span>
        ) : null}
        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={`inline-block h-2 w-2 rounded-full ${dotColor(tone)}`}
          />
          <span className="text-sm text-[#333]">{labelFor(tone)}</span>
        </span>
      </span>
    </li>
  );
}

export default async function StatusPage() {
  const outcome = await fetchHealth();

  const overall: Tone =
    outcome.kind === 'unknown'
      ? 'unknown'
      : outcome.data.status === 'ok'
        ? 'ok'
        : outcome.data.status === 'degraded'
          ? 'degraded'
          : 'down';

  const overallHeadline =
    overall === 'ok'
      ? 'All systems operational.'
      : overall === 'degraded'
        ? 'Some systems degraded.'
        : overall === 'down'
          ? 'A critical system is down.'
          : 'Status unknown.';

  const lastChecked =
    outcome.kind === 'ok'
      ? formatTimestamp(outcome.data.timestamp)
      : formatTimestamp(new Date().toISOString());

  const checks =
    outcome.kind === 'ok' ? outcome.data.checks : undefined;

  return (
    <main className="min-h-screen bg-white px-6 py-20 antialiased md:py-28">
      <div className="mx-auto max-w-xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#999]">
          System Status
        </p>

        <h1
          className="mt-4 text-4xl leading-tight tracking-tight text-[#0D0D0F] md:text-5xl"
          style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
        >
          Status
        </h1>

        <div className="mt-6 flex items-center gap-3">
          <span
            aria-hidden="true"
            className={`inline-block h-2.5 w-2.5 rounded-full ${dotColor(overall)}`}
          />
          <p className="text-base text-[#333] md:text-lg">{overallHeadline}</p>
        </div>

        <p className="mt-2 font-mono text-[11px] text-[#bbb]">
          Last checked {lastChecked}
        </p>

        <ul className="mt-10 border-t border-gray-100">
          <ServiceRow name="Supabase" check={checks?.supabase} fallbackTone={overall} />
          <ServiceRow
            name="Email Delivery (Resend)"
            check={checks?.resend}
            fallbackTone={overall}
          />
          <ServiceRow
            name="AI (Anthropic)"
            check={checks?.anthropic_key}
            fallbackTone={overall}
          />
        </ul>

        <div className="mt-16 border-t border-gray-100 pt-8">
          <p className="text-sm text-[#666]">
            Have an issue we don&rsquo;t know about?{' '}
            <a
              href="mailto:hello@dailybriefmail.com"
              className="text-[#333] underline decoration-[#ddd] underline-offset-4 transition-colors hover:text-brand-purple hover:decoration-brand-purple"
            >
              hello@dailybriefmail.com
            </a>
          </p>
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-[#ccc]">
            <Link href="/" className="transition-colors hover:text-[#666]">
              Back to Daily Brief
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
