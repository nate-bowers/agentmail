'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import TopNav from '@/components/layout/TopNav';
import DeletedToast from '@/components/marketing/DeletedToast';
import { AnimatedSection } from '@/components/marketing/AnimatedSection';
import { AnimatedCounter } from '@/components/marketing/AnimatedCounter';
import {
  ArrowRight,
  Cloud,
  Newspaper,
  Quote,
  TrendingUp,
  Check,
  Settings2,
  Bot,
  Mail,
} from 'lucide-react';
import { PLANS } from '@/lib/stripe/products';

const EASE = [0.21, 0.47, 0.32, 0.98] as const;

function fadeUp(delay = 0, skip = false) {
  if (skip) return { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 } };
  return {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay, ease: EASE },
  };
}

function SectionDivider() {
  return (
    <div aria-hidden="true" className="relative flex items-center justify-center">
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gray-100" />
      <div className="relative flex gap-1.5 bg-white px-4">
        <span className="h-1 w-1 rounded-full bg-gray-300" />
        <span className="h-1 w-1 rounded-full bg-gray-300" />
        <span className="h-1 w-1 rounded-full bg-gray-300" />
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#999]">
      {children}
    </p>
  );
}

// ─────────────────────────────────────────────────────────────
// Hero
// ─────────────────────────────────────────────────────────────

