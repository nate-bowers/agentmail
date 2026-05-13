'use client';

import { useState } from 'react';
import {
  Cloud, Newspaper, Quote, TrendingUp,
  Trophy, BookOpen, Dumbbell, Brain, Calendar, ArrowLeftRight, Headphones, Lightbulb,
  HelpCircle, Plus, X, Check, type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose,
} from '@/components/ui/sheet';
import { MODULE_REGISTRY, MODULE_DISPLAY_ORDER, POPULAR_MODULE_TYPES, NEW_MODULE_TYPES } from '@/lib/modules';
import type { ModuleRow } from '@/types';

// ─── Icon map ──────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  Cloud, Newspaper, Quote, TrendingUp,
  Trophy, BookOpen, Dumbbell, Brain, Calendar, ArrowLeftRight, Headphones, Lightbulb,
};

// ─── Shared form primitives ───────────────────────────────────

interface FormProps {
  initialConfig: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

function RadioCards<T extends string>({
  value, onChange, options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; description?: string; emoji?: string }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex items-start gap-2.5 rounded-lg border p-3 text-left text-sm transition-colors ${
            value === opt.value
              ? 'border-brand-purple bg-brand-purple-light font-medium text-brand-purple'
              : 'border-surface-border bg-white text-ink hover:border-brand-purple hover:bg-brand-purple-light'
          }`}
        >
          {opt.emoji && <span className="text-base leading-none mt-0.5">{opt.emoji}</span>}
          <div>
            <p className="font-medium">{opt.label}</p>
            {opt.description && <p className="mt-0.5 text-xs font-normal opacity-70">{opt.description}</p>}
          </div>
        </button>
      ))}
    </div>
  );
}

function PillSelect<T extends string>({
  value, onChange, options, multi = false, maxSelect,
}: {
  value: T | T[];
  onChange: (v: T | T[]) => void;
  options: { value: T; label: string }[];
  multi?: boolean;
  maxSelect?: number;
}) {
  function isSelected(v: T) {
    return multi ? (value as T[]).includes(v) : value === v;
  }
  function toggle(v: T) {
    if (!multi) { onChange(v); return; }
    const arr = value as T[];
    if (arr.includes(v)) { onChange(arr.filter((x) => x !== v)); return; }
    if (maxSelect && arr.length >= maxSelect) return;
    onChange([...arr, v]);
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => toggle(opt.value)}
          className={`rounded-full px-3 py-1 text-sm transition-colors ${
            isSelected(opt.value)
              ? 'bg-brand-purple text-white'
              : 'border border-surface-border bg-white text-ink hover:border-brand-purple'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function MultiInput({
  values, onChange, placeholder, max = 5, label,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  max?: number;
  label?: string;
}) {
  function update(idx: number, val: string) {
    const next = values.map((v, i) => (i === idx ? val : v));
    onChange(next);
  }
  function remove(idx: number) { onChange(values.filter((_, i) => i !== idx)); }
  function add() { if (values.length < max) onChange([...values, '']); }

  return (
    <div className="space-y-3">
      {label && <Label className="text-sm font-medium text-ink">{label}</Label>}
      {values.map((val, idx) => (
        <div key={idx} className="flex gap-2">
          <Input value={val} onChange={(e) => update(idx, e.target.value)} placeholder={placeholder} />
          {values.length > 1 && (
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(idx)}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      {values.length < max && (
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add
        </Button>
      )}
    </div>
  );
}

function TagInput({
  values, onChange, placeholder, max = 5, label,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  max?: number;
  label?: string;
}) {
  const [inputValue, setInputValue] = useState('');
  function add() {
    const trimmed = inputValue.trim().toLowerCase();
    if (trimmed && !values.includes(trimmed) && values.length < max) {
      onChange([...values, trimmed]);
      setInputValue('');
    }
  }
  function remove(tag: string) { onChange(values.filter((t) => t !== tag)); }

  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-medium text-ink">{label}</Label>}
      <div className="flex min-h-[44px] flex-wrap gap-1.5 rounded-lg border border-surface-border bg-white px-3 py-2">
        {values.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-brand-purple-light px-2.5 py-0.5 text-xs font-medium text-brand-purple">
            {tag}
            <button type="button" onClick={() => remove(tag)}><X className="h-3 w-3" /></button>
          </span>
        ))}
        {values.length < max && (
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }}
            onBlur={add}
            placeholder={values.length === 0 ? placeholder : ''}
            className="min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-ink-faint"
          />
        )}
      </div>
      <p className="text-xs text-ink-faint">Press Enter to add. Max {max}.</p>
    </div>
  );
}

// ─── Segmented control ────────────────────────────────────────

function SegmentedControl<T extends string | number>({
  value, onChange, options, label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label?: string;
}) {
  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-medium text-ink">{label}</Label>}
      <div className="flex rounded-lg border border-surface-border overflow-hidden">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 py-2 text-sm transition-colors ${
              value === opt.value
                ? 'bg-brand-purple text-white font-medium'
                : 'bg-white text-ink hover:bg-brand-purple-light'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Optional text field helper ───────────────────────────────

function OptionalTextarea({
  label, value, onChange, placeholder, maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  maxLength: number;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-ink">{label}</Label>
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          placeholder={placeholder}
          rows={3}
          className="w-full resize-none rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-purple/30"
        />
        <span className="absolute bottom-2 right-3 text-[10px] text-ink-faint">
          {value.length}/{maxLength}
        </span>
      </div>
    </div>
  );
}

function OptionalInput({
  label, value, onChange, placeholder, maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  maxLength: number;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-ink">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        placeholder={placeholder}
        maxLength={maxLength}
      />
    </div>
  );
}

// ─── Config forms — original four ─────────────────────────────

function WeatherConfigForm({ initialConfig, onChange }: FormProps) {
  const [locations, setLocations] = useState<string[]>(
    (initialConfig.locations as string[] | undefined) ?? ['']
  );
  function update(idx: number, value: string) {
    const next = locations.map((l, i) => (i === idx ? value : l));
    setLocations(next); onChange({ locations: next.filter(Boolean) });
  }
  function remove(idx: number) {
    const next = locations.filter((_, i) => i !== idx);
    setLocations(next); onChange({ locations: next.filter(Boolean) });
  }
  function add() { setLocations([...locations, '']); }
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-ink">Locations</Label>
      {locations.map((loc, idx) => (
        <div key={idx} className="flex gap-2">
          <Input value={loc} onChange={(e) => update(idx, e.target.value)} placeholder="e.g. Nashville, TN" />
          {locations.length > 1 && (
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(idx)}><X className="h-4 w-4" /></Button>
          )}
        </div>
      ))}
      {locations.length < 3 && (
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add location
        </Button>
      )}
    </div>
  );
}

function NewsConfigForm({ initialConfig, onChange }: FormProps) {
  const [topics, setTopics] = useState<string[]>((initialConfig.topics as string[] | undefined) ?? []);
  const [customQuery, setCustomQuery] = useState<string>((initialConfig.customQuery as string | undefined) ?? '');
  const [sources, setSources] = useState<string[]>((initialConfig.sources as string[] | undefined) ?? []);
  const [articleCount, setArticleCount] = useState<3 | 5 | 10>(
    (initialConfig.articleCount as 3 | 5 | 10 | undefined) ?? 5
  );
  const [excludeTopics, setExcludeTopics] = useState<string>((initialConfig.excludeTopics as string | undefined) ?? '');
  const [topicInput, setTopicInput] = useState('');
  const [sourceInput, setSourceInput] = useState('');

  function emit(
    t = topics, q = customQuery, s = sources, ac = articleCount, ex = excludeTopics
  ) {
    onChange({
      topics: t, customQuery: q || undefined, sources: s.length > 0 ? s : undefined,
      articleCount: ac, excludeTopics: ex || undefined,
    });
  }

  function addTopic() {
    const trimmed = topicInput.trim().toLowerCase();
    if (trimmed && !topics.includes(trimmed) && topics.length < 5) {
      const next = [...topics, trimmed]; setTopics(next); setTopicInput(''); emit(next);
    }
  }
  function removeTopic(t: string) { const next = topics.filter((x) => x !== t); setTopics(next); emit(next); }

  function addSource() {
    const trimmed = sourceInput.trim();
    if (trimmed && !sources.includes(trimmed) && sources.length < 3) {
      const next = [...sources, trimmed]; setSources(next); setSourceInput(''); emit(topics, customQuery, next);
    }
  }
  function removeSource(s: string) {
    const next = sources.filter((x) => x !== s); setSources(next); emit(topics, customQuery, next);
  }

  const pointCost = articleCount <= 3 ? 1 : articleCount <= 5 ? 2 : 3;

  return (
    <div className="space-y-5">
      {/* Topics */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-ink">Topics</Label>
        <div className="flex min-h-[44px] flex-wrap gap-1.5 rounded-lg border border-surface-border bg-white px-3 py-2">
          {topics.map((topic) => (
            <span key={topic} className="inline-flex items-center gap-1 rounded-full bg-brand-purple-light px-2.5 py-0.5 text-xs font-medium text-brand-purple">
              {topic}<button type="button" onClick={() => removeTopic(topic)}><X className="h-3 w-3" /></button>
            </span>
          ))}
          {topics.length < 5 && (
            <input
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTopic(); } }}
              onBlur={addTopic}
              placeholder={topics.length === 0 ? 'Type a topic and press Enter…' : ''}
              className="min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-ink-faint"
            />
          )}
        </div>
        <p className="text-xs text-ink-faint">Press Enter to add. Max 5 topics.</p>
      </div>

      {/* Custom query */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-ink">Narrow it down <span className="font-normal text-ink-faint">(optional)</span></Label>
        <div className="relative">
          <textarea
            value={customQuery}
            onChange={(e) => { const v = e.target.value.slice(0, 200); setCustomQuery(v); emit(topics, v); }}
            placeholder="e.g. Only Taiwanese AI GPU supply chain news, or specifically Series A startup funding rounds"
            rows={2}
            className="w-full resize-none rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-purple/30"
          />
          <span className="absolute bottom-2 right-3 text-[10px] text-ink-faint">{customQuery.length}/200</span>
        </div>
      </div>

      {/* Preferred sources */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-ink">Preferred sources <span className="font-normal text-ink-faint">(optional, max 3)</span></Label>
        <div className="flex min-h-[44px] flex-wrap gap-1.5 rounded-lg border border-surface-border bg-white px-3 py-2">
          {sources.map((src) => (
            <span key={src} className="inline-flex items-center gap-1 rounded-full bg-brand-purple-light px-2.5 py-0.5 text-xs font-medium text-brand-purple">
              {src}<button type="button" onClick={() => removeSource(src)}><X className="h-3 w-3" /></button>
            </span>
          ))}
          {sources.length < 3 && (
            <input
              value={sourceInput}
              onChange={(e) => setSourceInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSource(); } }}
              onBlur={addSource}
              placeholder={sources.length === 0 ? 'e.g. Reuters, The Verge, FT' : ''}
              className="min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-ink-faint"
            />
          )}
        </div>
      </div>

      {/* Exclude topics */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-ink">Exclude topics <span className="font-normal text-ink-faint">(optional)</span></Label>
        <Input
          value={excludeTopics}
          onChange={(e) => { const v = e.target.value.slice(0, 100); setExcludeTopics(v); emit(topics, customQuery, sources, articleCount, v); }}
          placeholder="e.g. crypto, celebrity news"
          maxLength={100}
        />
      </div>

      {/* Article count */}
      <SegmentedControl
        label="Article count"
        value={articleCount}
        onChange={(v) => { setArticleCount(v); emit(topics, customQuery, sources, v); }}
        options={[
          { value: 3 as const, label: '3 articles — 1pt' },
          { value: 5 as const, label: '5 articles — 2pts' },
          { value: 10 as const, label: '10 articles — 3pts' },
        ]}
      />
      <p className="text-sm text-ink-muted">
        This module costs{' '}
        <span className="font-medium text-brand-purple">{pointCost} {pointCost === 1 ? 'point' : 'points'}</span>
      </p>
    </div>
  );
}

function QuoteConfigForm({ initialConfig, onChange }: FormProps) {
  const [style, setStyle] = useState<string>((initialConfig.style as string | undefined) ?? 'stoic');
  const [customPrompt, setCustomPrompt] = useState<string>((initialConfig.customPrompt as string | undefined) ?? '');

  function selectStyle(val: string) {
    setStyle(val);
    onChange({ style: val, customPrompt: customPrompt || undefined });
  }
  function updatePrompt(val: string) {
    setCustomPrompt(val);
    onChange({ style, customPrompt: val || undefined });
  }

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium text-ink">Quote style</Label>
      <RadioCards
        value={style as 'stoic' | 'motivational' | 'philosophical' | 'funny' | 'custom'}
        onChange={selectStyle}
        options={[
          { value: 'stoic' as const, label: 'Stoic', emoji: '⚖️' },
          { value: 'motivational' as const, label: 'Motivational', emoji: '🔥' },
          { value: 'philosophical' as const, label: 'Philosophical', emoji: '🧠' },
          { value: 'funny' as const, label: 'Funny', emoji: '😄' },
          { value: 'custom' as const, label: 'Custom ✏️', description: 'Describe exactly what you want' },
        ]}
      />
      {style === 'custom' && (
        <OptionalTextarea
          label="Your custom prompt"
          value={customPrompt}
          onChange={updatePrompt}
          placeholder="e.g. A quote about resilience from a female author, or something from Japanese philosophy"
          maxLength={200}
        />
      )}
    </div>
  );
}

