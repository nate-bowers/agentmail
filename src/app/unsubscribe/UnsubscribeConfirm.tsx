'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Action = 'unsubscribe' | 'resubscribe' | 'delete';

interface Props {
  token: string;
  /** Initial subscription state pulled server-side. Drives which button shows by default. */
  initiallyActive: boolean;
}

export default function UnsubscribeConfirm({ token, initiallyActive }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<Action | null>(null);
  const [done, setDone] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function run(action: Action) {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as Record<string, string>).error ?? 'Something went wrong. Please try again.');
        return;
      }
      setDone(action);
    } catch {
      setError('A network error occurred. Please try again.');
    } finally {
      setLoading(null);
    }
  }

  if (done) {
    const heading =
      done === 'unsubscribe' ? 'Paused.' :
      done === 'resubscribe' ? 'Welcome back.' :
      'Account deleted.';
    const body =
      done === 'unsubscribe'
        ? 'You will not receive any more daily briefs. You can resume any time from this page or your dashboard settings.'
        : done === 'resubscribe'
          ? 'Your briefs will resume on the next scheduled send.'
          : 'Your account and all data have been removed. Thanks for trying Daily Brief.';
    return (
      <div className="space-y-4">
        <p className="text-base" style={{ color: '#ededed', fontFamily: 'Georgia, "Times New Roman", ui-serif, serif' }}>
          {heading}
        </p>
        <p className="text-sm" style={{ color: '#888' }}>{body}</p>
        {done !== 'delete' && (
          <button
            onClick={() => router.push('/dashboard/settings')}
            className="text-xs transition-colors"
            style={{ color: '#555' }}
          >
            Manage settings →
          </button>
        )}
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

      {/* Primary action: pause if currently active, resume if not. */}
      {initiallyActive ? (
        <button
          onClick={() => run('unsubscribe')}
          disabled={loading !== null}
          className="w-full rounded-none border px-5 py-2.5 text-sm tracking-wide transition-colors disabled:opacity-50"
          style={{ borderColor: '#333', color: '#ededed', background: 'transparent' }}
        >
          {loading === 'unsubscribe' ? 'Pausing…' : 'Pause my daily brief'}
        </button>
      ) : (
        <button
          onClick={() => run('resubscribe')}
          disabled={loading !== null}
          className="w-full rounded-none border px-5 py-2.5 text-sm tracking-wide transition-colors disabled:opacity-50"
          style={{ borderColor: '#333', color: '#ededed', background: 'transparent' }}
        >
          {loading === 'resubscribe' ? 'Resuming…' : 'Resume my daily brief'}
        </button>
      )}

      {/* Destructive action: hard delete. Two-step confirm. */}
      {!confirmDelete ? (
        <button
          onClick={() => setConfirmDelete(true)}
          disabled={loading !== null}
          className="w-full text-xs underline underline-offset-4 transition-colors disabled:opacity-50"
          style={{ color: '#666' }}
        >
          Or delete my account permanently
        </button>
      ) : (
        <div className="space-y-2 pt-1">
          <p className="text-xs" style={{ color: '#888' }}>
            This removes your account, modules, and history. It cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => run('delete')}
              disabled={loading !== null}
              className="flex-1 rounded-none border px-5 py-2 text-xs tracking-wide transition-colors disabled:opacity-50"
              style={{ borderColor: '#5a1f1f', color: '#e6b3b3', background: 'transparent' }}
            >
              {loading === 'delete' ? 'Deleting…' : 'Yes, delete'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={loading !== null}
              className="flex-1 rounded-none border px-5 py-2 text-xs tracking-wide transition-colors disabled:opacity-50"
              style={{ borderColor: '#333', color: '#888', background: 'transparent' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
