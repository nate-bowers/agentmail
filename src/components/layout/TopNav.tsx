'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Menu, X, LayoutDashboard, Eye, Settings, Sparkles, LogOut,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Logo from './Logo';

// ─── Marketing variant ────────────────────────────────────────

function MarketingNav({ transparent }: { transparent?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setLoggedIn(true);
    });
    return () => window.removeEventListener('scroll', handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
          {loggedIn ? (
            <Button asChild size="sm">
              <Link href="/dashboard">Go to dashboard →</Link>
            </Button>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(
                  'text-sm transition-colors',
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
            </>
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

const BASE_NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/preview', label: 'Preview' },
  { href: '/dashboard/settings', label: 'Settings' },
];

function DashboardNav({ email, isPro }: { email: string; isPro?: boolean }) {
  const pathname = usePathname();
  const isFree = !isPro;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPostUpgradeBadge, setShowPostUpgradeBadge] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Post-upgrade celebration badge (temporary, right-side)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem('justUpgraded') === 'true') {
      sessionStorage.removeItem('justUpgraded');
      setShowPostUpgradeBadge(true);
      const timer = setTimeout(() => setShowPostUpgradeBadge(false), 10000);
      return () => clearTimeout(timer);
    }
  }, []);

  async function handleSignOut() {
    await createClient().auth.signOut();
    window.location.href = '/login';
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-surface-border bg-surface">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">

          {/* Left: logo + pro badge + desktop nav */}
          <div className="flex items-center gap-2">
            <Logo size="md" href="/dashboard" />

            {/* Permanent Pro badge */}
            {isPro && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-purple px-2.5 py-1 text-xs font-semibold text-white cursor-default hover:bg-brand-purple-dark transition-colors select-none ml-1">
                ✨ <span className="hidden xs:inline">Pro</span>
              </span>
            )}

            {/* Desktop nav links */}
            <nav className="hidden items-center gap-6 lg:flex ml-6">
              {BASE_NAV_LINKS.map(({ href, label }) => (
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
              {isFree && (
                <Link
                  href="/dashboard/upgrade"
                  className={cn(
                    'text-sm transition-colors',
                    pathname === '/dashboard/upgrade'
                      ? 'font-medium text-brand-purple'
                      : 'text-ink-muted hover:text-ink'
                  )}
                >
                  Upgrade
                </Link>
              )}
            </nav>
          </div>

          {/* Right: email + sign out (desktop) + post-upgrade badge + hamburger */}
          <div className="flex items-center gap-3">
            <AnimatePresence>
              {showPostUpgradeBadge && (
                <motion.span
                  key="post-upgrade-badge"
                  initial={{ opacity: 0, scale: 0.8, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -4 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="hidden sm:inline-flex items-center gap-1 rounded-full bg-brand-purple px-2.5 py-0.5 text-xs font-medium text-white"
                >
                  ✨ Pro
                </motion.span>
              )}
            </AnimatePresence>

            <a
              href="mailto:hello@dailybriefmail.com?subject=Daily%20Brief%20feedback"
              className="hidden text-sm text-ink-muted transition-colors hover:text-ink lg:inline"
            >
              Feedback
            </a>
            <span className="hidden text-xs text-ink-faint lg:block">{email}</span>
            <div className="hidden h-4 w-px bg-surface-border lg:block" />
            <Button
              variant="ghost"
              size="sm"
              className="hidden text-ink-muted hover:text-ink lg:inline-flex"
              onClick={handleSignOut}
            >
              Sign out
            </Button>

            {/* Mobile hamburger */}
            <button
              type="button"
              className="lg:hidden p-2 rounded-lg hover:bg-surface-secondary transition-colors"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen
                ? <X className="h-5 w-5 text-ink" />
                : <Menu className="h-5 w-5 text-ink" />
              }
            </button>
          </div>
        </div>
      </header>

      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/10 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile menu panel */}
      {mobileMenuOpen && (
        <div className="fixed left-0 right-0 top-14 z-50 border-b border-surface-border bg-white shadow-lg lg:hidden">
          <Link
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className={cn(
              'flex items-center gap-3 px-6 py-4 text-base border-b border-surface-border transition-colors',
              pathname === '/dashboard'
                ? 'text-brand-purple font-medium bg-brand-purple-light'
                : 'text-ink hover:bg-surface-secondary'
            )}
          >
            <LayoutDashboard className="h-5 w-5 shrink-0" />
            Dashboard
          </Link>
          <Link
            href="/dashboard/preview"
            onClick={() => setMobileMenuOpen(false)}
            className={cn(
              'flex items-center gap-3 px-6 py-4 text-base border-b border-surface-border transition-colors',
              pathname === '/dashboard/preview'
                ? 'text-brand-purple font-medium bg-brand-purple-light'
                : 'text-ink hover:bg-surface-secondary'
            )}
          >
            <Eye className="h-5 w-5 shrink-0" />
            Preview
          </Link>
          <Link
            href="/dashboard/settings"
            onClick={() => setMobileMenuOpen(false)}
            className={cn(
              'flex items-center gap-3 px-6 py-4 text-base border-b border-surface-border transition-colors',
              pathname === '/dashboard/settings'
                ? 'text-brand-purple font-medium bg-brand-purple-light'
                : 'text-ink hover:bg-surface-secondary'
            )}
          >
            <Settings className="h-5 w-5 shrink-0" />
            Settings
          </Link>
          {isFree && (
            <Link
              href="/dashboard/upgrade"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                'flex items-center gap-3 px-6 py-4 text-base border-b border-surface-border transition-colors',
                pathname === '/dashboard/upgrade'
                  ? 'text-brand-purple font-medium bg-brand-purple-light'
                  : 'text-ink hover:bg-surface-secondary'
              )}
            >
              <Sparkles className="h-5 w-5 shrink-0" />
              Upgrade to Pro
            </Link>
          )}

          {/* Bottom: email + sign out */}
          <div className="border-t border-surface-border">
            <p className="px-6 py-3 text-sm text-ink-muted truncate">{email}</p>
            <button
              type="button"
              onClick={() => { setMobileMenuOpen(false); handleSignOut(); }}
              className="flex w-full items-center gap-3 px-6 py-4 text-base text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Exported component ───────────────────────────────────────

type TopNavProps =
  | { variant: 'marketing'; transparent?: boolean }
  | { variant: 'auth'; mode: 'login' | 'signup' }
  | { variant: 'dashboard'; email: string; isPro?: boolean };

export default function TopNav(props: TopNavProps) {
  if (props.variant === 'marketing') return <MarketingNav transparent={props.transparent} />;
  if (props.variant === 'auth') return <AuthNav mode={props.mode} />;
  return <DashboardNav email={props.email} isPro={props.isPro} />;
}