function MarketsConfigForm({ initialConfig, onChange }: FormProps) {
  const [symbols, setSymbols] = useState<string[]>((initialConfig.symbols as string[] | undefined) ?? ['']);
  function update(idx: number, value: string) {
    const next = symbols.map((s, i) => (i === idx ? value.toUpperCase() : s));
    setSymbols(next); onChange({ symbols: next.filter(Boolean) });
  }
  function remove(idx: number) {
    const next = symbols.filter((_, i) => i !== idx); setSymbols(next); onChange({ symbols: next.filter(Boolean) });
  }
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-ink">Symbols</Label>
      {symbols.map((sym, idx) => (
        <div key={idx} className="flex gap-2">
          <Input value={sym} onChange={(e) => update(idx, e.target.value)} placeholder="e.g. NVDA, BTC-USD" className="font-mono uppercase" />
          {symbols.length > 1 && (
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(idx)}><X className="h-4 w-4" /></Button>
          )}
        </div>
      ))}
      {symbols.length < 5 && (
        <Button type="button" variant="outline" size="sm" onClick={() => setSymbols([...symbols, ''])}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add symbol
        </Button>
      )}
    </div>
  );
}

// ─── Config forms — new eight ──────────────────────────────────

function SportsConfigForm({ initialConfig, onChange }: FormProps) {
  const [teams, setTeams] = useState<string[]>((initialConfig.teams as string[] | undefined) ?? ['']);
  const [leagues, setLeagues] = useState<string[]>((initialConfig.leagues as string[] | undefined) ?? ['NBA']);
  const [customRequest, setCustomRequest] = useState<string>((initialConfig.customRequest as string | undefined) ?? '');

  const LEAGUE_OPTIONS = ['NBA', 'NFL', 'MLB', 'NHL', 'EPL', 'La Liga', 'F1'].map((l) => ({ value: l, label: l }));

  function emit(t = teams, l = leagues, cr = customRequest) {
    onChange({ teams: t.filter(Boolean), leagues: l, customRequest: cr || undefined });
  }
  function updateTeams(next: string[]) { setTeams(next); emit(next); }
  function toggleLeague(league: string) {
    const next = leagues.includes(league)
      ? leagues.filter((l) => l !== league)
      : leagues.length < 3 ? [...leagues, league] : leagues;
    setLeagues(next); emit(teams, next);
  }

  return (
    <div className="space-y-5">
      <MultiInput values={teams} onChange={updateTeams} placeholder="e.g. Lakers, 49ers" max={5} label="Teams (optional)" />
      <div className="space-y-2">
        <Label className="text-sm font-medium text-ink">Leagues <span className="font-normal text-ink-faint">(max 3)</span></Label>
        <div className="flex flex-wrap gap-2">
          {LEAGUE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleLeague(opt.value)}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                leagues.includes(opt.value)
                  ? 'bg-brand-purple text-white'
                  : 'border border-surface-border bg-white text-ink hover:border-brand-purple'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <OptionalTextarea
        label="Anything specific? (optional)"
        value={customRequest}
        onChange={(v) => { setCustomRequest(v); emit(teams, leagues, v); }}
        placeholder="e.g. Only show me 49ers scores if they won, or include injury reports for the Lakers"
        maxLength={200}
      />
    </div>
  );
}

