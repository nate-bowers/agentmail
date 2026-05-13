'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Cloud, Newspaper, Quote, TrendingUp, Trophy,
  Lightbulb, Check, ChevronDown, ChevronUp, ChefHat, Cpu, type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { MODULE_REGISTRY } from '@/lib/modules';
import { getModulePoints, FREE_TIER_POINTS } from '@/lib/modules/points';
import { WeatherForm } from '@/components/modules/forms/WeatherForm';
import { NewsForm } from '@/components/modules/forms/NewsForm';
import { QuoteForm } from '@/components/modules/forms/QuoteForm';
import { MarketsForm } from '@/components/modules/forms/MarketsForm';
import { SportsForm } from '@/components/modules/forms/SportsForm';
import { RecipeForm } from '@/components/modules/forms/RecipeForm';
import { AiTechForm } from '@/components/modules/forms/AiTechForm';
import { FactForm } from '@/components/modules/forms/FactForm';

// ─── Constants ────────────────────────────────────────────────

const ONBOARDING_MODULES = ['weather', 'news', 'quote', 'markets', 'sports', 'recipe', 'ai_tech', 'fact'];

const ICON_MAP: Record<string, LucideIcon> = {
  Cloud, Newspaper, Quote, TrendingUp, Trophy, Lightbulb, ChefHat, Cpu,
};

const ALWAYS_VALID = new Set(['quote', 'fact', 'mindfulness', 'word_of_day', 'on_this_day']);

const COMMON_TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu',
  'America/Toronto', 'America/Vancouver', 'America/Mexico_City',
  'America/Sao_Paulo', 'America/Buenos_Aires', 'America/Bogota',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Rome',
  'Europe/Madrid', 'Europe/Amsterdam', 'Europe/Stockholm', 'Europe/Warsaw',
  'Europe/Istanbul', 'Europe/Moscow',
  'Asia/Dubai', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Dhaka',
  'Asia/Bangkok', 'Asia/Singapore', 'Asia/Hong_Kong', 'Asia/Shanghai',
  'Asia/Tokyo', 'Asia/Seoul', 'Asia/Jakarta',
  'Australia/Sydney', 'Australia/Melbourne', 'Australia/Perth',
  'Pacific/Auckland', 'Pacific/Fiji',
  'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Lagos',
];

// ─── Progress Indicator ───────────────────────────────────────

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === current ? 'w-6 bg-brand-purple' : 'w-2 bg-surface-border'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-ink-muted">Step {current + 1} of {total}</p>
    </div>
  );
}

// ─── Step 0: Welcome ──────────────────────────────────────────

function StepWelcome({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto px-4">
      <span className="text-6xl">☀️</span>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink">
        Good morning. Let&rsquo;s build your brief.
      </h1>
      <p className="mt-3 leading-relaxed text-ink-muted">
        It takes about 2 minutes. You&rsquo;ll pick what goes in your daily email and when you want it to arrive.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {['☀️ Weather', '📰 News', '💬 Quotes', '📈 Markets'].map((label) => (
          <span key={label} className="rounded-full border border-surface-border px-3 py-1 text-sm text-ink-muted">
            {label}
          </span>
        ))}
      </div>
      <Button className="mt-8 w-full sm:w-auto sm:px-8" onClick={onNext}>
        Let&rsquo;s go →
      </Button>
      <button
        type="button"
        onClick={onSkip}
        className="mt-4 text-xs text-ink-muted underline underline-offset-2 hover:text-ink"
      >
        Skip setup, I&rsquo;ll do this later
      </button>
    </div>
  );
}

// ─── Step 1: Pick Modules ─────────────────────────────────────

