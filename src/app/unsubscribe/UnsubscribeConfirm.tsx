'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UnsubscribeConfirm({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as Record<string, string>).error ?? 'Something went wrong. Please try again.');
        return;
      }

      setDone(true);
    } catch {
      setError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-4">
        <p className="text-sm" style={{ color: '#888' }}>
          You&apos;ve been unsubscribed. You can re-enable delivery any time from your account settings.
        </p>
        <button
          onClick={() => router.push('/dashboard/settings')}
          className="text-xs transition-colors"
          style={{ color: '#555' }}
        >
          Manage settings →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-xs" style={{ color: '#c0392b' }}>
          {error}
        </p>
      )}
      <button
        onClick={handleConfirm}
        disabled={loading}
        className="w-full rounded-none border px-5 py-2.5 text-sm tracking-wide transition-colors disabled:opacity-50"
        style={{ borderColor: '#333', color: '#ededed', background: 'transparent' }}
      >
        {loading ? 'Unsubscribing…' : 'Yes, unsubscribe me'}
      </button>
    </div>
  );
}