function WordOfDayConfigForm({ initialConfig, onChange }: FormProps) {
  const [difficulty, setDifficulty] = useState<'everyday' | 'advanced' | 'obscure'>(
    (initialConfig.difficulty as 'everyday' | 'advanced' | 'obscure' | undefined) ?? 'advanced'
  );
  const [topic, setTopic] = useState<string>((initialConfig.topic as string | undefined) ?? '');

  function emit(d = difficulty, t = topic) { onChange({ difficulty: d, topic: t || undefined }); }
  function select(val: 'everyday' | 'advanced' | 'obscure') { setDifficulty(val); emit(val); }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-ink">Difficulty</Label>
        <RadioCards
          value={difficulty}
          onChange={select}
          options={[
            { value: 'everyday' as const, label: 'Everyday', description: 'Common but precise words' },
            { value: 'advanced' as const, label: 'Advanced', description: 'Expand your vocabulary' },
            { value: 'obscure' as const, label: 'Obscure', description: 'Rare and remarkable words' },
          ]}
        />
      </div>
      <OptionalInput
        label="Topic or domain (optional)"
        value={topic}
        onChange={(v) => { setTopic(v); emit(difficulty, v); }}
        placeholder="e.g. medicine, architecture, sailing, philosophy"
        maxLength={80}
      />
    </div>
  );
}

