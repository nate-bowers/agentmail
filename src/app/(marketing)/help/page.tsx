'use client';

// Static FAQ + contact page. Modeled on the existing privacy/terms layout
// so it picks up TopNav, the marketing chrome, and the same typography.
// Each FAQ is a <details> for native open/close — no JS state, no
// accordion dependency, accessible by default.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import TopNav from '@/components/layout/TopNav';

const LAST_UPDATED = 'May 21, 2026';
const SUPPORT_EMAIL = 'support@dailybriefmail.com';

interface FaqItem {
  q: string;
  a: string | string[];
}

const FAQS: FaqItem[] = [
  {
    q: 'When does my daily brief arrive?',
    a: [
      'Free accounts get the brief at roughly 7:00 AM in your local timezone.',
      'Brief Pro lets you pick any send time you want, down to the minute, in your settings.',
    ],
  },
  {
    q: 'How do I change what is in my brief?',
    a: [
      'Open your dashboard and click any module card to edit it, or hit "Add module" to add a new one.',
      'You can drag modules to reorder them — the order on the dashboard is the order in your email.',
    ],
  },
  {
    q: 'What are credits and how do they work?',
    a: [
      'Each module costs a small number of credits. Lightweight modules like Quote or Affirmation cost 1 credit; richer ones like News or AI & Tech cost 2.',
      'Free accounts get 3 credits. Brief Pro accounts get 12. Remove a module to free up credits for another.',
    ],
  },
  {
    q: 'How much does Brief Pro cost?',
    a: [
      'Brief Pro is $9 per month. Cancel anytime from your settings.',
      'Pro unlocks all 22 modules, custom send time, 12 credits, and full topic customization on News, AI & Tech, Reddit, Podcast, and Local Events.',
    ],
  },
  {
    q: 'How do I cancel my subscription?',
    a: [
      'Go to Settings, scroll to "Subscription", and click "Manage subscription" to open the Stripe customer portal.',
      'Cancellations take effect at the end of your current billing period; you keep Pro features until then. We do not pro-rate refunds for partial months.',
    ],
  },
  {
    q: 'I unsubscribed but I still have an account, what now?',
    a: [
      'Unsubscribe just pauses your morning brief — your account, modules, and subscription stay intact. You can re-enable delivery anytime from Settings.',
      'To fully close your account, use "Delete account" in Settings (you will be asked to type your email to confirm).',
    ],
  },
  {
    q: 'How do I export my data?',
    a: [
      'Settings → "Download my data" returns a JSON file with your profile, modules, and send history.',
      'No additional verification is needed — the download is gated to your authenticated session.',
    ],
  },
  {
    q: 'How do I delete my account?',
    a: [
      'Settings → "Delete account". You will be asked to type your email to confirm.',
      'Deletion is permanent and immediate. Your profile, modules, send logs, and Supabase auth record are all removed.',
    ],
  },
  {
    q: 'I did not get my brief this morning. What happened?',
    a: [
      'A few things can cause this: a bounce on your inbox, your account is set to inactive, every module errored out at fetch time, or our morning send job hit a transient issue. We run a catch-up pass a few hours later, so check again later in the day.',
      'If you still are not seeing it the next day, email us at ' + SUPPORT_EMAIL + ' and we will dig into the send log for your account.',
    ],
  },
  {
    q: 'Can I have the brief sent to a different email?',
    a: [
      'Yes. Settings → "Delivery email" lets you point delivery at any address you control.',
      'Your account email (used for sign-in and account recovery) stays as it was.',
    ],
  },
  {
    q: 'Where do news articles and links come from?',
    a: [
      'We use a curated set of mainstream outlets (Reuters, AP, BBC, NYT, WSJ, Bloomberg, The Verge, and others). You can also pin specific publications in the News module to turn that into a hard whitelist.',
      'Every article link is validated before the email goes out — if a URL is broken or points at a homepage, we drop the link rather than ship something dead.',
    ],
  },
  {
    q: 'Is my data private? Do you train on it?',
    a: [
      'We do not sell your data, we do not run advertising, and we do not use tracking cookies. Your module preferences are sent to a third-party content-generation service to assemble your brief, but never your name or email.',
      'See the Privacy Policy for the full breakdown.',
    ],
  },
];

function renderAnswer(answer: string | string[]) {
  const paras = Array.isArray(answer) ? answer : [answer];
  return paras.map((p, i) => (
    <p key={i} className="mb-3 leading-relaxed text-[#444] last:mb-0">{p}</p>
  ));
}

export default function HelpPage() {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    function onScroll() { setShowBackToTop(window.scrollY > 200); }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white antialiased">
      <TopNav variant="marketing" />

      <main className="mx-auto max-w-3xl px-6 py-16">
        {/* Header */}
        <div className="mb-12 space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-[#0D0D0F]">Help &amp; FAQ</h1>
          <p className="text-sm text-[#999]">Last updated: {LAST_UPDATED}</p>
          <p className="text-base leading-relaxed text-[#555]">
            Quick answers to the questions we hear most. If you do not see yours, email us.
          </p>
        </div>

        {/* FAQ list */}
        <div className="space-y-3">
          {FAQS.map((item, idx) => (
            <details
              key={idx}
              className="group rounded-xl border border-surface-border bg-white px-5 py-4 open:bg-surface-secondary/40"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium text-[#0D0D0F]">
                <span>{item.q}</span>
                <span
                  aria-hidden="true"
                  className="text-xl leading-none text-ink-muted transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <div className="mt-3 border-t border-surface-border pt-3">
                {renderAnswer(item.a)}
              </div>
            </details>
          ))}
        </div>

        {/* Contact block */}
        <section className="mt-16 rounded-2xl border border-surface-border bg-surface-secondary p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-[#0D0D0F]">Still stuck? Email us.</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#555]">
            We read every message. Include your account email so we can look up your send history.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-4 inline-flex items-center rounded-md bg-brand-purple px-4 py-2 text-sm font-medium text-white hover:bg-brand-purple-dark transition-colors"
          >
            {SUPPORT_EMAIL}
          </a>
        </section>

        {/* Footer nav */}
        <div className="mt-16 flex gap-4 border-t border-gray-100 pt-8 text-sm text-[#999]">
          <Link href="/" className="hover:text-[#333] transition-colors">← Back to home</Link>
          <Link href="/privacy" className="hover:text-[#333] transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-[#333] transition-colors">Terms of Service</Link>
        </div>
      </main>

      {showBackToTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-50 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs text-[#666] shadow-sm transition-colors hover:border-gray-300 hover:text-[#333]"
        >
          ↑ Back to top
        </button>
      )}
    </div>
  );
}
