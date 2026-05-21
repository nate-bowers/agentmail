'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import TopNav from '@/components/layout/TopNav';

const LAST_UPDATED = 'May 21, 2026';

const sections = [
  {
    id: 'introduction',
    title: '1. Introduction',
    content: `Daily Brief ("we", "us", "our") operates dailybriefmail.com. This Privacy Policy explains what data we collect, how we use it, and your rights with respect to it.`,
  },
  {
    id: 'data-collected',
    title: '2. Data We Collect',
    content: `We collect the following information:\n\n• Account data: your email address, name, and authentication credentials (passwords are hashed by Supabase Auth — we never store plain-text passwords).\n\n• Configuration data: your module preferences, locations, topics, and other settings you provide when customizing your brief.\n\n• Usage data: email send logs and delivery status.\n\n• Payment data: subscription and billing status. All payment processing is handled by Stripe. We never see, store, or process your card details.`,
  },
  {
    id: 'how-we-use',
    title: '3. How We Use Your Data',
    content: `We use your data to:\n\n• Generate and deliver your personalized daily email brief.\n\n• Manage your account and subscription.\n\n• Improve the reliability and quality of the service.\n\nWe do not sell your data to third parties. We do not share your module configuration or personal details with advertisers.`,
  },
  {
    id: 'third-party-processing',
    title: '4. Third-Party Service Providers',
    content: `We rely on a small set of trusted third-party service providers to operate Daily Brief, including providers for content generation, email delivery (Resend), and payment processing (Stripe). We share only the minimum information necessary with each provider. For content generation we send your preferences and configuration (such as topics, locations, and interests), and we do not share your name or email address. Each provider's own privacy policy governs their handling of any data shared with them.`,
  },
  {
    id: 'email-delivery',
    title: '5. Email Delivery',
    content: `Emails are sent via Resend, a transactional email service. Your email address is shared with Resend solely for the purpose of delivering your daily brief. Resend's privacy policy governs their handling of this data.`,
  },
  {
    id: 'retention',
    title: '6. Data Retention',
    content: `Your data is retained for as long as your account remains active. Upon account deletion, your profile, module configuration, and associated data will be permanently deleted within 30 days.`,
  },
  {
    id: 'cookies',
    title: '7. Cookies',
    content: `We use only essential session cookies required for authentication. We do not use tracking cookies, advertising cookies, or third-party analytics cookies.`,
  },
  {
    id: 'your-rights',
    title: '8. Your Rights',
    content: `You may request a copy of the personal data we hold about you, ask us to correct inaccuracies, or delete your account at any time from your dashboard settings. For data requests, contact us at: support@dailybriefmail.com.`,
  },
  {
    id: 'security',
    title: '9. Security',
    content: `Your data is stored in Supabase (PostgreSQL) with row-level security policies that prevent unauthorized access. Authentication credentials are never stored in plain text. All data is transmitted over HTTPS with TLS encryption.`,
  },
  {
    id: 'children',
    title: '10. Children',
    content: `Daily Brief is not intended for users under the age of 13. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact us so we can delete it.`,
  },
  {
    id: 'changes',
    title: '11. Changes to This Policy',
    content: `We will notify users of material changes to this Privacy Policy via email before they take effect. Continued use of the service after changes take effect constitutes acceptance of the revised policy.`,
  },
  {
    id: 'contact',
    title: '12. Contact',
    content: `For privacy-related questions or data requests, please contact us at: support@dailybriefmail.com.`,
  },
];

function renderContent(content: string) {
  return content.split('\n\n').map((para, i) => (
    <p key={i} className="mb-3 leading-relaxed text-[#444]">
      {para}
    </p>
  ));
}

export default function PrivacyPage() {
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
          <h1 className="text-4xl font-bold tracking-tight text-[#0D0D0F]">Privacy Policy</h1>
          <p className="text-sm text-[#999]">Last updated: {LAST_UPDATED}</p>
          <p className="text-base leading-relaxed text-[#555]">
            This policy explains how Daily Brief handles your personal information.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {sections.map((section) => (
            <div key={section.id} id={section.id}>
              <h2 className="mb-3 text-lg font-semibold text-[#0D0D0F]">{section.title}</h2>
              {renderContent(section.content)}
            </div>
          ))}
        </div>

        {/* Footer nav */}
        <div className="mt-16 flex gap-4 border-t border-gray-100 pt-8 text-sm text-[#999]">
          <Link href="/" className="hover:text-[#333] transition-colors">← Back to home</Link>
          <Link href="/terms" className="hover:text-[#333] transition-colors">Terms of Service</Link>
        </div>
      </main>

      {/* Back to top */}
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