function WorkoutConfigForm({ initialConfig, onChange }: FormProps) {
  const [fitnessLevel, setFitnessLevel] = useState<'beginner' | 'intermediate' | 'advanced'>(
    (initialConfig.fitnessLevel as 'beginner' | 'intermediate' | 'advanced' | undefined) ?? 'intermediate'
  );
  const [equipment, setEquipment] = useState<'none' | 'minimal' | 'full_gym'>(
    (initialConfig.equipment as 'none' | 'minimal' | 'full_gym' | undefined) ?? 'minimal'
  );
  const [duration, setDuration] = useState<15 | 30 | 45>(
    (initialConfig.duration as 15 | 30 | 45 | undefined) ?? 30
  );
  const [focus, setFocus] = useState<'full_body' | 'upper' | 'lower' | 'cardio' | 'flexibility'>(
    (initialConfig.focus as 'full_body' | 'upper' | 'lower' | 'cardio' | 'flexibility' | undefined) ?? 'full_body'
  );
  const [injuries, setInjuries] = useState<string>((initialConfig.injuries as string | undefined) ?? '');
  const [customRequest, setCustomRequest] = useState<string>((initialConfig.customRequest as string | undefined) ?? '');

  function emit(
    fl = fitnessLevel, eq = equipment, dur = duration, fo = focus, inj = injuries, cr = customRequest
  ) {
    onChange({
      fitnessLevel: fl, equipment: eq, duration: dur, focus: fo,
      injuries: inj || undefined, customRequest: cr || undefined,
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-ink">Fitness level</Label>
        <RadioCards
          value={fitnessLevel}
          onChange={(v) => { setFitnessLevel(v); emit(v); }}
          options={[
            { value: 'beginner' as const, label: 'Beginner' },
            { value: 'intermediate' as const, label: 'Intermediate' },
            { value: 'advanced' as const, label: 'Advanced' },
          ]}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-ink">Equipment</Label>
        <RadioCards
          value={equipment}
          onChange={(v) => { setEquipment(v); emit(fitnessLevel, v); }}
          options={[
            { value: 'none' as const, label: 'None', emoji: '🧘', description: 'Bodyweight only' },
            { value: 'minimal' as const, label: 'Minimal', emoji: '🏠', description: 'Bands, dumbbells' },
            { value: 'full_gym' as const, label: 'Full Gym', emoji: '🏋️', description: 'All equipment' },
          ]}
        />
      </div>
      <SegmentedControl
        label="Duration"
        value={duration}
        onChange={(v) => { setDuration(v); emit(fitnessLevel, equipment, v); }}
        options={[
          { value: 15 as const, label: '15 min' },
          { value: 30 as const, label: '30 min' },
          { value: 45 as const, label: '45 min' },
        ]}
      />
      <div className="space-y-2">
        <Label className="text-sm font-medium text-ink">Focus</Label>
        <PillSelect
          value={focus}
          onChange={(v) => { setFocus(v as typeof focus); emit(fitnessLevel, equipment, duration, v as typeof focus); }}
          options={[
            { value: 'full_body', label: 'Full Body' },
            { value: 'upper', label: 'Upper' },
            { value: 'lower', label: 'Lower' },
            { value: 'cardio', label: 'Cardio' },
            { value: 'flexibility', label: 'Flexibility' },
          ]}
        />
      </div>
      <OptionalInput
        label="Injuries or limitations (optional)"
        value={injuries}
        onChange={(v) => { setInjuries(v); emit(fitnessLevel, equipment, duration, focus, v); }}
        placeholder="e.g. bad knees, lower back pain, avoid overhead pressing"
        maxLength={100}
      />
      <OptionalTextarea
        label="Anything specific? (optional)"
        value={customRequest}
        onChange={(v) => { setCustomRequest(v); emit(fitnessLevel, equipment, duration, focus, injuries, v); }}
        placeholder="e.g. I have a race in 3 weeks, focus on leg endurance"
        maxLength={150}
      />
    </div>
  );
}

function MindfulnessConfigForm({ initialConfig, onChange }: FormProps) {
  const [style, setStyle] = useState<string>(
    (initialConfig.style as string | undefined) ?? 'reflection'
  );
  const [customTheme, setCustomTheme] = useState<string>((initialConfig.customTheme as string | undefined) ?? '');

  function selectStyle(val: string) { setStyle(val); onChange({ style: val, customTheme: customTheme || undefined }); }
  function updateTheme(val: string) { setCustomTheme(val); onChange({ style, customTheme: val || undefined }); }

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium text-ink">Style</Label>
      <RadioCards
        value={style as 'reflection' | 'intention' | 'gratitude' | 'challenge' | 'custom'}
        onChange={selectStyle}
        options={[
          { value: 'reflection' as const, label: 'Reflection', description: 'Examine something about yourself' },
          { value: 'intention' as const, label: 'Intention', description: 'Set a theme for the day' },
          { value: 'gratitude' as const, label: 'Gratitude', description: 'Surface something to appreciate' },
          { value: 'challenge' as const, label: 'Challenge', description: 'A small action to take today' },
          { value: 'custom' as const, label: 'Custom ✏️', description: 'Write your own theme' },
        ]}
      />
      {style === 'custom' && (
        <OptionalTextarea
          label="Your theme"
          value={customTheme}
          onChange={updateTheme}
          placeholder="e.g. Focus on patience, or something related to my career decisions"
          maxLength={200}
        />
      )}
    </div>
  );
}

function OnThisDayConfigForm({ initialConfig, onChange }: FormProps) {
  const [category, setCategory] = useState<'any' | 'science' | 'politics' | 'sports' | 'arts' | 'technology'>(
    (initialConfig.category as 'any' | 'science' | 'politics' | 'sports' | 'arts' | 'technology' | undefined) ?? 'any'
  );
  const [regionFocus, setRegionFocus] = useState<string>((initialConfig.regionFocus as string | undefined) ?? '');

  function emit(c = category, r = regionFocus) { onChange({ category: c, regionFocus: r || undefined }); }
  function select(val: typeof category) { setCategory(val); emit(val); }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-ink">Category</Label>
        <PillSelect
          value={category}
          onChange={(v) => select(v as typeof category)}
          options={[
            { value: 'any', label: 'Any' },
            { value: 'science', label: 'Science' },
            { value: 'politics', label: 'Politics' },
            { value: 'sports', label: 'Sports' },
            { value: 'arts', label: 'Arts' },
            { value: 'technology', label: 'Technology' },
          ]}
        />
      </div>
      <OptionalInput
        label="Region or focus (optional)"
        value={regionFocus}
        onChange={(v) => { setRegionFocus(v); emit(category, v); }}
        placeholder="e.g. East Asia, Silicon Valley, Ancient Rome, women's history"
        maxLength={80}
      />
    </div>
  );
}

