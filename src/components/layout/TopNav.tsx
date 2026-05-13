'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Logo from './Logo';

// ─── Marketing variant ────────────────────────────────────────

function MarketingNav() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-surface-border bg-surface">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Logo size="md" />
        <nav className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm text-ink-muted transition-colors hover:text-ink"
          >
            Sign in
          </Link>
          <Button asChild size="sm">
            <Link href="/signup">Get started</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

// ─── Auth variant ─────────────────────────────────────────────

function AuthNav({ mode }: { mode: 'login' | 'signup' }) {
  return (
    <header className="w-full border-b border-surface-border bg-surface">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Logo size="md" />
        <p className="text-sm text-ink-muted">
          {mode === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="font-medium text-brand-purple hover:text-brand-purple-dark">
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-brand-purple hover:text-brand-purple-dark">
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>
    </header>
  );
}

// ─── Dashboard variant ────────────────────────────────────────

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/preview', label: 'Preview' },
  { href: '/dashboard/upgrade', label: 'Upgrade' },
];

function DashboardNav({ email }: { email: string }) {
  const pathname = usePathname();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-surface-border bg-surface">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Logo size="md" />
          <nav className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'text-sm transition-colors',
                  pathname === href
                    ? 'font-medium text-brand-purple'
                    : 'text-ink-muted hover:text-ink'
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-ink-faint sm:block">{email}</span>
          <div className="hidden h-4 w-px bg-surface-border sm:block" />
          <Button
            variant="ghost"
            size="sm"
            className="text-ink-muted hover:text-ink"
            onClick={handleSignOut}
          >
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}

// ─── Exported component ───────────────────────────────────────

type TopNavProps =
  | { variant: 'marketing' }
  | { variant: 'auth'; mode: 'login' | 'signup' }
  | { variant: 'dashboard'; email: string };

export default function TopNav(props: TopNavProps) {
  if (props.variant === 'marketing') return <MarketingNav />;
  if (props.variant === 'auth') return <AuthNav mode={props.mode} />;
  return <DashboardNav email={props.email} />;
}