function Hero() {
  const reduced = !!useReducedMotion();

  return (
    <section className="hero-bg relative overflow-hidden px-6 pb-32 pt-14 md:pb-44 md:pt-20">
      {/* Dot grid — hidden on mobile */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden sm:block"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.055) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      {/* Purple glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(124, 92, 252, 0.07) 0%, transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-3xl text-center">
        <motion.h1
          {...fadeUp(0, reduced)}
          className="mb-6 text-[2.6rem] leading-[1.08] tracking-tight text-[#0D0D0F] sm:text-5xl md:text-[4.5rem]"
        >
          Your personal AI agent
          <br />
          <span
            className="text-brand-purple"
            style={{ fontFamily: 'var(--font-headline), Georgia, serif', fontStyle: 'italic' }}
          >
            makes your morning brief.
          </span>
        </motion.h1>

        <motion.p
          {...fadeUp(0.15, reduced)}
          className="mx-auto mb-10 max-w-lg text-lg leading-relaxed text-[#666] md:text-xl"
        >
          Tell it what matters to you. Every morning, it searches the web,
          writes your brief, and delivers it to your inbox before you wake up.
        </motion.p>

        <motion.div
          {...fadeUp(0.3, reduced)}
          className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
        >
          <motion.div
            whileHover={reduced ? {} : { scale: 1.03 }}
            whileTap={reduced ? {} : { scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <Link
              href="/signup"
              className="flex min-h-[44px] items-center gap-2 rounded-full bg-[#0D0D0F] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a]"
            >
              Build my brief for free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
          <Link
            href="#modules"
            className="flex min-h-[44px] items-center gap-1 py-2 text-sm text-[#999] transition-colors hover:text-brand-purple"
          >
            See what&apos;s inside
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          {...fadeUp(0.45, reduced)}
          className="mt-14 flex flex-wrap items-center justify-center gap-6 sm:gap-10"
        >
          <div className="text-center">
            <p className="text-2xl font-bold text-ink">
              <AnimatedCounter value={5} suffix=" min" />
            </p>
            <p className="mt-1 text-xs uppercase tracking-wide text-ink-muted">to set up</p>
          </div>
          <div className="hidden h-8 w-px bg-surface-border sm:block" />
          <div className="text-center">
            <p className="text-2xl font-bold text-ink">
              <AnimatedCounter value={22} />
            </p>
            <p className="mt-1 text-xs uppercase tracking-wide text-ink-muted">modules to choose from</p>
          </div>
          <div className="hidden h-8 w-px bg-surface-border sm:block" />
          <div className="text-center">
            <p className="text-2xl font-bold text-ink">Every morning</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-ink-muted">it runs itself</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Problem
// ─────────────────────────────────────────────────────────────

function Problem() {
  return (
    <section className="bg-white px-6 py-24 md:py-32">
      <div className="mx-auto max-w-2xl">
        <AnimatedSection>
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
            there - weather, news, your portfolio - but it arrives in
            fragments, at the wrong time, from twelve different places.
            Nothing fits together.
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Agent section
// ─────────────────────────────────────────────────────────────

function AgentCard({
  icon, step, title, description,
}: {
  icon: React.ReactNode; step: string; title: string; description: string;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-surface-border bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="text-brand-purple">{icon}</span>
        <span className="h-6 w-px shrink-0 bg-surface-border" />
        <span className="font-mono text-[10px] text-[#ccc]">{step}</span>
      </div>
      <div>
        <p className="font-semibold text-[#0D0D0F]">{title}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-[#666]">{description}</p>
      </div>
    </div>
  );
}

function AgentSection() {
  return (
    <section id="agent" className="bg-white px-6 py-24 md:py-32">
      <div className="mx-auto max-w-2xl">
        <AnimatedSection delay={0}>
          <SectionLabel>HOW IT WORKS</SectionLabel>
          <h2
            className="mt-4 text-4xl leading-tight tracking-tight text-[#0D0D0F] md:text-5xl"
            style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
          >
            An AI that works while you sleep.
          </h2>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-[#666]">
            Configure it once. Every morning after that, your agent runs on its own.
          </p>
        </AnimatedSection>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <AnimatedSection delay={0.1}>
            <AgentCard
              icon={<Settings2 className="h-6 w-6" />}
              step="01"
              title="You configure it once"
              description="Pick your modules, set your topics, choose a delivery time. Two minutes. Your agent handles everything after that."
            />
          </AnimatedSection>
          <AnimatedSection delay={0.2}>
            <AgentCard
              icon={<Bot className="h-6 w-6" />}
              step="02"
              title="The agent goes to work"
              description="Each morning, Claude searches the live web for fresh data, writes your sections from scratch, and assembles your brief."
            />
          </AnimatedSection>
          <AnimatedSection delay={0.3}>
            <AgentCard
              icon={<Mail className="h-6 w-6" />}
              step="03"
              title="It lands in your inbox"
              description="Your brief arrives before you're awake. Open it with coffee. No apps, no feeds, no prompts required."
            />
          </AnimatedSection>
        </div>

        <AnimatedSection delay={0.35}>
          <div className="mt-8 rounded-r-xl border-l-4 border-brand-purple/40 bg-[#f9f8ff] px-5 py-4">
            <p className="text-sm leading-relaxed text-[#555]">
              Every brief is written from scratch. Claude searches the live web, not a cached feed,
              so you&rsquo;re always reading what actually happened this morning.
            </p>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Module showcase
// ─────────────────────────────────────────────────────────────

function ShowcaseCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <motion.div
      className="rounded-2xl border border-surface-border border-t-[3px] border-t-brand-purple bg-white p-5 shadow-sm"
      whileHover={{ y: -3, boxShadow: '0 16px 48px rgba(124, 92, 252, 0.14)' }}
      transition={{ type: 'spring', stiffness: 350, damping: 22 }}
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="text-brand-purple">{icon}</span>
        <span className="font-semibold text-ink">{label}</span>
      </div>
      {children}
    </motion.div>
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
          H: 74° &nbsp;&middot;&nbsp; L: 58° &nbsp;&middot;&nbsp; Humidity: 71%
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
        <p className="mt-3 font-mono text-[11px] text-[#999]">- Marcus Aurelius</p>
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
    <section id="modules" className="bg-white px-6 py-24 md:py-32">
      <div className="mx-auto max-w-2xl">
        <AnimatedSection>
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
        </AnimatedSection>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AnimatedSection delay={0.08}><WeatherCard /></AnimatedSection>
          <AnimatedSection delay={0.16}><NewsCard /></AnimatedSection>
          <AnimatedSection delay={0.24}><QuoteCard /></AnimatedSection>
          <AnimatedSection delay={0.32}><MarketsCard /></AnimatedSection>
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
    <section className="border-t border-gray-100 bg-white px-6 py-24 md:py-32">
      <div className="mx-auto max-w-2xl">
        <AnimatedSection>
          <SectionLabel>PRICING</SectionLabel>
          <h2
            className="mt-4 text-4xl tracking-tight text-[#0D0D0F] md:text-5xl"
            style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
          >
            Simple pricing.
            <br />
            <span className="text-[#c0c0c0]">No surprises.</span>
          </h2>
        </AnimatedSection>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AnimatedSection direction="left" delay={0.1}>
            <div className="flex flex-col justify-between rounded-2xl border border-surface-border bg-white p-6 shadow-sm h-full">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#999]">Free</p>
                <p className="mt-3 text-5xl font-light text-[#0D0D0F]" style={{ fontFamily: 'Georgia, ui-serif, serif' }}>$0</p>
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
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <Link
                  href="/signup"
                  className="mt-8 block rounded-lg border border-surface-border px-4 py-2.5 text-center text-sm text-[#666] transition-colors hover:border-brand-purple/30 hover:text-ink"
                >
                  Get started free
                </Link>
              </motion.div>
            </div>
          </AnimatedSection>

          <AnimatedSection direction="right" delay={0.2}>
            <motion.div
              className="relative flex flex-col justify-between rounded-2xl border-2 border-brand-purple bg-white p-6 shadow-sm h-full"
              animate={{
                boxShadow: [
                  '0 0 0 0 rgba(124, 92, 252, 0)',
                  '0 0 0 6px rgba(124, 92, 252, 0.12)',
                  '0 0 0 0 rgba(124, 92, 252, 0)',
                ],
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <span className="absolute right-4 top-4 rounded-full bg-brand-purple-light px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-brand-purple">
                Popular
              </span>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand-purple">Brief Pro</p>
                <p className="mt-3 text-5xl font-light text-[#0D0D0F]" style={{ fontFamily: 'Georgia, ui-serif, serif' }}>${PLANS.pro.monthlyPrice}</p>
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
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <Link
                  href="/signup"
                  className="mt-8 block rounded-lg bg-brand-purple px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-brand-purple-dark"
                >
                  Start with Pro
                </Link>
              </motion.div>
            </motion.div>
          </AnimatedSection>
        </div>

        <p className="mt-6 text-center font-mono text-[11px] text-[#bbb]">
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
    <footer className="border-t border-gray-100 bg-white px-6 py-12">
      <div className="mx-auto flex max-w-2xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-[#0D0D0F]">Daily Brief</p>
          <p className="mt-1 font-mono text-[11px] text-[#bbb]">2025. All rights reserved.</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          {[
            { href: '/login', label: 'Sign in' },
            { href: '/signup', label: 'Get started' },
            { href: '/dashboard/upgrade', label: 'Pricing' },
            { href: '/terms', label: 'Terms' },
            { href: '/privacy', label: 'Privacy' },
          ].map(({ href, label }) => (
            <Link key={href} href={href} className="text-xs text-[#999] transition-colors hover:text-[#333]">
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
// Root export
// ─────────────────────────────────────────────────────────────

export default function LandingPageContent({ deleted }: { deleted?: boolean }) {
  return (
    <div className="antialiased bg-white">
      {deleted && <DeletedToast />}
      <TopNav variant="marketing" />
      <Hero />
      <SectionDivider />
      <Problem />
      <SectionDivider />
      <AgentSection />
      <SectionDivider />
      <ModuleShowcase />
      <Pricing />
      <Footer />
    </div>
  );
}
