'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Submits to /api/auth/forgot-password. The endpoint always returns the
// generic 200 message regardless of whether the email is registered, so this
// component never reveals account existence.
export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg =
          typeof body?.error === 'string'
            ? body.error
            : 'Please enter a valid email address.';
        setError(msg);
        return;
      }
      setSubmitted(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-surface-border bg-white p-8 shadow-sm space-y-3 max-w-md w-full text-center">
        <p className="text-lg font-semibold text-ink">Check your email</p>
        <p className="text-sm text-ink-muted">
          If an account exists for <span className="font-medium text-ink">{email}</span>, we&rsquo;ve sent a reset link.
          The link expires in one hour.
        </p>
        <p className="text-xs text-ink-faint pt-2">
          Don&rsquo;t see it? Check your spam folder. You can also{' '}
          <button
            type="button"
            onClick={() => { setSubmitted(false); setEmail(''); }}
            className="font-medium text-brand-purple hover:text-brand-purple-dark underline underline-offset-2"
          >
            try a different email
          </button>.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-surface-border bg-white p-8 shadow-sm space-y-6 max-w-md w-full">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Reset your password</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Enter your account email and we&rsquo;ll send you a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium text-ink">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            'Send reset link'
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-ink-muted">
        Remembered your password?{' '}
        <Link href="/login" className="font-medium text-brand-purple hover:text-brand-purple-dark">
          Sign in
        </Link>
      </p>
    </div>
  );
}
