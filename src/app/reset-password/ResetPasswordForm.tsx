'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Supabase's reset link arrives at this page with the user already in a
// recovery session (handled by the auth listener). We just collect a new
// password and call updateUser. Any of the obvious failure modes — expired
// link, missing session, weak password, same-as-current — surface in line.
export default function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  // Verify the recovery session exists. If the user landed here cold (no link
  // click, or expired link) we show a clear "request a new link" affordance.
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setHasSession(!!data.session);
    })();
    return () => { cancelled = true; };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        const msg = err.message || 'Could not update password.';
        if (/same.*password/i.test(msg)) {
          setError('That is the same as your current password. Pick a different one.');
        } else if (/expired|invalid/i.test(msg)) {
          setError('This reset link has expired. Request a new one below.');
        } else {
          setError(msg);
        }
        return;
      }
      setDone(true);
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unexpected error.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-surface-border bg-white p-8 shadow-sm space-y-3 max-w-md w-full text-center">
        <div className="flex justify-center">
          <Check className="h-8 w-8 text-emerald-500" />
        </div>
        <p className="text-lg font-semibold text-ink">Password updated</p>
        <p className="text-sm text-ink-muted">Taking you to your dashboard…</p>
      </div>
    );
  }

  // Expired or missing recovery session.
  if (hasSession === false) {
    return (
      <div className="rounded-2xl border border-surface-border bg-white p-8 shadow-sm space-y-3 max-w-md w-full text-center">
        <p className="text-lg font-semibold text-ink">Reset link expired</p>
        <p className="text-sm text-ink-muted">
          The link in your email is no longer valid. Reset links expire after one hour.
        </p>
        <Link
          href="/forgot-password"
          className="inline-block mt-2 rounded-md bg-brand-purple px-4 py-2 text-sm font-medium text-white"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-surface-border bg-white p-8 shadow-sm space-y-6 max-w-md w-full">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Set a new password</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Pick something at least 6 characters long. You&rsquo;ll be signed in after saving.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="new-password" className="text-sm font-medium text-ink">New password</Label>
          <Input
            id="new-password"
            type="password"
            placeholder="At least 6 characters"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm-password" className="text-sm font-medium text-ink">Confirm</Label>
          <Input
            id="confirm-password"
            type="password"
            placeholder="Re-enter your new password"
            autoComplete="new-password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading || hasSession === null}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Save new password'
          )}
        </Button>
      </form>
    </div>
  );
}
