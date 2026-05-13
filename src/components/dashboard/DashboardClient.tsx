'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Clock, Mail, Palette, User, Zap, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ModuleList from './ModuleList';
import OnboardingGate from '@/components/onboarding/OnboardingGate';
import { usePoints } from '@/hooks/usePoints';
import type { ModuleRow, Profile } from '@/types';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function formatSendTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function getTimezoneAbbr(tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' })
      .formatToParts(new Date())
      .find((p) => p.type === 'timeZoneName')?.value ?? tz;
  } catch { return tz; }
}

// ─────────────────────────────────────────────────────────────
// Sidebar card shell
// ─────────────────────────────────────────────────────────────

function SidebarCard({ icon, label, right, children }: {
  icon: React.ReactNode;
  label: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-surface-border border-t-[3px] border-t-brand-purple bg-white p-5">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          {icon}
          <span className="text-sm font-medium text-ink ml-2">{label}</span>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Recipient card
// ─────────────────────────────────────────────────────────────

function RecipientCard({ profile, accountEmail }: { profile: Profile; accountEmail: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(profile.delivery_email ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const displayEmail = profile.delivery_email ?? null;

  async function handleSave() {
    setError(null);
    const trimmed = value.trim();
    if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delivery_email: trimmed || null }),
      });
      if (!res.ok) throw new Error('Save failed');
      profile.delivery_email = trimmed || null;
      setEditing(false);
      if (trimmed) {
        toast.success(`Brief will be delivered to ${trimmed}`);
      } else {
        toast.success(`Reverted to account email: ${accountEmail}`);
      }
    } catch {
      toast.error('Failed to save delivery email.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SidebarCard
      icon={<Mail className="h-4 w-4 text-brand-purple" />}
      label="Recipient"
      right={
        !editing ? (
          <button
            onClick={() => { setValue(profile.delivery_email ?? ''); setEditing(true); setError(null); }}
            className="text-xs text-brand-purple hover:text-brand-purple-dark"
          >
            Edit
          </button>
        ) : null
      }
    >
      {!editing ? (
        displayEmail ? (
          <p className="text-sm font-medium text-ink">{displayEmail}</p>
        ) : (
          <p className="text-sm text-ink-muted italic">{accountEmail} <span className="not-italic text-ink-faint">(account email)</span></p>
        )
      ) : (
        <div className="space-y-2">
          <Input
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(null); }}
            placeholder={accountEmail}
            className="text-sm"
            autoFocus
          />
          <p className="text-xs text-ink-faint">Leave blank to use your account email</p>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setError(null); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </SidebarCard>
  );
}

// ─────────────────────────────────────────────────────────────
// Email Style card
// ─────────────────────────────────────────────────────────────

const APPEARANCE_OPTIONS = [
  { id: 'light', label: 'Light', color: '#ffffff', border: '#d1d5db' },
  { id: 'dark', label: 'Dark', color: '#0D0D0F', border: '#374151' },
  { id: 'pink', label: 'Pink', color: '#ffe4ea', border: '#f9a8d4' },
] as const;

function EmailStyleCard({ profile }: { profile: Profile }) {
  const [theme, setTheme] = useState(
    ['light', 'dark', 'pink'].includes(profile.email_theme) ? profile.email_theme : 'light'
  );
  const [verbosity, setVerbosity] = useState<'succinct' | 'medium' | 'wordy'>(
    (profile.email_verbosity as 'succinct' | 'medium' | 'wordy') ?? 'medium'
  );

  async function saveSetting(updates: { email_theme?: string; email_verbosity?: string }) {
    try {
      await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      toast.success('Style updated ✓', { duration: 1500 });
    } catch {
      toast.error('Failed to save style.');
    }
  }

  async function handleThemeChange(newTheme: string) {
    setTheme(newTheme);
    profile.email_theme = newTheme;
    await saveSetting({ email_theme: newTheme });
  }

  async function handleVerbosityChange(newVerbosity: 'succinct' | 'medium' | 'wordy') {
    setVerbosity(newVerbosity);
    profile.email_verbosity = newVerbosity;
    await saveSetting({ email_verbosity: newVerbosity });
  }

  return (
    <SidebarCard icon={<Palette className="h-4 w-4 text-brand-purple" />} label="Email Style">
      {/* Appearance */}
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wide text-ink-muted mb-2">Theme</p>
        <div className="flex gap-2">
          {APPEARANCE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              title={opt.label}
              onClick={() => handleThemeChange(opt.id)}
              className={`w-6 h-6 rounded-full border-2 transition-all ${
                theme === opt.id
                  ? 'border-brand-purple scale-110'
                  : 'border-transparent hover:border-surface-border'
              }`}
              style={{
                backgroundColor: opt.color,
                boxShadow: `inset 0 0 0 1px ${opt.border}`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Length */}
      <div className="mt-4">
        <p className="text-[10px] font-medium uppercase tracking-wide text-ink-muted mb-2">Length</p>
        <div className="flex gap-2">
          <button
            onClick={() => handleVerbosityChange('succinct')}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
              verbosity === 'succinct'
                ? 'border-brand-purple bg-brand-purple-light text-brand-purple'
                : 'border-surface-border text-ink hover:border-brand-purple/50'
            }`}
          >
            <Zap className="h-3 w-3" /> Succinct
          </button>
          <button
            onClick={() => handleVerbosityChange('wordy')}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
              verbosity === 'wordy'
                ? 'border-brand-purple bg-brand-purple-light text-brand-purple'
                : 'border-surface-border text-ink hover:border-brand-purple/50'
            }`}
          >
            <BookOpen className="h-3 w-3" /> Wordy
          </button>
        </div>
      </div>
    </SidebarCard>
  );
}

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────

interface DashboardClientProps {
  initialModules: ModuleRow[];
  profile: Profile;
  user: { id: string; email: string };
  isPro: boolean;
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

export default function DashboardClient({ initialModules, profile, user, isPro }: DashboardClientProps) {
  const [modules, setModules] = useState<ModuleRow[]>(initialModules);
  const [refreshing, setRefreshing] = useState(false);

  const refreshModules = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/modules');
      const data = await res.json();
      setModules(Array.isArray(data) ? data : []);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const { used: pointsUsed, limit: pointsLimit, percentUsed } = usePoints(modules, isPro);
  const atLimit = pointsUsed >= pointsLimit;
  const tzAbbr = getTimezoneAbbr(profile.timezone);

  return (
    <>
      {!profile.has_onboarded && <OnboardingGate userId={user.id} />}

      <div className="py-2 lg:grid lg:grid-cols-3 lg:gap-8 lg:items-start">
        {/* Main — 2 cols */}
        <div className="lg:col-span-2">
          <ModuleList
            modules={modules}
            onModulesChange={setModules}
            onRefresh={refreshModules}
            refreshing={refreshing}
            isPro={isPro}
          />
        </div>

        {/* Sidebar — 1 col */}
        <div className="mt-8 space-y-4 lg:mt-0">
          {/* CARD 1 — Delivery */}
          <SidebarCard
            icon={<Clock className="h-4 w-4 text-brand-purple" />}
            label="Delivery"
          >
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-ink">{formatSendTime(profile.send_time)}</span>
              <span className="text-ink-muted">{tzAbbr}</span>
            </div>
            <Link
              href="/dashboard/settings"
              className="mt-2 inline-block text-xs text-brand-purple hover:text-brand-purple-dark"
            >
              Edit settings →
            </Link>
          </SidebarCard>

          {/* CARD 2 — Recipient */}
          <RecipientCard profile={profile} accountEmail={user.email} />

          {/* CARD 3 — Email Style */}
          <EmailStyleCard profile={profile} />

          {/* CARD 4 — Account */}
          <SidebarCard icon={<User className="h-4 w-4 text-brand-purple" />} label="Account">
            <p className="text-sm text-ink-muted truncate">{user.email}</p>
            <div className="mt-2 flex items-center gap-2">
              {isPro ? (
                <span className="inline-flex items-center rounded-full bg-brand-purple px-2.5 py-0.5 text-xs font-medium text-white">
                  Pro
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-surface-border bg-surface-secondary px-2.5 py-0.5 text-xs font-medium text-ink-muted">
                  Free
                </span>
              )}
            </div>

            {/* Compact points mini-bar */}
            <div className="mt-3 space-y-1.5">
              <p className="text-xs text-ink-muted">{pointsUsed} / {pointsLimit} credits</p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-border">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    refreshing ? 'animate-pulse bg-brand-purple/50' : atLimit ? 'bg-red-500' : 'bg-brand-purple'
                  }`}
                  style={{ width: `${percentUsed}%` }}
                />
              </div>
            </div>

            {!isPro && (
              <Link
                href="/dashboard/upgrade"
                className="mt-3 inline-block text-sm text-brand-purple hover:text-brand-purple-dark"
              >
                Upgrade to Pro →
              </Link>
            )}
            {isPro && (
              <Link
                href="/dashboard/settings"
                className="mt-3 inline-block text-sm text-brand-purple hover:text-brand-purple-dark"
              >
                Manage subscription
              </Link>
            )}
          </SidebarCard>
        </div>
      </div>
    </>
  );
}
