'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Sparkles, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AuthFormProps {
  mode: 'login' | 'signup';
  initialError?: string;
}

export default function AuthForm({ mode, initialError }: AuthFormProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'azure' | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [proSelected, setProSelected] = useState(false);

  const isSignup = mode === 'signup';
  const anyLoading = loading || oauthLoading !== null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    try {
      if (isSignup) {
        // Block disposable email providers BEFORE creating a Supabase auth
        // record. Otherwise an account exists, sends 3 previews / 3 test
        // sends / 3 welcome tests, then the user vanishes.
        const checkRes = await fetch('/api/auth/check-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        if (!checkRes.ok) {
          const body = await checkRes.json().catch(() => ({}));
          const msg =
            typeof body?.message === 'string'
              ? body.message
              : 'We could not validate that email. Please try a different address.';
          setError(msg);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          setCheckEmail(true);
          return;
        }
        if (fullName.trim()) {
          await fetch('/api/user/settings', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name: fullName.trim() }),
          });
        }
        // Fire-and-forget one-time welcome email. Idempotent server-side
        // via the welcome_email_sent flag, so a stale-tab retry does not
        // double-send. Awaited but with a short timeout so a slow Resend
        // call cannot strand the user on the signup card.
        try {
          await fetch('/api/welcome-email', { method: 'POST' });
        } catch (welcomeErr) {
          console.error('[AuthForm] welcome email trigger failed:', welcomeErr);
        }
        window.location.href = '/dashboard';
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = '/dashboard';
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: 'google' | 'azure') {
    setError(null);
    setOauthLoading(provider);
    const supabase = createClient();
    const scopes = provider === 'azure' ? 'openid email profile User.Read' : 'openid email profile';
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes,
      },
    });
    if (error) {
      setError(error.message);
      setOauthLoading(null);
    }
  }

  if (checkEmail) {
    return (
      <div className="rounded-2xl border border-surface-border bg-white p-8 shadow-sm text-center space-y-4 max-w-md w-full">
        <div className="space-y-2">
          <p className="text-lg font-semibold text-ink">Check your email</p>
          <p className="text-sm text-ink-muted">
            We sent a confirmation link to <span className="font-medium text-ink">{email}</span>.
            Click it to activate your account.
          </p>
        </div>
        <div className="rounded-lg border border-brand-purple/20 bg-brand-purple-light px-3 py-2 text-left">
          <p className="text-xs leading-relaxed text-brand-purple">
            <span className="font-semibold">Heads up:</span> your first email may land in spam or Promotions.
            We&rsquo;ll help you fix that in a moment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-surface-border bg-white p-8 shadow-sm space-y-6 max-w-md w-full">
      {/* Heading */}
      <div>
        <h1 className="text-2xl font-semibold text-ink">
          {isSignup ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {isSignup ? 'Start your free daily brief today' : 'Sign in to your Daily Brief'}
        </p>
      </div>

      {/* OAuth buttons */}
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2 border-surface-border"
          disabled={anyLoading}
          onClick={() => handleOAuth('google')}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          {oauthLoading === 'google' ? 'Redirecting…' : 'Continue with Google'}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full gap-2 border-surface-border"
          disabled={anyLoading}
          onClick={() => handleOAuth('azure')}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
            <path d="M11.4 24H0l8.4-14.6L3.1 0h8.3l5.1 9.4L24 0h-8.3l-4.3 7.5z" fill="#F25022" />
            <path d="M11.4 24l8.3-14.6H24L11.4 24z" fill="#7FBA00" />
            <path d="M0 24l8.4-14.6H0V24z" fill="#00A4EF" />
            <path d="M24 0l-8.3 14.6H24V0z" fill="#FFB900" />
          </svg>
          {oauthLoading === 'azure' ? 'Redirecting…' : 'Continue with Microsoft'}
        </Button>
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-surface-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-ink-faint">or</span>
        </div>
      </div>

      {/* Email/password form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {isSignup && (
          <div className="space-y-1.5">
            <Label htmlFor="full-name" className="text-sm font-medium text-ink">Full name</Label>
            <Input
              id="full-name"
              type="text"
              placeholder="Your name"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
        )}

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

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium text-ink">Password</Label>
            {!isSignup && (
              <Link href="/forgot-password" className="text-xs text-brand-purple hover:text-brand-purple-dark">
                Forgot password?
              </Link>
            )}
          </div>
          <Input
            id="password"
            type="password"
            placeholder={isSignup ? 'At least 6 characters' : '••••••••'}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={anyLoading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isSignup ? 'Creating account…' : 'Signing in…'}
            </>
          ) : (
            isSignup ? 'Create account' : 'Sign in'
          )}
        </Button>
      </form>

      {/* Footer link */}
      <p className="text-center text-sm text-ink-muted">
        {isSignup ? (
          <>
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-brand-purple hover:text-brand-purple-dark">
              Sign in
            </Link>
          </>
        ) : (
          <>
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-medium text-brand-purple hover:text-brand-purple-dark">
              Sign up
            </Link>
          </>
        )}
      </p>

      {/* Pro CTA — signup only */}
      {isSignup && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-surface-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-ink-faint">or</span>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-brand-purple/20 bg-brand-purple-light p-4">
            <Sparkles className="h-5 w-5 shrink-0 text-brand-purple" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink">Start with Brief Pro</p>
              <p className="text-xs text-ink-muted mt-0.5">12 credits, all modules, custom delivery time. $9/month.</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant={proSelected ? 'outline' : 'default'}
              className={proSelected ? 'border-brand-purple text-brand-purple shrink-0' : 'shrink-0'}
              onClick={() => {
                localStorage.setItem('pendingPro', 'true');
                setProSelected(true);
              }}
            >
              {proSelected ? (
                <span className="flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> Selected
                </span>
              ) : (
                'Start Pro →'
              )}
            </Button>
          </div>

          {proSelected && (
            <p className="text-center text-xs text-brand-purple">
              ✓ Pro plan selected. Finish signing up above to continue.
            </p>
          )}
        </>
      )}
    </div>
  );
}
