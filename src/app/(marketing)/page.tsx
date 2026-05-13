import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import TopNav from '@/components/layout/TopNav';
import {
  ArrowRight,
  Cloud,
  Newspaper,
  Quote,
  TrendingUp,
  Check,
} from 'lucide-react';
import { PLANS } from '@/lib/stripe/products';

// ─────────────────────────────────────────────────────────────
// Page metadata + Open Graph
// ─────────────────────────────────────────────────────────────

const META_TITLE = 'Daily Brief — Your Morning Brief, Curated by AI';
const META_DESCRIPTION =
  'One personalized email, every morning. Real-time weather, news, markets, and more — written by AI, configured by you. Free to start.';

export const metadata: Metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
  openGraph: {
    title: META_TITLE,
    description: META_DESCRIPTION,
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Daily Brief' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: META_TITLE,
    description: META_DESCRIPTION,
    images: ['/og.png'],
  },
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#999]">
      {children}
    </p>
  );
}

function GrainOverlay() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.022]"
      xmlns="http://www.w3.org/2000/svg"
    >
      <filter id="grain">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.8"
          numOctaves="4"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Hero (dark)
// ─────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 pt-20"
      style={{
        background:
          'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(124, 92, 252, 0.15) 0%, transparent 70%), #0D0D0F',
      }}
    >
      <GrainOverlay />

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#1f1f1f] bg-[#0f0f0f] px-3 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="font-mono text-[10px] tracking-widest text-[#555]">
            POWERED BY CLAUDE AI
          </span>
        </div>

        {/* Headline */}
        <h1
          className="mb-6 text-6xl leading-[1.05] tracking-tight text-[#ededed] md:text-8xl"
          style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
        >
          Your morning,
          <br />
          <span className="text-[#3a3a3a]">curated.</span>
        </h1>

        <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-white/60 md:text-xl">
          One personalized email, every morning. Real-time weather, news,
          markets, and more — written by AI, configured by you.
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/signup"
            className="flex items-center gap-2 rounded-full bg-[#ededed] px-6 py-3 text-sm font-medium text-[#0D0D0F] transition-colors hover:bg-white"
          >
            Start for free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="#how-it-works"
            className="text-sm text-white/60 transition-colors hover:text-white/90"
          >
            See how it works →
          </Link>
        </div>
      </div>

      {/* Fade to white */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-white" />
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Problem (white)
// ─────────────────────────────────────────────────────────────

function Problem() {
  return (
    <section className="border-t border-gray-100 bg-white px-6 py-24 md:py-32">
      <div className="mx-auto max-w-2xl">
        <h2
          className="text-4xl leading-tight tracking-tight text-[#0D0D0F] md:text-5xl"
          style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
        >
          You&rsquo;re subscribed to 12 newsletters.
          <br />
          <span className="text-[#c0c0c0]">You read zero of them.</span>
        </h2>
        <p className="mt-6 max-w-lg text-base leading-relaxed text-[#666] md:text-lg">
          It&rsquo;s not you. Email is broken. The information is out
          there — weather, news, your portfolio — but it arrives in
          fragments, at the wrong time, from twelve different places.
          Nothing fits together.
        </p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Solution (white)
// ─────────────────────────────────────────────────────────────

function Solution() {
  return (
    <section className="border-t border-gray-100 bg-white px-6 py-24 md:py-32">
      <div className="mx-auto max-w-2xl">
        <SectionLabel>THE FIX</SectionLabel>
        <h2
          className="mt-4 text-4xl leading-tight tracking-tight text-[#0D0D0F] md:text-5xl"
          style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
        >
          One brief. Every morning.
          <br />
          Everything you actually want.
        </h2>
        <p className="mt-6 max-w-lg text-base leading-relaxed text-[#666] md:text-lg">
          Tell Daily Brief what matters — your city&rsquo;s weather, the
          topics you follow, the stocks you watch. Every morning, before
          you wake up, Claude searches the web in real time and writes your
          brief from scratch. No curation lag. No stale feeds. Just
          everything you wanted to know, in one clean email.
        </p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Module showcase — white product-style cards
// ─────────────────────────────────────────────────────────────

function ShowcaseCard({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-surface-border border-t-[3px] border-t-brand-purple bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-brand-purple">{icon}</span>
        <span className="font-semibold text-ink">{label}</span>
      </div>
      {children}
    </div>
  );
}

function WeatherCard() {
  return (
    <ShowcaseCard icon={<Cloud className="h-4 w-4" />} label="Weather">
      <div className="space-y-1">
        <p className="text-xs text-ink-muted">Nashville, TN</p>
        <p className="font-light text-[#0D0D0F]" style={{ fontSize: '2.2rem', lineHeight: 1 }}>
          68°<span className="text-xl">F</span>
        </p>
        <p className="text-sm text-[#666]">Partly Cloudy</p>
        <p className="mt-2 font-mono text-[11px] text-[#999]">
          H: 74° &nbsp;·&nbsp; L: 58° &nbsp;·&nbsp; Humidity: 71%
        </p>
      </div>
    </ShowcaseCard>
  );
}

function NewsCard() {
  const items = [
    { headline: 'OpenAI introduces o3, its most capable reasoning model', source: 'The Verge' },
    { headline: 'Fed signals two rate cuts in 2025 as inflation cools', source: 'WSJ' },
    { headline: "Apple's Vision Pro 2 enters testing phase", source: 'Bloomberg' },
  ];
  return (
    <ShowcaseCard icon={<Newspaper className="h-4 w-4" />} label="News">
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="border-l-2 border-surface-border pl-3">
            <p className="text-xs leading-snug text-[#333]">{item.headline}</p>
            <p className="mt-0.5 font-mono text-[10px] text-[#999]">{item.source}</p>
          </div>
        ))}
      </div>
    </ShowcaseCard>
  );
}

function QuoteCard() {
  return (
    <ShowcaseCard icon={<Quote className="h-4 w-4" />} label="Quote">
      <div className="border-l-2 border-brand-purple/30 pl-4">
        <p className="text-sm italic leading-relaxed text-[#555]">
          &ldquo;The impediment to action advances action. What stands in the way
          becomes the way.&rdquo;
        </p>
        <p className="mt-3 font-mono text-[11px] text-[#999]">— Marcus Aurelius</p>
      </div>
    </ShowcaseCard>
  );
}

function MarketsCard() {
  const rows = [
    { symbol: 'SPY', price: '$585.42', change: '+0.34%', up: true },
    { symbol: 'BTC-USD', price: '$67,420', change: '+1.20%', up: true },
    { symbol: 'NVDA', price: '$875.50', change: '-0.82%', up: false },
  ];
  return (
    <ShowcaseCard icon={<TrendingUp className="h-4 w-4" />} label="Markets">
      <div className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.symbol} className="flex items-center justify-between">
            <span className="font-mono text-xs text-[#555]">{r.symbol}</span>
            <div className="flex items-center gap-4">
              <span className="font-mono text-xs text-[#333]">{r.price}</span>
              <span className={`font-mono text-xs ${r.up ? 'text-emerald-600' : 'text-red-600'}`}>
                {r.change}
              </span>
            </div>
          </div>
        ))}
      </div>
    </ShowcaseCard>
  );
}