function CurrencyConfigForm({ initialConfig, onChange }: FormProps) {
  const [baseCurrency, setBaseCurrency] = useState<string>((initialConfig.baseCurrency as string | undefined) ?? 'USD');
  const [targetCurrencies, setTargetCurrencies] = useState<string[]>(
    (initialConfig.targetCurrencies as string[] | undefined) ?? ['']
  );

  function updateBase(val: string) {
    const upper = val.toUpperCase().slice(0, 3);
    setBaseCurrency(upper);
    onChange({ baseCurrency: upper, targetCurrencies: targetCurrencies.filter(Boolean) });
  }
  function updateTargets(next: string[]) {
    const upper = next.map((c) => c.toUpperCase().slice(0, 3));
    setTargetCurrencies(upper);
    onChange({ baseCurrency, targetCurrencies: upper.filter(Boolean) });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-ink">Base currency</Label>
        <Input
          value={baseCurrency}
          onChange={(e) => updateBase(e.target.value)}
          placeholder="USD"
          className="w-24 font-mono uppercase"
          maxLength={3}
        />
      </div>
      <MultiInput
        values={targetCurrencies}
        onChange={updateTargets}
        placeholder="e.g. EUR"
        max={5}
        label="Target currencies"
      />
    </div>
  );
}

function PodcastConfigForm({ initialConfig, onChange }: FormProps) {
  const [interests, setInterests] = useState<string[]>((initialConfig.interests as string[] | undefined) ?? ['technology']);
  const [episodeLength, setEpisodeLength] = useState<'short' | 'medium' | 'long'>(
    (initialConfig.episodeLength as 'short' | 'medium' | 'long' | undefined) ?? 'medium'
  );
  const [specificShow, setSpecificShow] = useState<string>((initialConfig.specificShow as string | undefined) ?? '');
  const [avoidTopics, setAvoidTopics] = useState<string>((initialConfig.avoidTopics as string | undefined) ?? '');

  function emit(i = interests, el = episodeLength, ss = specificShow, at = avoidTopics) {
    onChange({ interests: i, episodeLength: el, specificShow: ss || undefined, avoidTopics: at || undefined });
  }

  return (
    <div className="space-y-5">
      <TagInput values={interests} onChange={(v) => { setInterests(v); emit(v); }} placeholder="Type an interest and press Enter…" max={4} label="Interests" />
      <div className="space-y-2">
        <Label className="text-sm font-medium text-ink">Episode length</Label>
        <RadioCards
          value={episodeLength}
          onChange={(v) => { setEpisodeLength(v); emit(interests, v); }}
          options={[
            { value: 'short' as const, label: 'Short', description: 'Under 20 minutes' },
            { value: 'medium' as const, label: 'Medium', description: '20–45 minutes' },
            { value: 'long' as const, label: 'Long', description: '45 minutes+' },
          ]}
        />
      </div>
      <OptionalInput
        label="Prefer a specific show? (optional)"
        value={specificShow}
        onChange={(v) => { setSpecificShow(v); emit(interests, episodeLength, v); }}
        placeholder="e.g. Lex Fridman, How I Built This, Huberman Lab"
        maxLength={100}
      />
      <OptionalInput
        label="Avoid topics (optional)"
        value={avoidTopics}
        onChange={(v) => { setAvoidTopics(v); emit(interests, episodeLength, specificShow, v); }}
        placeholder="e.g. politics, crypto, true crime"
        maxLength={100}
      />
    </div>
  );
}

