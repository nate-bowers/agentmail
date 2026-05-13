'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface AuthFormProps {
  mode: 'login' | 'signup';
  initialError?: string;
}

export default function AuthForm({ mode, initialError }: AuthFormProps) {
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'azure' | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  const isSignup = mode === 'signup';
  const anyLoading = loading || oauthLoading !== null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          setCheckEmail(true);
          return;
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
    // On success the browser navigates away — no need to reset state
  }

  if (checkEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Check your email</CardTitle>
            <CardDescription>
              We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">
            {isSignup ? 'Create an account' : 'Welcome back'}
          </CardTitle>
          <CardDescription>
            {isSignup
              ? 'Sign up to get your daily brief.'
              : 'Sign in to access your dashboard.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* OAuth providers */}
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
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
              className="w-full gap-2"
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

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          {/* Email / password */}
          <form id="auth-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
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

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
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

            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" form="auth-form" className="w-full" disabled={anyLoading}>
            {loading
              ? isSignup ? 'Creating account…' : 'Signing in…'
              : isSignup ? 'Create account' : 'Sign in'}
          </Button>

          <p className="text-sm text-muted-foreground text-center">
            {isSignup ? (
              <>
                Already have an account?{' '}
                <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
                  Sign in
                </Link>
              </>
            ) : (
              <>
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="underline underline-offset-4 hover:text-foreground">
                  Sign up
                </Link>
              </>
            )}
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
