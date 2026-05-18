'use client';

/*
 * Dev reset (run in Supabase SQL editor):
 * UPDATE profiles SET has_onboarded = false WHERE email = 'your@email.com';
 * DELETE FROM modules WHERE user_id = 'your-user-id';
 */

import { useState, useRef, useEffect } from 'react';
import {
  Cloud, Newspaper, Quote as QuoteIcon, TrendingUp, Trophy,
  Lightbulb, ChefHat, Cpu, Dumbbell, Headphones, Brain,
  Calendar, ArrowLeftRight, BookMarked, BookOpen, MessageSquare,
  MapPin, Stars, Languages, Heart, Landmark, Zap,
  Check, ChevronDown, ChevronUp, Loader2, CheckCircle2,
  ArrowLeft, Sparkles, Mail, Inbox, AlertCircle,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { MODULE_REGISTRY, MODULE_DISPLAY_ORDER } from '@/lib/modules';
import { getModulePoints, FREE_TIER_POINTS, PRO_TIER_POINTS } from '@/lib/modules/points';
import { WeatherForm } from '@/components/modules/forms/WeatherForm';
import { NewsForm } from '@/components/modules/forms/NewsForm';
import { QuoteForm } from '@/components/modules/forms/QuoteForm';
import { MarketsForm } from '@/components/modules/forms/MarketsForm';
import { SportsForm } from '@/components/modules/forms/SportsForm';
import { RecipeForm } from '@/components/modules/forms/RecipeForm';
import { AiTechForm } from '@/components/modules/forms/AiTechForm';
import { WorkoutForm } from '@/components/modules/forms/WorkoutForm';
import { PodcastForm } from '@/components/modules/forms/PodcastForm';
import { CurrencyForm } from '@/components/modules/forms/CurrencyForm';
import { BookForm } from '@/components/modules/forms/BookForm';
import { RedditForm } from '@/components/modules/forms/RedditForm';
import { LocalEventsForm } from '@/components/modules/forms/LocalEventsForm';
import { HoroscopeForm } from '@/components/modules/forms/HoroscopeForm';
import { LanguageForm } from '@/components/modules/forms/LanguageForm';
import { WordOfDayForm } from '@/components/modules/forms/WordOfDayForm';
import { WeekHistoryForm } from '@/components/modules/forms/WeekHistoryForm';

// ─── Constants ────────────────────────────────────────────────

const FREE_ONBOARDING_MODULES = ['weather', 'news', 'quote', 'markets', 'sports', 'recipe', 'ai_tech', 'fact'];

// Modules treated as "no meaningful config" — auto-collapse with "Using default settings"
const AUTO_DEFAULT_MODULES = new Set(['fact', 'mindfulness', 'challenge', 'on_this_day', 'affirmation']);

const ICON_MAP: Record<string, LucideIcon> = {
  Cloud, Newspaper, Quote: QuoteIcon, TrendingUp, Trophy,
  Lightbulb, ChefHat, Cpu, Dumbbell, Headphones, Brain,
  Calendar, ArrowLeftRight, BookMarked, BookOpen, MessageSquare,
  MapPin, Stars, Languages, Heart, Landmark, Zap,
};

const MODULE_EMOJI: Record<string, string> = {
  weather: '☁️', news: '📰', quote: '💬', markets: '📈', sports: '🏆',
  fact: '💡', recipe: '🍳', ai_tech: '🤖', word_of_day: '📚', mindfulness: '🧠',
  workout: '💪', on_this_day: '📅', currency: '💱', podcast: '🎧', book: '📖',
  reddit: '🔴', local_events: '📍', horoscope: '⭐', language: '🌍',
  affirmation: '❤️', week_history: '🏛️', challenge: '⚡',
};

const SAVING_MESSAGES = ['Saving your modules…', 'Configuring your brief…', 'Almost ready…'];

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

const HOUR_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const MINUTE_OPTIONS = ['00', '15', '30', '45'];
const QUICK_TIMES = [
  { label: '6:00 AM', hour: '6', minute: '00', ampm: 'AM' as const },
  { label: '7:00 AM', hour: '7', minute: '00', ampm: 'AM' as const },
  { label: '8:00 AM', hour: '8', minute: '00', ampm: 'AM' as const },
  { label: '9:00 AM', hour: '9', minute: '00', ampm: 'AM' as const },
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
              i === current ? 'w-6 bg-brand-purple' : i < current ? 'w-2 bg-brand-purple/40' : 'w-2 bg-surface-border'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-ink-muted">Step {current + 1} of {total}</p>
    </div>
  );
}