function FactConfigForm({ initialConfig, onChange }: FormProps) {
  const [category, setCategory] = useState<'any' | 'science' | 'nature' | 'history' | 'technology' | 'psychology'>(
    (initialConfig.category as 'any' | 'science' | 'nature' | 'history' | 'technology' | 'psychology' | undefined) ?? 'any'
  );
  const [customRequest, setCustomRequest] = useState<string>((initialConfig.customRequest as string | undefined) ?? '');

  function emit(c = category, cr = customRequest) { onChange({ category: c, customRequest: cr || undefined }); }
  function select(val: typeof category) { setCategory(val); emit(val); }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-ink">Category</Label>
        <PillSelect
          value={category}
          onChange={(v) => select(v as typeof category)}
          options={[
            { value: 'any', label: 'Any' },
            { value: 'science', label: 'Science' },
            { value: 'nature', label: 'Nature' },
            { value: 'history', label: 'History' },
            { value: 'technology', label: 'Technology' },
            { value: 'psychology', label: 'Psychology' },
          ]}
        />
      </div>
      <OptionalTextarea
        label="More specific? (optional)"
        value={customRequest}
        onChange={(v) => { setCustomRequest(v); emit(category, v); }}
        placeholder="e.g. facts about deep ocean creatures, or facts that involve surprising numbers"
        maxLength={150}
      />
    </div>
  );
}

