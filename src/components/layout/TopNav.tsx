'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Logo from './Logo';

// ─── Marketing variant ────────────────────────────────────────

function MarketingNav({ transparent }: { transparent?: boolean }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-all duration-300',
        transparent
          ? ''
          : scrolled
            ? 'shadow-sm backdrop-blur-sm bg-white/95 border-b border-surface-border'
            : 'bg-white border-b border-transparent'
      )}
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Logo size="md" light={transparent} />
        <nav className="flex items-center gap-4">
          <Link
            href="/login"
            className={cn(
              'hidden sm:block text-sm transition-colors',
              transparent ? 'text-white/70 hover:text-white' : 'text-ink-muted hover:text-ink'
            )}
          >
            Sign in
          </Link>
          {transparent ? (
            <Link
              href="/signup"
              className="rounded-lg bg-white px-3.5 py-1.5 text-sm font-medium text-[#0D0D0F] transition-colors hover:bg-white/90"
            >
              Get started
            </Link>
          ) : (
            <Button asChild size="sm">
              <Link href="/signup">Get started</Link>
            </Button>
          )}
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
  { href: '/dashboard/settings', label: 'Settings' },
];

function DashboardNav({ email }: { email: string }) {
  const pathname = usePathname();
  const supabase = createClient();
  const [showProBadge, setShowProBadge] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem('justUpgraded') === 'true') {
      sessionStorage.removeItem('justUpgraded');
      setShowProBadge(true);
      const timer = setTimeout(() => setShowProBadge(false), 10000);
      return () => clearTimeout(timer);
    }
  }, []);

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
          <AnimatePresence>
            {showProBadge && (
              <motion.span
                key="pro-badge"
                initial={{ opacity: 0, scale: 0.8, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -4 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="inline-flex items-center gap-1 rounded-full bg-brand-purple px-2.5 py-0.5 text-xs font-medium text-white"
              >
                ✨ Pro
              </motion.span>
            )}
          </AnimatePresence>
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
  | { variant: 'marketing'; transparent?: boolean }
  | { variant: 'auth'; mode: 'login' | 'signup' }
  | { variant: 'dashboard'; email: string };

export default function TopNav(props: TopNavProps) {
  if (props.variant === 'marketing') return <MarketingNav transparent={props.transparent} />;
  if (props.variant === 'auth') return <AuthNav mode={props.mode} />;
  return <DashboardNav email={props.email} />;
}
