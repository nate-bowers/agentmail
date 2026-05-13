import type { Metadata } from 'next';
import Link from 'next/link';
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

const META_TITLE = 'AgentMail — Your Morning Brief, Curated by AI';
const META_DESCRIPTION =
  'One personalized email, every morning. Real-time weather, news, markets, and more — written by AI, configured by you. Free to start.';

export const metadata: Metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
  openGraph: {
    title: META_TITLE,
    description: META_DESCRIPTION,
    type: 'website',
    // Place a 1200×630 image at public/og.png before launch
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'AgentMail' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: META_TITLE,
    description: META_DESCRIPTION,
    images: ['/og.png'],
  },
};

// ─────────────────────────────────────────────────────────────
// Design tokens (used as Tailwind arbitrary values throughout)
// ─────────────────────────────────────────────────────────────
// bg:      #0a0a0a
// surface: #0f0f0f
// border:  #1f1f1f
// text:    #ededed
// muted:   #666
// dim:     #444
// serif:   Georgia, ui-serif

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#444]">
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
// Nav
// ─────────────────────────────────────────────────────────────

function Nav() {
  return (
    <header
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b border-[#141414] px-6 py-4"
      style={{ background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(16px)' }}
    >
      <Link
        href="/"
        className="text-sm font-semibold tracking-tight text-[#ededed]"
      >
        AgentMail
      </Link>
      <nav className="flex items-center gap-4">
        <Link
          href="/login"
          className="hidden text-sm text-[#555] transition-colors hover:text-[#ededed] sm:block"
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className="rounded-full bg-[#ededed] px-4 py-1.5 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-white"
        >
          Get started
        </Link>
      </nav>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────
// Hero
// ─────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 pt-20">
      {/* Animated gradient glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-[560px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(99,102,241,0.11) 0%, rgba(168,85,247,0.06) 40%, transparent 68%)',
          filter: 'blur(72px)',
          animation: 'glow-drift 14s ease-in-out infinite',
        }}
      />

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

        <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-[#555] md:text-xl">
          One personalized email, every morning. Real-time weather, news,
          markets, and more — written by AI, configured by you.
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/signup"
            className="flex items-center gap-2 rounded-full bg-[#ededed] px-6 py-3 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-white"
          >
            Start for free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="#how-it-works"
            className="text-sm text-[#444] transition-colors hover:text-[#888]"
          >
            See how it works →
          </Link>
        </div>
      </div>

      {/* Bottom fade */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
        style={{
          background: 'linear-gradient(to bottom, transparent, #0a0a0a)',
        }}
      />
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Problem
// ─────────────────────────────────────────────────────────────

function Problem() {
  return (
    <section className="border-t border-[#141414] px-6 py-24 md:py-32">
      <div className="mx-auto max-w-2xl">
        <h2
          className="text-4xl leading-tight tracking-tight text-[#ededed] md:text-5xl"
          style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
        >
          You&rsquo;re subscribed to 12 newsletters.
          <br />
          <span className="text-[#2e2e2e]">You read zero of them.</span>
        </h2>
        <p className="mt-6 max-w-lg text-base leading-relaxed text-[#444] md:text-lg">
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
// Solution
// ─────────────────────────────────────────────────────────────

function Solution() {
  return (
    <section className="border-t border-[#141414] px-6 py-24 md:py-32">
      <div className="mx-auto max-w-2xl">
        <SectionLabel>THE FIX</SectionLabel>
        <h2
          className="mt-4 text-4xl leading-tight tracking-tight text-[#ededed] md:text-5xl"
          style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
        >
          One brief. Every morning.
          <br />
          Everything you actually want.
        </h2>
        <p className="mt-6 max-w-lg text-base leading-relaxed text-[#444] md:text-lg">
          Tell AgentMail what matters — your city&rsquo;s weather, the
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
// Module showcase — preview cards styled like email sections
// ─────────────────────────────────────────────────────────────

function ModuleCard({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-5 transition-colors duration-200 hover:border-[#2a2a2a]">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-[#444]">{icon}</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#3a3a3a]">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

function WeatherCard() {
  return (
    <ModuleCard icon={<Cloud className="h-3.5 w-3.5" />} label="Weather">
      <div className="space-y-1">
        <p className="text-xs text-[#444]">Nashville, TN</p>
        <p className="font-light text-[#ededed]" style={{ fontSize: '2.4rem', lineHeight: 1 }}>
          68°<span className="text-2xl">F</span>
        </p>
        <p className="text-sm text-[#666]">Partly Cloudy</p>
        <p className="mt-2 font-mono text-[11px] text-[#333]">
          H: 74° &nbsp;·&nbsp; L: 58° &nbsp;·&nbsp; Humidity: 71%
        </p>
      </div>
    </ModuleCard>
  );
}

function NewsCard() {
  const items = [
    { headline: 'OpenAI introduces o3, its most capable reasoning model', source: 'The Verge' },
    { headline: 'Fed signals two rate cuts in 2025 as inflation cools', source: 'WSJ' },
    { headline: "Apple's Vision Pro 2 enters testing phase", source: 'Bloomberg' },
  ];
  return (
    <ModuleCard icon={<Newspaper className="h-3.5 w-3.5" />} label="News">
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="border-l border-[#1f1f1f] pl-3">
            <p className="text-xs leading-snug text-[#aaa]">{item.headline}</p>
            <p className="mt-0.5 font-mono text-[10px] text-[#3a3a3a]">{item.source}</p>
          </div>
        ))}
      </div>
    </ModuleCard>
  );
}

function QuoteCard() {
  return (
    <ModuleCard icon={<Quote className="h-3.5 w-3.5" />} label="Quote">
      <div className="border-l-2 border-[#2a2a2a] pl-4">
        <p className="text-sm italic leading-relaxed text-[#aaa]">
          &ldquo;The impediment to action advances action. What stands in the way
          becomes the way.&rdquo;
        </p>
        <p className="mt-3 font-mono text-[11px] text-[#3a3a3a]">— Marcus Aurelius</p>
      </div>
    </ModuleCard>
  );
}

function MarketsCard() {
  const rows = [
    { symbol: 'SPY', price: '$585.42', change: '+0.34%', up: true },
    { symbol: 'BTC-USD', price: '$67,420', change: '+1.20%', up: true },
    { symbol: 'NVDA', price: '$875.50', change: '-0.82%', up: false },
  ];
  return (
    <ModuleCard icon={<TrendingUp className="h-3.5 w-3.5" />} label="Markets">
      <div className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.symbol} className="flex items-center justify-between">
            <span className="font-mono text-xs text-[#555]">{r.symbol}</span>
            <div className="flex items-center gap-4">
              <span className="font-mono text-xs text-[#aaa]">{r.price}</span>
              <span
                className={`font-mono text-xs ${r.up ? 'text-emerald-600' : 'text-red-600'}`}
              >
                {r.change}
              </span>
            </div>
          </div>
        ))}
      </div>
    </ModuleCard>
  );
}

function ModuleShowcase() {
  return (
    <section className="border-t border-[#141414] px-6 py-24 md:py-32">
      <div className="mx-auto max-w-2xl">
        <SectionLabel>WHAT&apos;S INSIDE</SectionLabel>
        <h2
          className="mt-4 text-4xl tracking-tight text-[#ededed] md:text-5xl"
          style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
        >
          Your brief, your way.
        </h2>
        <p className="mt-4 text-base text-[#444]">
          Choose the modules that matter to you. Configure each one. That&rsquo;s it.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
// How it works
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
      className="border-t border-[#141414] px-6 py-24 md:py-32"
    >
      <div className="mx-auto max-w-2xl">
        <SectionLabel>HOW IT WORKS</SectionLabel>
        <h2
          className="mt-4 text-4xl tracking-tight text-[#ededed] md:text-5xl"
          style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
        >
          Three steps to a better morning.
        </h2>

        <div className="mt-12 divide-y divide-[#141414]">
          {steps.map((step) => (
            <div key={step.n} className="flex gap-8 py-8">
              <span className="mt-0.5 shrink-0 font-mono text-xs text-[#2a2a2a]">
                {step.n}
              </span>
              <div>
                <h3 className="text-sm font-medium text-[#ededed]">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#444]">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Pricing
// ─────────────────────────────────────────────────────────────

function Pricing() {
  return (
    <section className="border-t border-[#141414] px-6 py-24 md:py-32">
      <div className="mx-auto max-w-2xl">
        <SectionLabel>PRICING</SectionLabel>
        <h2
          className="mt-4 text-4xl tracking-tight text-[#ededed] md:text-5xl"
          style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
        >
          Simple pricing.
          <br />
          <span className="text-[#2e2e2e]">No surprises.</span>
        </h2>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Free */}
          <div className="flex flex-col justify-between rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-6">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3a3a3a]">
                Free
              </p>
              <p
                className="mt-3 text-5xl font-light text-[#ededed]"
                style={{ fontFamily: 'Georgia, ui-serif, serif' }}
              >
                $0
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-[#333]">forever</p>

              <ul className="mt-6 space-y-2.5">
                {PLANS.free.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-[#555]">
                    <Check className="h-3.5 w-3.5 shrink-0 text-[#333]" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href="/signup"
              className="mt-8 block rounded-lg border border-[#1f1f1f] px-4 py-2.5 text-center text-sm text-[#555] transition-colors hover:border-[#2e2e2e] hover:text-[#888]"
            >
              Get started free
            </Link>
          </div>

          {/* Pro */}
          <div className="relative flex flex-col justify-between rounded-xl border border-[#2e2e2e] bg-[#0f0f0f] p-6">
            <span className="absolute right-4 top-4 font-mono text-[9px] uppercase tracking-widest text-[#555]">
              Most popular
            </span>

            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#888]">
                Brief Pro
              </p>
              <p
                className="mt-3 text-5xl font-light text-[#ededed]"
                style={{ fontFamily: 'Georgia, ui-serif, serif' }}
              >
                ${PLANS.pro.monthlyPrice}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-[#444]">per month</p>

              <ul className="mt-6 space-y-2.5">
                {PLANS.pro.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-[#888]">
                    <Check className="h-3.5 w-3.5 shrink-0 text-[#ededed]" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href="/signup"
              className="mt-8 block rounded-lg bg-[#ededed] px-4 py-2.5 text-center text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-white"
            >
              Start with Pro
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center font-mono text-[11px] text-[#2e2e2e]">
          Payments processed securely by Stripe. Cancel any time.
        </p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-[#141414] px-6 py-12">
      <div className="mx-auto flex max-w-2xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-[#ededed]">AgentMail</p>
          <p className="mt-1 font-mono text-[11px] text-[#2a2a2a]">© 2025. All rights reserved.</p>
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
              className="text-xs text-[#333] transition-colors hover:text-[#666]"
            >
              {label}
            </Link>
          ))}
        </nav>

        <p className="max-w-[220px] font-mono text-[10px] leading-relaxed text-[#2a2a2a]">
          To manage preferences or unsubscribe, use the link in any email we send you.
        </p>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] antialiased">
      {/* Keyframes — scoped to this page */}
      <style>{`
        @keyframes glow-drift {
          0%, 100% {
            transform: translateX(-50%) translateY(0px);
            opacity: 0.7;
          }
          50% {
            transform: translateX(-50%) translateY(-44px);
            opacity: 1;
          }
        }
      `}</style>

      <Nav />
      <Hero />
      <Problem />
      <Solution />
      <ModuleShowcase />
      <HowItWorks />
      <Pricing />
      <Footer />
    </div>
  );
}