// ─── Props ──────────────────────────────────────────────────────

interface ModuleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editModule?: Pick<ModuleRow, 'id' | 'module_type' | 'config'> | null;
  initialType?: string | null;
  onSaved: () => void;
}

// ─── Main component ─────────────────────────────────────────────

export default function ModuleSheet({ open, onOpenChange, editModule, initialType, onSaved }: ModuleSheetProps) {
  const isEditing = !!editModule;
  const [selectedType, setSelectedType] = useState<string | null>(
    editModule?.module_type ?? initialType ?? null
  );
  const [config, setConfig] = useState<Record<string, unknown>>(editModule?.config ?? {});
  const [isLoading, setIsLoading] = useState(false);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setSelectedType(editModule?.module_type ?? initialType ?? null);
      setConfig(editModule?.config ?? {});
    }
    onOpenChange(next);
  }

  async function handleSave() {
    if (!selectedType) return;
    const def = MODULE_REGISTRY[selectedType];
    if (!def) return;

    const finalConfig = Object.keys(config).length > 0 ? config : def.defaultConfig;

    setIsLoading(true);
    try {
      const res = isEditing
        ? await fetch(`/api/modules/${editModule!.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ config: finalConfig }),
          })
        : await fetch('/api/modules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ module_type: selectedType, config: finalConfig }),
          });

      if (res.status === 403 && !isEditing) {
        const body = await res.json();
        if (body.error === 'points_exceeded') {
          toast('No credits remaining', {
            description: `You've used all ${body.pointsLimit ?? 3} credits. Upgrade to Pro to add more modules.`,
            action: { label: 'Upgrade', onClick: () => { window.location.href = '/dashboard/upgrade'; } },
          });
          handleOpenChange(false);
          return;
        }
      }

      if (!res.ok) {
        const body = await res.json();
        throw new Error(typeof body.error === 'string' ? body.error : 'Save failed');
      }

      toast.success(isEditing ? 'Module updated.' : 'Module added.');
      onSaved();
      handleOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  }

  const selectedDef = selectedType ? MODULE_REGISTRY[selectedType] : null;

  // Ordered module list for the picker
  const orderedModules = MODULE_DISPLAY_ORDER
    .map((type) => MODULE_REGISTRY[type])
    .filter(Boolean);

  // Show the picker when: not editing AND no initialType preset
  const showPicker = !isEditing && !initialType;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex flex-col overflow-hidden">
        <SheetHeader>
          <SheetTitle>{isEditing ? `Edit ${selectedDef?.label ?? ''}` : 'Add a module'}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Module type picker */}
          {showPicker && (
            <div className="grid grid-cols-2 gap-3">
              {orderedModules.map((def) => {
                const Icon = ICON_MAP[def.icon] ?? HelpCircle;
                const isSelected = selectedType === def.type;
                const isPopular = POPULAR_MODULE_TYPES.has(def.type);
                const isNew = NEW_MODULE_TYPES.has(def.type);

                return (
                  <button
                    key={def.type}
                    onClick={() => {
                      setSelectedType(def.type);
                      setConfig(def.defaultConfig as Record<string, unknown>);
                    }}
                    className={`relative flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors ${
                      isSelected
                        ? 'border-brand-purple bg-brand-purple-light'
                        : 'border-surface-border bg-white hover:border-brand-purple hover:bg-brand-purple-light'
                    }`}
                  >
                    {/* Badge */}
                    {isPopular && !isSelected && (
                      <span className="absolute right-2 top-2 rounded-full bg-brand-purple-light px-1.5 py-0.5 text-[10px] font-medium text-brand-purple border border-brand-purple/20">
                        Popular
                      </span>
                    )}
                    {isNew && !isSelected && (
                      <span className="absolute right-2 top-2 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                        New
                      </span>
                    )}
                    {isSelected && (
                      <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-brand-purple">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </span>
                    )}

                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-purple-light">
                      <Icon className="h-4 w-4 text-brand-purple" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink pr-8">{def.label}</p>
                      <p className="text-xs text-ink-muted leading-snug mt-0.5 pr-4">{def.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Config form */}
          {selectedType && selectedDef && (
            <div className="space-y-4">
              {showPicker && selectedType && <div className="h-px bg-surface-border" />}
              {/* When initialType is set, show a back-to-picker header */}
              {initialType && !isEditing && (
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-purple-light">
                    {(() => { const Icon = ICON_MAP[selectedDef.icon] ?? HelpCircle; return <Icon className="h-4 w-4 text-brand-purple" />; })()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">{selectedDef.label}</p>
                    <p className="text-xs text-ink-muted">{selectedDef.description}</p>
                  </div>
                </div>
              )}
              {selectedType === 'weather' && <WeatherConfigForm initialConfig={editModule?.config ?? selectedDef.defaultConfig as Record<string, unknown>} onChange={setConfig} />}
              {selectedType === 'news' && <NewsConfigForm initialConfig={editModule?.config ?? selectedDef.defaultConfig as Record<string, unknown>} onChange={setConfig} />}
              {selectedType === 'quote' && <QuoteConfigForm initialConfig={editModule?.config ?? selectedDef.defaultConfig as Record<string, unknown>} onChange={setConfig} />}
              {selectedType === 'markets' && <MarketsConfigForm initialConfig={editModule?.config ?? selectedDef.defaultConfig as Record<string, unknown>} onChange={setConfig} />}
              {selectedType === 'sports' && <SportsConfigForm initialConfig={editModule?.config ?? selectedDef.defaultConfig as Record<string, unknown>} onChange={setConfig} />}
              {selectedType === 'word_of_day' && <WordOfDayConfigForm initialConfig={editModule?.config ?? selectedDef.defaultConfig as Record<string, unknown>} onChange={setConfig} />}
              {selectedType === 'workout' && <WorkoutConfigForm initialConfig={editModule?.config ?? selectedDef.defaultConfig as Record<string, unknown>} onChange={setConfig} />}
              {selectedType === 'mindfulness' && <MindfulnessConfigForm initialConfig={editModule?.config ?? selectedDef.defaultConfig as Record<string, unknown>} onChange={setConfig} />}
              {selectedType === 'on_this_day' && <OnThisDayConfigForm initialConfig={editModule?.config ?? selectedDef.defaultConfig as Record<string, unknown>} onChange={setConfig} />}
              {selectedType === 'currency' && <CurrencyConfigForm initialConfig={editModule?.config ?? selectedDef.defaultConfig as Record<string, unknown>} onChange={setConfig} />}
              {selectedType === 'podcast' && <PodcastConfigForm initialConfig={editModule?.config ?? selectedDef.defaultConfig as Record<string, unknown>} onChange={setConfig} />}
              {selectedType === 'fact' && <FactConfigForm initialConfig={editModule?.config ?? selectedDef.defaultConfig as Record<string, unknown>} onChange={setConfig} />}
            </div>
          )}
        </div>

        <SheetFooter>
          <SheetClose asChild>
            <Button variant="ghost">Cancel</Button>
          </SheetClose>
          <Button onClick={handleSave} disabled={!selectedType || isLoading}>
            {isLoading ? 'Saving…' : isEditing ? 'Save changes' : 'Add module'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
