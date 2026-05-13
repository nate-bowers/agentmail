import Link from 'next/link';
import { XCircle } from 'lucide-react';
import { adminClient } from '@/lib/supabase/admin';
import { verifyUnsubscribeToken } from '@/lib/unsubscribe';
import UnsubscribeConfirm from './UnsubscribeConfirm';

interface UnsubscribePageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const { token } = await searchParams;

  // Invalid / missing token — show error immediately, no confirm step
  if (!token) {
    return <UnsubscribeError heading="Invalid link." body="No unsubscribe token was provided." />;
  }

  const userId = verifyUnsubscribeToken(token);
  if (!userId) {
    return (
      <UnsubscribeError
        heading="Invalid link."
        body="This unsubscribe link is not valid or has been tampered with. If you want to stop receiving emails, sign in and update your settings."
      />
    );
  }

  // Look up the email address to show in the confirmation UI
  const { data: profile } = await adminClient
    .from('profiles')
    .select('email, is_active')
    .eq('id', userId)
    .single();

  if (!profile) {
    return (
      <UnsubscribeError
        heading="Invalid link."
        body="We could not find an account associated with this link."
      />
    );
  }

  // Already unsubscribed — no confirm step needed
  if (!profile.is_active) {
    return (
      <UnsubscribeResult
        heading="Already unsubscribed."
        body="Your account is already set to not receive emails. No further action needed."
      />
    );
  }

  // Show confirmation step
  return (
    <div
      className="flex min-h-screen items-center justify-center px-6"
      style={{ background: '#0a0a0a', color: '#ededed' }}
    >
      <div className="w-full max-w-sm text-center">
        <h1
          className="mb-3 text-2xl tracking-tight"
          style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
        >
          Unsubscribe from AgentMail?
        </h1>

        <p className="mb-2 text-sm leading-relaxed" style={{ color: '#666' }}>
          You will stop receiving daily briefs at
        </p>
        <p className="mb-8 text-sm font-medium">{profile.email}</p>

        <UnsubscribeConfirm token={token} />

        <div className="mt-6">
          <Link
            href="/"
            className="text-xs transition-colors"
            style={{ color: '#444' }}
          >
            ← Back to AgentMail
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Shared result / error sub-components
// ─────────────────────────────────────────────────────────────

function UnsubscribeError({ heading, body }: { heading: string; body: string }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-6"
      style={{ background: '#0a0a0a', color: '#ededed' }}
    >
      <div className="w-full max-w-sm text-center">
        <div className="mb-5 flex justify-center">
          <XCircle className="h-8 w-8" style={{ color: '#666' }} />
        </div>
        <h1
          className="mb-3 text-2xl tracking-tight"
          style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
        >
          {heading}
        </h1>
        <p className="mb-8 text-sm leading-relaxed" style={{ color: '#555' }}>
          {body}
        </p>
        <Link href="/" className="text-xs" style={{ color: '#444' }}>
          ← Back to AgentMail
        </Link>
      </div>
    </div>
  );
}

function UnsubscribeResult({ heading, body }: { heading: string; body: string }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-6"
      style={{ background: '#0a0a0a', color: '#ededed' }}
    >
      <div className="w-full max-w-sm text-center">
        <h1
          className="mb-3 text-2xl tracking-tight"
          style={{ fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}
        >
          {heading}
        </h1>
        <p className="mb-8 text-sm leading-relaxed" style={{ color: '#555' }}>
          {body}
        </p>
        <Link href="/" className="text-xs" style={{ color: '#444' }}>
          ← Back to AgentMail
        </Link>
      </div>
    </div>
  );
}