function StepPickModules({
  selected,
  onChange,
  onNext,
  onBack,
}: {
  selected: string[];
  onChange: (types: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const pointsUsed = selected.reduce(
    (sum, t) => sum + getModulePoints(t, MODULE_REGISTRY[t]?.defaultConfig as Record<string, unknown> ?? {}),
    0
  );
  const remaining = FREE_TIER_POINTS - pointsUsed;
  const pct = Math.min((pointsUsed / FREE_TIER_POINTS) * 100, 100);

  function toggle(type: string) {
    const cost = getModulePoints(type, MODULE_REGISTRY[type]?.defaultConfig as Record<string, unknown> ?? {});
    if (selected.includes(type)) {
      onChange(selected.filter((t) => t !== type));
    } else {
      if (cost > remaining) return;
      onChange([...selected, type]);
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto px-4">
      <h2 className="text-2xl font-bold text-ink">What do you want in your brief?</h2>
      <p className="mt-2 text-sm text-ink-muted">Pick up to 3 credits to start. You can always add more later.</p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ONBOARDING_MODULES.map((type) => {
          const def = MODULE_REGISTRY[type];
          if (!def) return null;
          const Icon = ICON_MAP[def.icon] ?? Cloud;
          const pts = getModulePoints(type, def.defaultConfig as Record<string, unknown>);
          const isSelected = selected.includes(type);
          const canAdd = isSelected || pts <= remaining;

          return (
            <button
              key={type}
              type="button"
              onClick={() => toggle(type)}
              disabled={!canAdd}
              className={`relative flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors ${
                isSelected
                  ? 'border-brand-purple bg-brand-purple-light'
                  : canAdd
                    ? 'border-surface-border bg-white hover:border-brand-purple hover:bg-brand-purple-light'
                    : 'border-surface-border bg-surface-secondary opacity-50 cursor-not-allowed'
              }`}
            >
              <span className="absolute right-2 top-2 rounded-full border border-surface-border bg-white px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
                {pts} {pts === 1 ? 'pt' : 'pts'}
              </span>
              {isSelected && (
                <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-purple">
                  <Check className="h-3 w-3 text-white" />
                </span>
              )}
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-purple-light">
                <Icon className="h-4 w-4 text-brand-purple" />
              </div>
              <div className="pr-8">
                <p className="text-sm font-medium text-ink">{def.label}</p>
                <p className="mt-0.5 text-xs leading-snug text-ink-muted">{def.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-5 space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className={pointsUsed >= FREE_TIER_POINTS ? 'font-medium text-brand-purple' : 'text-ink-muted'}>
            {pointsUsed} / {FREE_TIER_POINTS} credits selected
          </span>
          {pointsUsed >= FREE_TIER_POINTS && (
            <a href="/dashboard/upgrade" className="text-xs text-brand-purple underline underline-offset-2">
              Upgrade to Pro
            </a>
          )}
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-border">
          <div
            className="h-full rounded-full bg-brand-purple transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        {pointsUsed >= FREE_TIER_POINTS && (
          <p className="text-xs text-ink-muted">You&rsquo;ve used all 3 free credits — or upgrade for more.</p>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        <Button variant="ghost" onClick={onBack} className="flex-1 sm:flex-none">Back</Button>
        <Button
          onClick={onNext}
          disabled={selected.length === 0}
          className="flex-1 sm:flex-none"
          title={selected.length === 0 ? 'Select at least one module' : undefined}
        >
          Next →
        </Button>
      </div>
    </div>
  );
}

// ─── Step 2: Configure ────────────────────────────────────────

function ConfigCard({
  type,
  isExpanded,
  isValid,
  onToggle,
  onSubmit,
  containerRef,
}: {
  type: string;
  isExpanded: boolean;
  isValid: boolean;
  onToggle: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
  containerRef: (el: HTMLDivElement | null) => void;
}) {
  const def = MODULE_REGISTRY[type];
  if (!def) return null;
  const Icon = ICON_MAP[def.icon] ?? Cloud;

  return (
    <div className="rounded-xl border border-surface-border bg-white overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-secondary transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-purple-light">
            <Icon className="h-3.5 w-3.5 text-brand-purple" />
          </div>
          <span className="text-sm font-medium text-ink">{def.label}</span>
          {isValid && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-2.5 w-2.5 text-emerald-600" />
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-ink-muted" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-ink-muted" />
        )}
      </button>

      {isExpanded && (
        <div ref={containerRef} className="border-t border-surface-border px-4 pb-5 pt-4">
          {type === 'weather' && <WeatherForm defaultValues={def.defaultConfig as Record<string, unknown>} onSubmit={onSubmit} />}
          {type === 'news' && <NewsForm defaultValues={def.defaultConfig as Record<string, unknown>} onSubmit={onSubmit} />}
          {type === 'quote' && <QuoteForm defaultValues={def.defaultConfig as Record<string, unknown>} onSubmit={onSubmit} />}
          {type === 'markets' && <MarketsForm defaultValues={def.defaultConfig as Record<string, unknown>} onSubmit={onSubmit} />}
          {type === 'sports' && <SportsForm defaultValues={def.defaultConfig as Record<string, unknown>} onSubmit={onSubmit} />}
          {type === 'recipe' && <RecipeForm defaultValues={def.defaultConfig as Record<string, unknown>} onSubmit={onSubmit} />}
          {type === 'ai_tech' && <AiTechForm defaultValues={def.defaultConfig as Record<string, unknown>} onSubmit={onSubmit} />}
          {type === 'fact' && <FactForm defaultValues={def.defaultConfig as Record<string, unknown>} onSubmit={onSubmit} />}
        </div>
      )}
    </div>
  );
}

function StepConfigure({
  selectedTypes,
  onNext,
  onBack,
  onConfigsSaved,
}: {
  selectedTypes: string[];
  onNext: () => void;
  onBack: () => void;
  onConfigsSaved: (configs: Record<string, Record<string, unknown>>) => void;
}) {
  const [expanded, setExpanded] = useState<string>(selectedTypes[0] ?? '');
  const [validSet, setValidSet] = useState<Set<string>>(
    new Set(selectedTypes.filter((t) => ALWAYS_VALID.has(t)))
  );
  const configsRef = useRef<Record<string, Record<string, unknown>>>({});
  const containerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  function handleSubmit(type: string, data: Record<string, unknown>) {
    configsRef.current[type] = data;
    setValidSet((prev) => new Set(Array.from(prev).concat(type)));
  }

  function handleNext() {
    // Auto-fill defaults for always-valid modules
    for (const type of selectedTypes) {
      if (ALWAYS_VALID.has(type) && !configsRef.current[type]) {
        const def = MODULE_REGISTRY[type];
        configsRef.current[type] = (def?.defaultConfig ?? {}) as Record<string, unknown>;
      }
    }

    // Trigger form submission for non-always-valid modules
    const needsValidation = selectedTypes.filter((t) => !ALWAYS_VALID.has(t));
    for (const type of needsValidation) {
      const container = containerRefs.current[type];
      const form = container?.querySelector('form');
      if (form) {
        form.requestSubmit();
      } else {
        // Form is collapsed — use existing config or default
        if (!configsRef.current[type]) {
          const def = MODULE_REGISTRY[type];
          configsRef.current[type] = (def?.defaultConfig ?? {}) as Record<string, unknown>;
        }
        setValidSet((prev) => new Set(Array.from(prev).concat(type)));
      }
    }

    // Check after RHF synchronous validation completes
    setTimeout(() => {
      const allValid = selectedTypes.every(
        (t) => configsRef.current[t] !== undefined
      );
      if (allValid) {
        onConfigsSaved({ ...configsRef.current });
        onNext();
      } else {
        // Expand first invalid card
        const firstInvalid = selectedTypes.find((t) => !configsRef.current[t]);
        if (firstInvalid) setExpanded(firstInvalid);
      }
    }, 100);
  }

  return (
    <div className="w-full max-w-lg mx-auto px-4">
      <h2 className="text-2xl font-bold text-ink">Set up each module</h2>
      <p className="mt-2 text-sm text-ink-muted">Configure what goes into each section of your email.</p>

      <div className="mt-6 space-y-3">
        {selectedTypes.map((type) => (
          <ConfigCard
            key={type}
            type={type}
            isExpanded={expanded === type}
            isValid={validSet.has(type)}
            onToggle={() => setExpanded(expanded === type ? '' : type)}
            onSubmit={(data) => handleSubmit(type, data)}
            containerRef={(el) => { containerRefs.current[type] = el; }}
          />
        ))}
      </div>

      <div className="mt-6 flex gap-3">
        <Button variant="ghost" onClick={onBack} className="flex-1 sm:flex-none">Back</Button>
        <Button onClick={handleNext} className="flex-1 sm:flex-none">Next →</Button>
      </div>
    </div>
  );
}

// ─── Step 3: Delivery Time ────────────────────────────────────

const HOUR_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const MINUTE_OPTIONS = ['00', '15', '30', '45'];
const QUICK_TIMES = [
  { label: '6:00 AM', hour: '6', minute: '00', ampm: 'AM' },
  { label: '7:00 AM', hour: '7', minute: '00', ampm: 'AM' },
  { label: '8:00 AM', hour: '8', minute: '00', ampm: 'AM' },
  { label: '9:00 AM', hour: '9', minute: '00', ampm: 'AM' },
];

function StepDelivery({
  onFinish,
  onBack,
  isSaving,
}: {
  onFinish: (sendTime: string, timezone: string) => void;
  onBack: () => void;
  isSaving: boolean;
}) {
  const [hour, setHour] = useState('7');
  const [minute, setMinute] = useState('00');
  const [ampm, setAmpm] = useState<'AM' | 'PM'>('AM');
  const [timezone, setTimezone] = useState('');
  const [tzSearch, setTzSearch] = useState('');
  const [tzOpen, setTzOpen] = useState(false);

  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setTimezone(detected);
      setTzSearch(detected);
    } catch {
      setTimezone('America/New_York');
      setTzSearch('America/New_York');
    }
  }, []);

  const filteredTz = COMMON_TIMEZONES.filter((tz) =>
    tz.toLowerCase().includes(tzSearch.toLowerCase().replace(' ', '_'))
  );

  function getTimezoneName(tz: string): string {
    try {
      return new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' })
        .formatToParts(new Date())
        .find((p) => p.type === 'timeZoneName')?.value ?? tz;
    } catch {
      return tz;
    }
  }

  function buildSendTime(): string {
    let h = parseInt(hour, 10);
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${minute}`;
  }

  const previewTime = `${hour}:${minute} ${ampm}`;
  const tzAbbr = timezone ? getTimezoneName(timezone) : '';

  return (
    <div className="w-full max-w-sm mx-auto px-4 text-center">
      <h2 className="text-2xl font-bold text-ink">When should it arrive?</h2>
      <p className="mt-2 text-sm text-ink-muted">
        Pick a time and we&rsquo;ll have your brief ready before you wake up.
      </p>

      {/* Time picker */}
      <div className="mt-8 flex items-center justify-center gap-2">
        <select
          value={hour}
          onChange={(e) => setHour(e.target.value)}
          className="rounded-lg border border-surface-border bg-white px-3 py-2.5 text-lg font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand-purple/30"
        >
          {HOUR_OPTIONS.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
        <span className="text-lg font-medium text-ink">:</span>
        <select
          value={minute}
          onChange={(e) => setMinute(e.target.value)}
          className="rounded-lg border border-surface-border bg-white px-3 py-2.5 text-lg font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand-purple/30"
        >
          {MINUTE_OPTIONS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <div className="flex overflow-hidden rounded-lg border border-surface-border">
          {(['AM', 'PM'] as const).map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => setAmpm(period)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                ampm === period
                  ? 'bg-brand-purple text-white'
                  : 'bg-white text-ink hover:bg-surface-secondary'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Quick time suggestions */}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {QUICK_TIMES.map((qt) => (
          <button
            key={qt.label}
            type="button"
            onClick={() => { setHour(qt.hour); setMinute(qt.minute); setAmpm(qt.ampm as 'AM' | 'PM'); }}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              hour === qt.hour && minute === qt.minute && ampm === qt.ampm
                ? 'border-brand-purple bg-brand-purple-light text-brand-purple font-medium'
                : 'border-surface-border text-ink-muted hover:border-brand-purple'
            }`}
          >
            {qt.label}
          </button>
        ))}
      </div>

      {/* Timezone */}
      <div className="mt-6 text-left">
        <label className="mb-1.5 block text-sm font-medium text-ink">Your timezone</label>
        <div className="relative">
          <input
            value={tzSearch}
            onChange={(e) => { setTzSearch(e.target.value); setTzOpen(true); }}
            onFocus={() => setTzOpen(true)}
            onBlur={() => setTimeout(() => setTzOpen(false), 150)}
            placeholder="Search timezone..."
            className="w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-purple/30"
          />
          {tzOpen && filteredTz.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-surface-border bg-white shadow-lg">
              {filteredTz.map((tz) => (
                <button
                  key={tz}
                  type="button"
                  onMouseDown={() => {
                    setTimezone(tz);
                    setTzSearch(tz);
                    setTzOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-brand-purple-light ${
                    timezone === tz ? 'bg-brand-purple-light text-brand-purple' : 'text-ink'
                  }`}
                >
                  {tz}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview */}
      <p className="mt-4 text-sm text-ink-muted">
        Your brief will arrive every morning at{' '}
        <span className="font-medium text-ink">{previewTime}</span>
        {tzAbbr && <> {tzAbbr}</>}.
      </p>

      <div className="mt-6 flex gap-3">
        <Button variant="ghost" onClick={onBack} className="flex-1 sm:flex-none" disabled={isSaving}>
          Back
        </Button>
        <Button
          onClick={() => onFinish(buildSendTime(), timezone || 'America/New_York')}
          className="flex-1 sm:flex-none"
          disabled={isSaving}
        >
          {isSaving ? 'Setting up…' : 'Finish setup →'}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────

interface OnboardingModalProps {
  userId: string;
  onComplete: () => void;
}

export default function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [moduleConfigs, setModuleConfigs] = useState<Record<string, Record<string, unknown>>>({});
  const [isSaving, setIsSaving] = useState(false);

  async function handleSkip() {
    await fetch('/api/user/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ has_onboarded: true }),
    });
    onComplete();
  }

  async function handleFinish(sendTime: string, timezone: string) {
    setIsSaving(true);
    try {
      // Save each module
      const saveResults = await Promise.allSettled(
        selectedTypes.map((type) =>
          fetch('/api/modules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              module_type: type,
              config: moduleConfigs[type] ?? MODULE_REGISTRY[type]?.defaultConfig ?? {},
              display_order: selectedTypes.indexOf(type) + 1,
            }),
          })
        )
      );

      for (const r of saveResults) {
        if (r.status === 'rejected') throw new Error(`Module save network error: ${r.reason}`);
        if (!r.value.ok) {
          const body = await r.value.json().catch(() => ({}));
          throw new Error(`Module save failed: ${body.error ?? r.value.status}`);
        }
      }

      // Save settings + complete onboarding
      const settingsRes = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          send_time: sendTime,
          timezone,
          has_onboarded: true,
        }),
      });

      if (!settingsRes.ok) {
        const body = await settingsRes.json().catch(() => ({}));
        throw new Error(`Settings save failed: ${body.error ?? settingsRes.status}`);
      }

      // Format delivery time for toast
      const [hStr, mStr] = sendTime.split(':');
      const h = parseInt(hStr, 10);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      const displayTime = `${h12}:${mStr} ${ampm}`;

      toast.success(`🎉 Your brief is set up. First delivery at ${displayTime}.`);
      onComplete();
    } catch (err) {
      console.error('[onboarding] finish error:', err);
      toast.error(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white overflow-y-auto">
      {/* Progress */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-surface-border px-6 py-4">
        <ProgressDots current={step} total={4} />
      </div>

      {/* Content */}
      <div className="flex flex-1 items-center justify-center py-12">
        {step === 0 && (
          <StepWelcome
            onNext={() => setStep(1)}
            onSkip={handleSkip}
          />
        )}
        {step === 1 && (
          <StepPickModules
            selected={selectedTypes}
            onChange={setSelectedTypes}
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && (
          <StepConfigure
            selectedTypes={selectedTypes}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
            onConfigsSaved={setModuleConfigs}
          />
        )}
        {step === 3 && (
          <StepDelivery
            onFinish={handleFinish}
            onBack={() => setStep(2)}
            isSaving={isSaving}
          />
        )}
      </div>
    </div>
  );
}