// ─── Step 0: Welcome ──────────────────────────────────────────

function StepWelcome({
  variant, onNext, onSkip,
}: { variant: 'free' | 'pro'; onNext: () => void; onSkip: () => void }) {
  if (variant === 'pro') {
    return (
      <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto px-4">
        <span className="text-6xl">✨</span>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink">
          Let&rsquo;s build your Pro brief.
        </h1>
        <p className="mt-3 leading-relaxed text-ink-muted">
          You get 12 module credits, full customization, and your choice of delivery time. Takes about 3 minutes.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {['12 credits', '22 modules', 'Custom delivery', 'Daily AI brief'].map((label) => (
            <span key={label} className="rounded-full border border-brand-purple/30 bg-brand-purple-light px-3 py-1 text-sm text-brand-purple">
              {label}
            </span>
          ))}
        </div>
        <Button className="mt-8 w-full sm:w-auto sm:px-8" onClick={onNext}>
          Let&rsquo;s go →
        </Button>
        <button type="button" onClick={onSkip} className="mt-4 text-xs text-ink-muted underline underline-offset-2 hover:text-ink">
          Skip setup, configure later
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto px-4">
      <span className="text-6xl">☀️</span>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink">
        Good morning. Let&rsquo;s build your brief.
      </h1>
      <p className="mt-3 leading-relaxed text-ink-muted">
        Pick up to 3 modules for your daily email. Takes about 2 minutes.
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
      <button type="button" onClick={onSkip} className="mt-4 text-xs text-ink-muted underline underline-offset-2 hover:text-ink">
        Skip setup, I&rsquo;ll do this later
      </button>
    </div>
  );
}

// ─── Step 1 (Free): Pick Modules ─────────────────────────────

function StepPickModulesFree({
  selected, weatherCity,
  onChange, onWeatherCityChange, onNext, onBack,
}: {
  selected: string[];
  weatherCity: string;
  onChange: (types: string[]) => void;
  onWeatherCityChange: (city: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [cityError, setCityError] = useState(false);

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
      if (type === 'weather') setCityError(false);
    } else {
      if (cost > remaining) return;
      onChange([...selected, type]);
    }
  }

  function handleNext() {
    if (selected.includes('weather') && !weatherCity.trim()) {
      setCityError(true);
      return;
    }
    setCityError(false);
    onNext();
  }

  return (
    <div className="w-full max-w-lg mx-auto px-4">
      <h2 className="text-2xl font-bold text-ink">What do you want in your brief?</h2>
      <p className="mt-2 text-sm text-ink-muted">Pick up to 3 credits. You can add more after upgrading to Pro.</p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FREE_ONBOARDING_MODULES.map((type) => {
          const def = MODULE_REGISTRY[type];
          if (!def) return null;
          const Icon = ICON_MAP[def.icon] ?? Cloud;
          const pts = getModulePoints(type, def.defaultConfig as Record<string, unknown>);
          const isSelected = selected.includes(type);
          const canAdd = isSelected || pts <= remaining;

          return (
            <div key={type} className="flex flex-col">
              <button
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
                {isSelected ? (
                  <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-purple">
                    <Check className="h-3 w-3 text-white" />
                  </span>
                ) : (
                  <span className="absolute right-2 top-2 rounded-full border border-surface-border bg-white px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
                    {pts} {pts === 1 ? 'pt' : 'pts'}
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

              {/* Inline city input for weather */}
              {type === 'weather' && isSelected && (
                <div className="mt-1 px-1">
                  <input
                    type="text"
                    value={weatherCity}
                    onChange={(e) => { onWeatherCityChange(e.target.value); setCityError(false); }}
                    placeholder="Your city, e.g. San Francisco, CA"
                    className={`w-full rounded-lg border px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-purple/30 ${
                      cityError ? 'border-red-400 bg-red-50' : 'border-surface-border bg-white'
                    }`}
                  />
                  {cityError && (
                    <p className="mt-1 text-xs text-red-500">Please enter your city to use the weather module.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className={pointsUsed >= FREE_TIER_POINTS ? 'font-medium text-brand-purple' : 'text-ink-muted'}>
            {pointsUsed} / {FREE_TIER_POINTS} credits selected
          </span>
          {pointsUsed >= FREE_TIER_POINTS && (
            <span className="text-xs text-ink-muted">Max reached — upgrade for more</span>
          )}
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-border">
          <div className="h-full rounded-full bg-brand-purple transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <Button variant="ghost" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button onClick={handleNext} disabled={selected.length === 0} className="flex-1">
          Next →
        </Button>
      </div>
    </div>
  );
}

// ─── Step 1 (Pro): Pick Modules ───────────────────────────────

function StepPickModulesPro({
  selected, onChange, onNext, onBack,
}: {
  selected: string[];
  onChange: (types: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [atLimitShake, setAtLimitShake] = useState(false);

  const pointsUsed = selected.reduce(
    (sum, t) => sum + getModulePoints(t, MODULE_REGISTRY[t]?.defaultConfig as Record<string, unknown> ?? {}),
    0
  );
  const remaining = PRO_TIER_POINTS - pointsUsed;
  const pct = Math.min((pointsUsed / PRO_TIER_POINTS) * 100, 100);
  const atLimit = pointsUsed >= PRO_TIER_POINTS;

  function toggle(type: string) {
    const cost = getModulePoints(type, MODULE_REGISTRY[type]?.defaultConfig as Record<string, unknown> ?? {});
    if (selected.includes(type)) {
      onChange(selected.filter((t) => t !== type));
    } else {
      if (cost > remaining) {
        setAtLimitShake(true);
        setTimeout(() => setAtLimitShake(false), 600);
        return;
      }
      onChange([...selected, type]);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      {atLimitShake && (
        <style>{`
          @keyframes onboarding-bar-shake {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(-4px); }
            40% { transform: translateX(4px); }
            60% { transform: translateX(-4px); }
            80% { transform: translateX(4px); }
          }
          .shake-bar-anim { animation: onboarding-bar-shake 0.5s ease-in-out; }
        `}</style>
      )}

      <h2 className="text-2xl font-bold text-ink">Build your Pro brief.</h2>
      <p className="mt-2 text-sm text-ink-muted">Select up to 12 credits worth of modules.</p>

      <div className="mt-5 space-y-1.5 mb-5">
        <div className="flex items-center justify-between text-sm">
          <span className={atLimit ? 'font-medium text-brand-purple' : 'text-ink-muted'}>
            {pointsUsed} / {PRO_TIER_POINTS} credits selected
          </span>
          {atLimit && <span className="text-xs text-brand-purple font-medium">All credits used</span>}
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-border">
          <div
            className={`h-full rounded-full bg-brand-purple transition-all duration-300 ${atLimitShake ? 'shake-bar-anim' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="max-h-[50vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {MODULE_DISPLAY_ORDER.map((type) => {
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
                className={`relative flex flex-col gap-2 rounded-xl border p-3 text-left transition-colors ${
                  isSelected
                    ? 'border-brand-purple bg-brand-purple-light'
                    : canAdd
                      ? 'border-surface-border bg-white hover:border-brand-purple hover:bg-brand-purple-light'
                      : 'border-surface-border bg-surface-secondary opacity-40 cursor-not-allowed'
                }`}
              >
                {isSelected ? (
                  <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-brand-purple">
                    <Check className="h-2.5 w-2.5 text-white" />
                  </span>
                ) : (
                  <span className="absolute right-1.5 top-1.5 rounded-full border border-surface-border bg-white px-1 py-0.5 text-[9px] font-medium text-ink-muted">
                    {pts}pt
                  </span>
                )}
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-purple-light">
                  <Icon className="h-3.5 w-3.5 text-brand-purple" />
                </div>
                <div className="pr-6">
                  <p className="text-xs font-medium text-ink leading-tight">{def.label}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <Button variant="ghost" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button onClick={onNext} disabled={selected.length === 0} className="flex-1">
          Next →
        </Button>
      </div>
    </div>
  );
}

// ─── Step 2 (Free): Finish ────────────────────────────────────

function StepFinishFree({
  selected, isSaving, savingMessage, saveError,
  onFinish, onFinishAndUpgrade, onBack,
}: {
  selected: string[];
  isSaving: boolean;
  savingMessage: string;
  saveError: string | null;
  onFinish: () => void;
  onFinishAndUpgrade: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto px-4">
      <CheckCircle2 className="h-14 w-14 text-brand-purple" />
      <h2 className="mt-4 text-2xl font-bold text-ink">You&rsquo;re all set.</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        Your daily brief will arrive at 7:00 AM every morning.
        You can customize your delivery time after upgrading to Pro.
      </p>

      {selected.length > 0 && (
        <div className="mt-6 w-full rounded-xl bg-brand-purple-light p-4 text-left">
          <p className="text-xs font-medium text-brand-purple mb-3">Your brief includes:</p>
          <div className="flex flex-wrap gap-2">
            {selected.map((type) => {
              const def = MODULE_REGISTRY[type];
              if (!def) return null;
              return (
                <span
                  key={type}
                  className="inline-flex items-center gap-1.5 rounded-full border border-brand-purple/20 bg-white px-2.5 py-1 text-xs font-medium text-brand-purple"
                >
                  <span>{MODULE_EMOJI[type] ?? '✦'}</span>
                  {def.label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {saveError && (
        <p className="mt-4 text-sm text-red-500">{saveError}</p>
      )}

      <div className="mt-6 w-full space-y-2">
        <Button className="w-full" onClick={onFinish} disabled={isSaving}>
          {isSaving ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {savingMessage}
            </span>
          ) : (
            'Go to my dashboard'
          )}
        </Button>
        <Button variant="ghost" className="w-full text-sm" onClick={onFinishAndUpgrade} disabled={isSaving}>
          Upgrade to Pro for more
        </Button>
      </div>

      <button type="button" onClick={onBack} disabled={isSaving} className="mt-4 flex items-center gap-1 text-xs text-ink-muted hover:text-ink disabled:opacity-40">
        <ArrowLeft className="h-3 w-3" /> Back
      </button>
    </div>
  );
}

// ─── Step 2 (Pro): Configure ──────────────────────────────────

function renderModuleForm(type: string, defaults: Record<string, unknown>, onSubmit: (data: Record<string, unknown>) => void) {
  switch (type) {
    case 'weather':     return <WeatherForm defaultValues={defaults} onSubmit={onSubmit} />;
    case 'news':        return <NewsForm defaultValues={defaults} onSubmit={onSubmit} />;
    case 'quote':       return <QuoteForm defaultValues={defaults} onSubmit={onSubmit} />;
    case 'markets':     return <MarketsForm defaultValues={defaults} onSubmit={onSubmit} />;
    case 'sports':      return <SportsForm defaultValues={defaults} onSubmit={onSubmit} />;
    case 'recipe':      return <RecipeForm defaultValues={defaults} onSubmit={onSubmit} />;
    case 'ai_tech':     return <AiTechForm defaultValues={defaults} onSubmit={onSubmit} />;
    case 'workout':     return <WorkoutForm defaultValues={defaults} onSubmit={onSubmit} />;
    case 'podcast':     return <PodcastForm defaultValues={defaults} onSubmit={onSubmit} />;
    case 'currency':    return <CurrencyForm defaultValues={defaults} onSubmit={onSubmit} />;
    case 'book':        return <BookForm defaultValues={defaults} onSubmit={onSubmit} />;
    case 'reddit':      return <RedditForm defaultValues={defaults} onSubmit={onSubmit} />;
    case 'local_events': return <LocalEventsForm defaultValues={defaults} onSubmit={onSubmit} />;
    case 'horoscope':   return <HoroscopeForm defaultValues={defaults} onSubmit={onSubmit} />;
    case 'language':    return <LanguageForm defaultValues={defaults} onSubmit={onSubmit} />;
    case 'word_of_day': return <WordOfDayForm defaultValues={defaults} onSubmit={onSubmit} />;
    case 'week_history': return <WeekHistoryForm defaultValues={defaults} onSubmit={onSubmit} />;
    default:            return null;
  }
}

function ProConfigCard({
  type, isExpanded, isValid, onToggle, onSubmit, containerRef,
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
  const isAutoDefault = AUTO_DEFAULT_MODULES.has(type);

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
          {isAutoDefault ? (
            <span className="flex items-center gap-1 text-xs text-ink-muted">
              <Check className="h-3 w-3 text-emerald-500" /> Using defaults
            </span>
          ) : isValid ? (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-2.5 w-2.5 text-emerald-600" />
            </span>
          ) : null}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-ink-muted" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-ink-muted" />
        )}
      </button>

      {isExpanded && (
        <div ref={containerRef} className="border-t border-surface-border px-4 pb-5 pt-4">
          {isAutoDefault ? (
            <p className="text-sm text-ink-muted">This module works great out of the box. No configuration needed.</p>
          ) : (
            renderModuleForm(type, def.defaultConfig as Record<string, unknown>, onSubmit)
          )}
        </div>
      )}
    </div>
  );
}

function StepConfigurePro({
  selectedTypes, onNext, onBack, onConfigsSaved,
}: {
  selectedTypes: string[];
  onNext: () => void;
  onBack: () => void;
  onConfigsSaved: (configs: Record<string, Record<string, unknown>>) => void;
}) {
  const configurable = selectedTypes.filter((t) => !AUTO_DEFAULT_MODULES.has(t));
  const [expanded, setExpanded] = useState<string>(configurable[0] ?? '');
  const [validSet, setValidSet] = useState<Set<string>>(
    new Set(selectedTypes.filter((t) => AUTO_DEFAULT_MODULES.has(t)))
  );
  const configsRef = useRef<Record<string, Record<string, unknown>>>({});
  const containerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  function handleSubmit(type: string, data: Record<string, unknown>) {
    configsRef.current[type] = data;
    setValidSet((prev) => new Set(Array.from(prev).concat(type)));
  }

  function handleNext() {
    // Fill auto-default modules
    for (const type of selectedTypes) {
      if (AUTO_DEFAULT_MODULES.has(type) && !configsRef.current[type]) {
        configsRef.current[type] = (MODULE_REGISTRY[type]?.defaultConfig ?? {}) as Record<string, unknown>;
      }
    }

    // Trigger form submission for configurable modules
    for (const type of configurable) {
      const container = containerRefs.current[type];
      const form = container?.querySelector('form');
      if (form) {
        form.requestSubmit();
      } else {
        if (!configsRef.current[type]) {
          configsRef.current[type] = (MODULE_REGISTRY[type]?.defaultConfig ?? {}) as Record<string, unknown>;
        }
        setValidSet((prev) => new Set(Array.from(prev).concat(type)));
      }
    }

    setTimeout(() => {
      const allValid = selectedTypes.every((t) => configsRef.current[t] !== undefined);
      if (allValid) {
        onConfigsSaved({ ...configsRef.current });
        onNext();
      } else {
        const firstInvalid = configurable.find((t) => !configsRef.current[t]);
        if (firstInvalid) setExpanded(firstInvalid);
      }
    }, 100);
  }

  return (
    <div className="w-full max-w-lg mx-auto px-4">
      <h2 className="text-2xl font-bold text-ink">Set up each module</h2>
      <p className="mt-2 text-sm text-ink-muted">Configure what goes into each section of your brief.</p>

      <div className="mt-6 max-h-[55vh] overflow-y-auto pr-1 space-y-3">
        {selectedTypes.map((type) => (
          <ProConfigCard
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
        <Button variant="ghost" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button onClick={handleNext} className="flex-1">Next →</Button>
      </div>
    </div>
  );
}

// ─── Step 3 (Pro): Delivery + Stripe ─────────────────────────

function StepDeliveryAndStripe({
  isSaving, savingMessage, saveError,
  onPay, onSkip, onBack,
}: {
  isSaving: boolean;
  savingMessage: string;
  saveError: string | null;
  onPay: (sendTime: string, timezone: string) => void;
  onSkip: (sendTime: string, timezone: string) => void;
  onBack: () => void;
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

  function buildSendTime(): string {
    let h = parseInt(hour, 10);
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${minute}`;
  }

  const previewTime = `${hour}:${minute} ${ampm}`;
  function getTimezoneName(tz: string): string {
    try {
      return new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' })
        .formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value ?? tz;
    } catch { return tz; }
  }
  const tzAbbr = timezone ? getTimezoneName(timezone) : '';

  return (
    <div className="w-full max-w-sm mx-auto px-4">
      <h2 className="text-2xl font-bold text-ink text-center">When should it arrive?</h2>
      <p className="mt-2 text-sm text-ink-muted text-center">
        Pick a time and we&rsquo;ll have your brief ready before you wake up.
      </p>

      {/* Time picker */}
      <div className="mt-8 flex items-center justify-center gap-2">
        <select value={hour} onChange={(e) => setHour(e.target.value)}
          className="rounded-lg border border-surface-border bg-white px-3 py-2.5 text-lg font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand-purple/30">
          {HOUR_OPTIONS.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <span className="text-lg font-medium text-ink">:</span>
        <select value={minute} onChange={(e) => setMinute(e.target.value)}
          className="rounded-lg border border-surface-border bg-white px-3 py-2.5 text-lg font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand-purple/30">
          {MINUTE_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <div className="flex overflow-hidden rounded-lg border border-surface-border">
          {(['AM', 'PM'] as const).map((period) => (
            <button key={period} type="button" onClick={() => setAmpm(period)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${ampm === period ? 'bg-brand-purple text-white' : 'bg-white text-ink hover:bg-surface-secondary'}`}>
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Quick times */}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {QUICK_TIMES.map((qt) => (
          <button key={qt.label} type="button"
            onClick={() => { setHour(qt.hour); setMinute(qt.minute); setAmpm(qt.ampm); }}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              hour === qt.hour && minute === qt.minute && ampm === qt.ampm
                ? 'border-brand-purple bg-brand-purple-light text-brand-purple font-medium'
                : 'border-surface-border text-ink-muted hover:border-brand-purple'
            }`}>
            {qt.label}
          </button>
        ))}
      </div>

      {/* Timezone */}
      <div className="mt-6 text-left">
        <label className="mb-1.5 block text-sm font-medium text-ink">Your timezone</label>
        <div className="relative">
          <input value={tzSearch} onChange={(e) => { setTzSearch(e.target.value); setTzOpen(true); }}
            onFocus={() => setTzOpen(true)} onBlur={() => setTimeout(() => setTzOpen(false), 150)}
            placeholder="Search timezone…"
            className="w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-purple/30" />
          {tzOpen && filteredTz.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-surface-border bg-white shadow-lg">
              {filteredTz.map((tz) => (
                <button key={tz} type="button"
                  onMouseDown={() => { setTimezone(tz); setTzSearch(tz); setTzOpen(false); }}
                  className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-brand-purple-light ${timezone === tz ? 'bg-brand-purple-light text-brand-purple' : 'text-ink'}`}>
                  {tz}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="mt-3 text-center text-sm text-ink-muted">
        Your brief will arrive every morning at{' '}
        <span className="font-medium text-ink">{previewTime}</span>
        {tzAbbr && <> {tzAbbr}</>}.
      </p>

      {/* Divider */}
      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-surface-border" />
        <span className="text-xs font-medium text-ink-muted">Ready to go Pro?</span>
        <div className="h-px flex-1 bg-surface-border" />
      </div>

      {/* Pro card */}
      <div className="rounded-2xl bg-brand-purple p-5 text-white">
        <p className="font-semibold text-lg">Brief Pro — $9/month</p>
        <ul className="mt-3 space-y-1.5">
          {['12 module credits', 'All 22 modules', 'Custom delivery time', 'Cancel anytime'].map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-white/90">
              <Check className="h-3.5 w-3.5 shrink-0 text-white" /> {f}
            </li>
          ))}
        </ul>

        {saveError && (
          <p className="mt-3 text-sm text-red-300">{saveError}</p>
        )}

        <Button
          className="mt-5 w-full bg-white text-brand-purple hover:bg-white/90 font-semibold"
          onClick={() => onPay(buildSendTime(), timezone || 'America/New_York')}
          disabled={isSaving}
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> {savingMessage}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Start my Pro brief →
            </span>
          )}
        </Button>

        <button
          type="button"
          onClick={() => onSkip(buildSendTime(), timezone || 'America/New_York')}
          disabled={isSaving}
          className="mt-3 w-full text-center text-xs text-white/60 underline underline-offset-2 hover:text-white/80 disabled:opacity-40"
        >
          Skip payment for now
        </button>
      </div>

      <button type="button" onClick={onBack} disabled={isSaving} className="mt-5 flex items-center gap-1 text-xs text-ink-muted hover:text-ink disabled:opacity-40">
        <ArrowLeft className="h-3 w-3" /> Back
      </button>
    </div>
  );
}

// ─── Step: Inbox Setup (spam prevention) ──────────────────────

function StepInboxSetup({
  onContinue, onBack,
}: {
  onContinue: () => void;
  onBack: () => void;
}) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  async function handleSend() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/onboarding/send-test-email', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.message ?? 'Could not send the test email. Please try again.');
        return;
      }
      setSent(true);
      if (typeof data?.remaining === 'number') setRemaining(data.remaining);
    } catch (err) {
      console.error('[onboarding] test email error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  }

  async function handleContinue() {
    await fetch('/api/user/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ onboarding_test_email_acknowledged: true }),
    }).catch(() => null);
    onContinue();
  }

  return (
    <div className="w-full max-w-lg mx-auto px-4">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-purple-light">
          <Inbox className="h-7 w-7 text-brand-purple" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-ink">Make sure you get your brief.</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          The first few emails sometimes land in spam or Promotions. Moving our test email
          to your primary inbox teaches your provider to deliver every future brief to the right place.
        </p>
      </div>

      {!sent ? (
        <div className="mt-7 space-y-3">
          <Button className="w-full gap-2" onClick={handleSend} disabled={sending}>
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Sending…
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" /> Send me a test email
              </>
            )}
          </Button>
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          <button
            type="button"
            onClick={handleContinue}
            className="w-full text-xs text-ink-muted underline underline-offset-2 hover:text-ink"
          >
            Skip, I&rsquo;ll set this up later
          </button>
        </div>
      ) : (
        <div className="mt-7 space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <p className="text-sm font-medium text-emerald-900">Test email sent.</p>
            </div>
            <p className="mt-1 text-sm text-emerald-800/80">
              It should arrive in the next minute or two.
              {remaining !== null && remaining > 0 && (
                <> You have {remaining} re-send{remaining === 1 ? '' : 's'} left this hour.</>
              )}
            </p>
          </div>

          <div className="rounded-xl border border-surface-border bg-white p-4 text-left">
            <p className="text-sm font-semibold text-ink mb-2">Do this when it arrives:</p>
            <ol className="space-y-2 text-sm text-ink-muted">
              <li className="flex gap-2">
                <span className="font-semibold text-brand-purple">1.</span>
                <span>Check your <span className="font-medium text-ink">Spam</span> and <span className="font-medium text-ink">Promotions</span> folders first if you don&rsquo;t see it in your inbox.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-brand-purple">2.</span>
                <span>If it&rsquo;s in spam, open it and click <span className="font-medium text-ink">&ldquo;Not spam&rdquo;</span> or <span className="font-medium text-ink">&ldquo;Report not junk&rdquo;</span>.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-brand-purple">3.</span>
                <span>Move it to your <span className="font-medium text-ink">primary inbox</span> by dragging it, or in Gmail tap the three-dot menu and choose <span className="font-medium text-ink">&ldquo;Move to Primary&rdquo;</span>.</span>
              </li>
            </ol>
            <p className="mt-3 text-xs text-ink-muted">
              On Gmail in particular, doing this once trains your inbox so every future brief lands in the right place.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button className="w-full" onClick={handleContinue}>
              I&rsquo;ve done this, continue
            </Button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              className="text-xs text-ink-muted underline underline-offset-2 hover:text-ink disabled:opacity-40"
            >
              {sending ? 'Sending…' : 'Re-send the test email'}
            </button>
            {error && (
              <p className="text-center text-xs text-red-500">{error}</p>
            )}
          </div>
        </div>
      )}

      <button type="button" onClick={onBack} className="mt-6 flex items-center gap-1 text-xs text-ink-muted hover:text-ink mx-auto">
        <ArrowLeft className="h-3 w-3" /> Back
      </button>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────

export interface OnboardingModalProps {
  onComplete: () => void;
  onModulesCreated: () => Promise<void>;
  variant: 'free' | 'pro';
}

export default function OnboardingModal({ onComplete, onModulesCreated, variant }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [moduleConfigs, setModuleConfigs] = useState<Record<string, Record<string, unknown>>>({});
  const [weatherCity, setWeatherCity] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savingMessage, setSavingMessage] = useState(SAVING_MESSAGES[0]);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Step counts include the new "Inbox setup" step.
  // Free: Welcome → Pick → Inbox → Finish
  // Pro:  Welcome → Pick → Configure → Inbox → Delivery+Stripe
  const totalSteps = variant === 'pro' ? 5 : 4;

  // Cycle saving messages while saving
  useEffect(() => {
    if (!isSaving) return;
    let idx = 0;
    setSavingMessage(SAVING_MESSAGES[0]);
    const interval = setInterval(() => {
      idx = (idx + 1) % SAVING_MESSAGES.length;
      setSavingMessage(SAVING_MESSAGES[idx]);
    }, 1500);
    return () => clearInterval(interval);
  }, [isSaving]);

  function getConfigForType(type: string): Record<string, unknown> {
    if (type === 'weather' && variant === 'free') {
      const city = weatherCity.trim() || 'New York, NY';
      return { locations: [city], units: 'imperial', extended: false };
    }
    return (moduleConfigs[type] ?? MODULE_REGISTRY[type]?.defaultConfig ?? {}) as Record<string, unknown>;
  }

  async function handleSkip() {
    await fetch('/api/user/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ has_onboarded: true }),
    }).catch(() => null);
    onComplete();
  }

  async function saveModulesAndComplete(sendTime?: string, timezone?: string): Promise<boolean> {
    setIsSaving(true);
    setSaveError(null);

    try {
      // Save modules (continue on partial failure)
      const failedTypes: string[] = [];
      for (const type of selectedTypes) {
        try {
          const res = await fetch('/api/modules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              module_type: type,
              config: getConfigForType(type),
              display_order: selectedTypes.indexOf(type) + 1,
            }),
          });
          if (!res.ok) {
            console.error(`[onboarding] failed to save module ${type}:`, res.status);
            failedTypes.push(type);
          }
        } catch (err) {
          console.error(`[onboarding] network error saving module ${type}:`, err);
          failedTypes.push(type);
        }
      }

      // Save settings
      const settingsPayload: Record<string, unknown> = { has_onboarded: true };
      if (sendTime) settingsPayload.send_time = sendTime;
      if (timezone) settingsPayload.timezone = timezone;

      const settingsRes = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsPayload),
      });

      if (!settingsRes.ok) {
        setSaveError('Something went wrong saving your settings. Please try again.');
        return false;
      }

      // Refresh parent module list before closing
      await onModulesCreated();

      if (failedTypes.length > 0) {
        const names = failedTypes
          .map((t) => MODULE_REGISTRY[t]?.label ?? t)
          .join(', ');
        toast.warning(`Your brief was set up, but ${names} could not be added. You can add from your dashboard.`);
      } else if (selectedTypes.length > 0) {
        toast.success('🎉 Your brief is set up!');
      }

      return true;
    } catch (err) {
      console.error('[onboarding] finish error:', err);
      setSaveError('Something went wrong. Please try again.');
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleFreeFinish() {
    const ok = await saveModulesAndComplete();
    if (ok) onComplete();
  }

  async function handleFreeFinishAndUpgrade() {
    const ok = await saveModulesAndComplete();
    if (ok) {
      onComplete();
      window.location.href = '/dashboard/upgrade';
    }
  }

  async function handleProPay(sendTime: string, timezone: string) {
    const ok = await saveModulesAndComplete(sendTime, timezone);
    if (!ok) return;
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'pro' }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        toast.error(data.error ?? 'Could not open checkout. Try upgrading from your dashboard.');
        onComplete();
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      console.error('[onboarding] stripe redirect error:', err);
      toast.error('Could not open checkout. You can upgrade from your dashboard.');
      onComplete();
    }
  }

  async function handleProSkip(sendTime: string, timezone: string) {
    const ok = await saveModulesAndComplete(sendTime, timezone);
    if (ok) {
      toast.success('Your brief is set up. Upgrade to Pro anytime from your dashboard.');
      onComplete();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white overflow-y-auto">
      {/* Progress */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-surface-border px-6 py-4">
        <ProgressDots current={step} total={totalSteps} />
      </div>

      {/* Content */}
      <div className="flex flex-1 items-center justify-center py-12">

        {/* ── Step 0: Welcome ──────────────────────────── */}
        {step === 0 && (
          <StepWelcome variant={variant} onNext={() => setStep(1)} onSkip={handleSkip} />
        )}

        {/* ── Step 1: Pick Modules ─────────────────────── */}
        {step === 1 && variant === 'free' && (
          <StepPickModulesFree
            selected={selectedTypes}
            weatherCity={weatherCity}
            onChange={setSelectedTypes}
            onWeatherCityChange={setWeatherCity}
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        )}
        {step === 1 && variant === 'pro' && (
          <StepPickModulesPro
            selected={selectedTypes}
            onChange={setSelectedTypes}
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        )}

        {/* ── Free Step 2: Inbox setup ─────────────────── */}
        {step === 2 && variant === 'free' && (
          <StepInboxSetup
            onContinue={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}

        {/* ── Free Step 3: Finish ──────────────────────── */}
        {step === 3 && variant === 'free' && (
          <StepFinishFree
            selected={selectedTypes}
            isSaving={isSaving}
            savingMessage={savingMessage}
            saveError={saveError}
            onFinish={handleFreeFinish}
            onFinishAndUpgrade={handleFreeFinishAndUpgrade}
            onBack={() => setStep(2)}
          />
        )}

        {/* ── Pro Step 2: Configure modules ────────────── */}
        {step === 2 && variant === 'pro' && (
          <StepConfigurePro
            selectedTypes={selectedTypes}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
            onConfigsSaved={setModuleConfigs}
          />
        )}

        {/* ── Pro Step 3: Inbox setup ──────────────────── */}
        {step === 3 && variant === 'pro' && (
          <StepInboxSetup
            onContinue={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}

        {/* ── Pro Step 4: Delivery + Stripe ────────────── */}
        {step === 4 && variant === 'pro' && (
          <StepDeliveryAndStripe
            isSaving={isSaving}
            savingMessage={savingMessage}
            saveError={saveError}
            onPay={handleProPay}
            onSkip={handleProSkip}
            onBack={() => setStep(3)}
          />
        )}
      </div>
    </div>
  );
}
