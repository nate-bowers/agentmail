'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Clock, Mail, Palette, User, Zap, BookOpen, Check, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { useDebounce } from 'use-debounce';
import { Input } from '@/components/ui/input';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import ModuleList from './ModuleList';
import OnboardingGate from '@/components/onboarding/OnboardingGate';
import { usePoints } from '@/hooks/usePoints';
import { TIMEZONES } from '@/lib/timezones';
import type { ModuleRow, Profile } from '@/types';
import React from 'react';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function getTimezoneAbbr(tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' })
      .formatToParts(new Date())
      .find((p) => p.type === 'timeZoneName')?.value ?? tz;
  } catch { return tz; }
}

// Build hour options for 12-hour time picker
const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const h = i + 1;
  return { value: String(h), label: String(h) };
});

const MINUTE_OPTIONS = [
  { value: '00', label: ':00' },
  { value: '30', label: ':30' },
];

const AMPM_OPTIONS = [
  { value: 'AM', label: 'AM' },
  { value: 'PM', label: 'PM' },
];

function parse24(time: string): { hour: string; minute: string; ampm: 'AM' | 'PM' } {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = String(h % 12 || 12);
  const minute = m === 30 ? '30' : '00';
  return { hour, minute, ampm: ampm as 'AM' | 'PM' };
}

function to24(hour: string, minute: string, ampm: string): string {
  let h = parseInt(hour, 10);
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${minute}`;
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
// Delivery card — inline time picker + timezone combobox
// ─────────────────────────────────────────────────────────────

function DeliveryCard({ profile }: { profile: Profile }) {
  const parsed = parse24(profile.send_time);
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [ampm, setAmpm] = useState<'AM' | 'PM'>(parsed.ampm);
  const [timezone, setTimezone] = useState(profile.timezone);
  const [tzOpen, setTzOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const tzLabel = TIMEZONES.find((t) => t.value === timezone)?.label ?? getTimezoneAbbr(timezone);

  async function save(updates: { send_time?: string; timezone?: string }) {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Save failed');
      toast.success('Delivery updated ✓', { duration: 1500 });
    } catch {
      toast.error('Failed to save delivery settings.');
    } finally {
      setSaving(false);
    }
  }

  function handleTimeChange(newHour: string, newMinute: string, newAmpm: 'AM' | 'PM') {
    const time = to24(newHour, newMinute, newAmpm);
    profile.send_time = time;
    save({ send_time: time });
  }

  function handleTzChange(newTz: string) {
    setTimezone(newTz);
    profile.timezone = newTz;
    setTzOpen(false);
    save({ timezone: newTz });
  }

  return (
    <SidebarCard icon={<Clock className="h-4 w-4 text-brand-purple" />} label="Delivery">
      {/* Time picker row */}
      <div className="space-y-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-ink-muted mb-1.5">Send time</p>
          <div className="flex items-center gap-1.5">
            {/* Hour */}
            <select
              value={hour}
              onChange={(e) => {
                setHour(e.target.value);
                handleTimeChange(e.target.value, minute, ampm);
              }}
              className="rounded-lg border border-surface-border bg-white px-2 py-1.5 text-sm text-ink focus:border-brand-purple focus:outline-none"
            >
              {HOUR_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {/* Minute */}
            <select
              value={minute}
              onChange={(e) => {
                setMinute(e.target.value);
                handleTimeChange(hour, e.target.value, ampm);
              }}
              className="rounded-lg border border-surface-border bg-white px-2 py-1.5 text-sm text-ink focus:border-brand-purple focus:outline-none"
            >
              {MINUTE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {/* AM/PM */}
            <select
              value={ampm}
              onChange={(e) => {
                const newAmpm = e.target.value as 'AM' | 'PM';
                setAmpm(newAmpm);
                handleTimeChange(hour, minute, newAmpm);
              }}
              className="rounded-lg border border-surface-border bg-white px-2 py-1.5 text-sm text-ink focus:border-brand-purple focus:outline-none"
            >
              {AMPM_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Timezone combobox */}
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-ink-muted mb-1.5">Timezone</p>
          <Popover open={tzOpen} onOpenChange={setTzOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-lg border border-surface-border bg-white px-3 py-1.5 text-left text-sm text-ink hover:border-brand-purple/50 focus:outline-none"
              >
                <span className="truncate">{tzLabel}</span>
                <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 text-ink-muted" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-0">
              <Command>
                <CommandInput placeholder="Search timezone..." />
                <CommandList>
                  <CommandEmpty>No timezone found.</CommandEmpty>
                  <CommandGroup>
                    {TIMEZONES.map((tz) => (
                      <CommandItem
                        key={tz.value}
                        value={tz.label}
                        onSelect={() => handleTzChange(tz.value)}
                      >
                        <Check
                          className={`mr-2 h-3.5 w-3.5 shrink-0 ${timezone === tz.value ? 'opacity-100 text-brand-purple' : 'opacity-0'}`}
                        />
                        <span className="truncate">{tz.label}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </SidebarCard>
  );
}

// ─────────────────────────────────────────────────────────────
// Recipient card — always-visible email input with debounced save
// ─────────────────────────────────────────────────────────────

function RecipientCard({ profile, accountEmail }: { profile: Profile; accountEmail: string }) {
  const [value, setValue] = useState(profile.delivery_email ?? '');
  const [debouncedValue] = useDebounce(value, 800);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const savedRef = React.useRef(profile.delivery_email ?? '');

  // Auto-save when debounced value changes
  React.useEffect(() => {
    const trimmed = debouncedValue.trim();
    if (trimmed === savedRef.current) return;
    if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return;

    setSaveState('saving');
    fetch('/api/user/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delivery_email: trimmed || null }),
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        savedRef.current = trimmed;
        profile.delivery_email = trimmed || null;
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 2000);
      })
      .catch(() => {
        setSaveState('error');
        setTimeout(() => setSaveState('idle'), 3000);
      });
  }, [debouncedValue]); // eslint-disable-line react-hooks/exhaustive-deps

  const isInvalidEmail = value.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  return (
    <SidebarCard
      icon={<Mail className="h-4 w-4 text-brand-purple" />}
      label="Recipient"
      right={
        <span className={`text-xs transition-colors ${
          saveState === 'saving' ? 'text-ink-muted' :
          saveState === 'saved' ? 'text-emerald-600' :
          saveState === 'error' ? 'text-red-500' : 'opacity-0'
        }`}>
          {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved ✓' : saveState === 'error' ? 'Failed' : '·'}
        </span>
      }
    >
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={accountEmail}
        className={`text-sm ${isInvalidEmail ? 'border-red-300 focus-visible:ring-red-300' : ''}`}
      />
      <p className="mt-1.5 text-xs text-ink-faint">
        {value.trim() ? 'Overrides your account email' : `Sending to: ${accountEmail}`}
      </p>
      {isInvalidEmail && <p className="mt-1 text-xs text-red-500">Enter a valid email address</p>}
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
          <DeliveryCard profile={profile} />

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