function ModuleShowcase() {
  return (
    <section className="border-t border-gray-100 bg-white px-6 py-24 md:py-32">
      <div className="mx-auto max-w-2xl">
        <SectionLabel>WHAT&apos;S INSIDE</SectionLabel>
        <h2
          className="mt-4 text-4xl tracking-tight text-[#0D0D0F] md:text-5xl"
          style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
        >
          Your brief, your way.
        </h2>
        <p className="mt-4 text-base text-[#666]">
          Choose the modules that matter to you. Configure each one. That&rsquo;s it.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <WeatherCard />
          <NewsCard />
          <QuoteCard />
          <MarketsCard />
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// How it works (white)
// ─────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      n: '01',
      title: 'Create an account',
      desc: 'Sign up with your email address. Free to start, no credit card required.',
    },
    {
      n: '02',
      title: 'Build your brief',
      desc: 'Add modules and configure them — your city, the topics you follow, the stocks you watch. Takes about two minutes.',
    },
    {
      n: '03',
      title: 'Wake up to it',
      desc: 'Pick a delivery time. Every morning, Claude searches the web and writes your brief before your alarm goes off.',
    },
  ];

  return (
    <section
      id="how-it-works"
      className="border-t border-gray-100 bg-white px-6 py-24 md:py-32"
    >
      <div className="mx-auto max-w-2xl">
        <SectionLabel>HOW IT WORKS</SectionLabel>
        <h2
          className="mt-4 text-4xl tracking-tight text-[#0D0D0F] md:text-5xl"
          style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
        >
          Three steps to a better morning.
        </h2>

        <div className="mt-12 divide-y divide-gray-100">
          {steps.map((step) => (
            <div key={step.n} className="flex gap-8 py-8">
              <span className="mt-0.5 shrink-0 font-mono text-xs text-[#ccc]">
                {step.n}
              </span>
              <div>
                <h3 className="text-sm font-medium text-[#0D0D0F]">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#666]">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Pricing (white)
// ─────────────────────────────────────────────────────────────

function Pricing() {
  return (
    <section className="border-t border-gray-100 bg-white px-6 py-24 md:py-32">
      <div className="mx-auto max-w-2xl">
        <SectionLabel>PRICING</SectionLabel>
        <h2
          className="mt-4 text-4xl tracking-tight text-[#0D0D0F] md:text-5xl"
          style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
        >
          Simple pricing.
          <br />
          <span className="text-[#c0c0c0]">No surprises.</span>
        </h2>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Free */}
          <div className="flex flex-col justify-between rounded-2xl border border-surface-border bg-white p-6 shadow-sm">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#999]">
                Free
              </p>
              <p
                className="mt-3 text-5xl font-light text-[#0D0D0F]"
                style={{ fontFamily: 'Georgia, ui-serif, serif' }}
              >
                $0
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-[#bbb]">forever</p>

              <ul className="mt-6 space-y-2.5">
                {PLANS.free.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-[#666]">
                    <Check className="h-3.5 w-3.5 shrink-0 text-[#bbb]" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href="/signup"
              className="mt-8 block rounded-lg border border-surface-border px-4 py-2.5 text-center text-sm text-[#666] transition-colors hover:border-brand-purple/30 hover:text-ink"
            >
              Get started free
            </Link>
          </div>

          {/* Pro */}
          <div className="relative flex flex-col justify-between rounded-2xl border-2 border-brand-purple bg-white p-6 shadow-sm">
            <span className="absolute right-4 top-4 rounded-full bg-brand-purple-light px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-brand-purple">
              Popular
            </span>

            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand-purple">
                Brief Pro
              </p>
              <p
                className="mt-3 text-5xl font-light text-[#0D0D0F]"
                style={{ fontFamily: 'Georgia, ui-serif, serif' }}
              >
                ${PLANS.pro.monthlyPrice}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-[#bbb]">per month</p>

              <ul className="mt-6 space-y-2.5">
                {PLANS.pro.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-[#333]">
                    <Check className="h-3.5 w-3.5 shrink-0 text-brand-purple" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href="/signup"
              className="mt-8 block rounded-lg bg-brand-purple px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-brand-purple-dark"
            >
              Start with Pro
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center font-mono text-[11px] text-[#bbb]">
          Payments processed securely by Stripe. Cancel any time.
        </p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Footer (white)
// ─────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white px-6 py-12">
      <div className="mx-auto flex max-w-2xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-[#0D0D0F]">Daily Brief</p>
          <p className="mt-1 font-mono text-[11px] text-[#bbb]">© 2025. All rights reserved.</p>
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          {[
            { href: '/login', label: 'Sign in' },
            { href: '/signup', label: 'Get started' },
            { href: '/dashboard/upgrade', label: 'Pricing' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-xs text-[#999] transition-colors hover:text-[#333]"
            >
              {label}
            </Link>
          ))}
        </nav>

        <p className="max-w-[220px] font-mono text-[10px] leading-relaxed text-[#bbb]">
          To manage preferences or unsubscribe, use the link in any email we send you.
        </p>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export default function LandingPage({
  searchParams,
}: {
  searchParams?: { error?: string; error_description?: string; error_code?: string };
}) {
  if (searchParams?.error) {
    const params = new URLSearchParams();
    if (searchParams.error) params.set('error', searchParams.error);
    if (searchParams.error_description) params.set('error_description', searchParams.error_description);
    redirect(`/login?${params.toString()}`);
  }

  return (
    <div className="antialiased">
      {/* Dark section — transparent nav + hero */}
      <div className="bg-[#0D0D0F]">
        <TopNav variant="marketing" transparent />
        <Hero />
      </div>

      {/* White sections */}
      <Problem />
      <Solution />
      <ModuleShowcase />
      <HowItWorks />
      <Pricing />
      <Footer />
    </div>
  );
}
