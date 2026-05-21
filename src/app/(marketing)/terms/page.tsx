'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import TopNav from '@/components/layout/TopNav';

const LAST_UPDATED = 'May 21, 2026';

const sections = [
  {
    id: 'acceptance',
    title: '1. Acceptance of Terms',
    content: `By accessing or using Daily Brief, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the service.`,
  },
  {
    id: 'description',
    title: '2. Description of Service',
    content: `Daily Brief is a personalized email newsletter service that delivers daily briefings tailored to your interests. Content is assembled from public web sources at the time your brief is generated. We do not guarantee the accuracy, completeness, or timeliness of any content delivered through the service.`,
  },
  {
    id: 'accounts',
    title: '3. User Accounts',
    content: `You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You must provide a valid email address. Accounts are limited to one per person. You must be 13 years of age or older to use this service.`,
  },
  {
    id: 'acceptable-use',
    title: '4. Acceptable Use',
    content: `You agree not to use Daily Brief to: circumvent technical limitations or access controls; scrape, reproduce, or resell content from the service for commercial purposes; submit false, misleading, or harmful configuration data; or violate any applicable local, state, national, or international laws or regulations.`,
  },
  {
    id: 'billing',
    title: '5. Subscription and Billing',
    content: `The free tier is free forever, subject to feature limitations. Paid plans are billed monthly via Stripe. You may cancel your subscription at any time from your dashboard settings. Cancellations take effect at the end of the current billing period. We do not offer refunds for partial months. We reserve the right to change pricing with 30 days advance notice.`,
  },
  {
    id: 'content-disclaimer',
    title: '6. Content Disclaimer',
    content: `Content delivered by Daily Brief is sourced and summarized automatically from public web sources and may contain errors, inaccuracies, or outdated information. Daily Brief is not a financial advisor, medical advisor, news publisher, or professional service provider. Do not make important financial, medical, legal, or other significant decisions based solely on content delivered through this service. Always verify important information with primary sources.`,
  },
  {
    id: 'ip',
    title: '7. Intellectual Property',
    content: `You retain ownership of your personal configuration data and preferences. Daily Brief retains ownership of the platform, branding, codebase, and underlying technology. Email content delivered through the service is provided for your personal, non-commercial use only and may not be redistributed or resold.`,
  },
  {
    id: 'termination',
    title: '8. Termination',
    content: `We reserve the right to suspend or terminate accounts that violate these terms, engage in abusive behavior, or otherwise act in ways that harm the service or other users. You may delete your account at any time from your dashboard settings. Termination does not entitle you to a refund.`,
  },
  {
    id: 'liability',
    title: '9. Limitation of Liability',
    content: `Daily Brief is provided "as is" without warranties of any kind, express or implied. To the fullest extent permitted by law, we are not liable for any damages arising from your use of the service, including but not limited to damages from inaccurate content, service interruptions, or data loss.`,
  },
  {
    id: 'changes',
    title: '10. Changes to Terms',
    content: `We may update these Terms of Service from time to time. We will notify users of material changes by email or by posting a notice in the application. Continued use of the service after changes take effect constitutes acceptance of the revised terms.`,
  },
  {
    id: 'contact',
    title: '11. Contact',
    content: `For questions about these Terms of Service, please contact us at: support@dailybriefmail.com.`,
  },
];

export default function TermsPage() {
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
          <h1 className="text-4xl font-bold tracking-tight text-[#0D0D0F]">Terms of Service</h1>
          <p className="text-sm text-[#999]">Last updated: {LAST_UPDATED}</p>
          <p className="text-base leading-relaxed text-[#555]">
            Please read these terms carefully before using Daily Brief.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {sections.map((section) => (
            <div key={section.id} id={section.id}>
              <h2 className="mb-3 text-lg font-semibold text-[#0D0D0F]">{section.title}</h2>
              <p className="leading-relaxed text-[#444]">{section.content}</p>
            </div>
          ))}
        </div>

        {/* Footer nav */}
        <div className="mt-16 flex gap-4 border-t border-gray-100 pt-8 text-sm text-[#999]">
          <Link href="/" className="hover:text-[#333] transition-colors">← Back to home</Link>
          <Link href="/privacy" className="hover:text-[#333] transition-colors">Privacy Policy</Link>
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
