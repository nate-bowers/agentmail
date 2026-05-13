'use client';

import { useState } from 'react';
import {
  Cloud, Newspaper, Quote, TrendingUp, HelpCircle,
  Plus, X, Check, type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose,
} from '@/components/ui/sheet';
import { MODULE_REGISTRY } from '@/lib/modules';
import type { ModuleRow } from '@/types';

// ─── Icon map ─────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = { Cloud, Newspaper, Quote, TrendingUp };

// ─── Config forms ─────────────────────────────────────────────

interface FormProps {
  initialConfig: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

function WeatherConfigForm({ initialConfig, onChange }: FormProps) {
  const [locations, setLocations] = useState<string[]>(
    (initialConfig.locations as string[] | undefined) ?? ['']
  );

  function update(idx: number, value: string) {
    const next = locations.map((l, i) => (i === idx ? value : l));
    setLocations(next);
    onChange({ locations: next.filter(Boolean) });
  }

  function remove(idx: number) {
    const next = locations.filter((_, i) => i !== idx);
    setLocations(next);
    onChange({ locations: next.filter(Boolean) });
  }

  function add() {
    const next = [...locations, ''];
    setLocations(next);
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-ink">Locations</Label>
      {locations.map((loc, idx) => (
        <div key={idx} className="flex gap-2">
          <Input
            value={loc}
            onChange={(e) => update(idx, e.target.value)}
            placeholder="e.g. Nashville, TN"
          />
          {locations.length > 1 && (
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(idx)}>
              <X className="h-4 w-4" />
            </Button>
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
  const [topics, setTopics] = useState<string[]>(
    (initialConfig.topics as string[] | undefined) ?? []
  );
  const [count, setCount] = useState<number>(
    (initialConfig.count as number | undefined) ?? 5
  );
  const [inputValue, setInputValue] = useState('');

  function addTopic() {
    const trimmed = inputValue.trim().toLowerCase();
    if (trimmed && !topics.includes(trimmed) && topics.length < 5) {
      const next = [...topics, trimmed];
      setTopics(next);
      setInputValue('');
      onChange({ topics: next, count });
    }
  }

  function removeTopic(topic: string) {
    const next = topics.filter((t) => t !== topic);
    setTopics(next);
    onChange({ topics: next, count });
  }

  function updateCount(n: number) {
    setCount(n);
    onChange({ topics, count: n });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-ink">Topics</Label>
        <div className="flex min-h-[44px] flex-wrap gap-1.5 rounded-lg border border-surface-border bg-white px-3 py-2">
          {topics.map((topic) => (
            <span
              key={topic}
              className="inline-flex items-center gap-1 rounded-full bg-brand-purple-light px-2.5 py-0.5 text-xs font-medium text-brand-purple"
            >
              {topic}
              <button type="button" onClick={() => removeTopic(topic)}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {topics.length < 5 && (
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTopic(); } }}
              onBlur={addTopic}
              placeholder={topics.length === 0 ? 'Type a topic and press Enter…' : ''}
              className="min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-ink-faint"
            />
          )}
        </div>
        <p className="text-xs text-ink-faint">Press Enter to add. Max 5 topics.</p>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-ink">Number of headlines</Label>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="icon" className="h-8 w-8"
            disabled={count <= 3} onClick={() => updateCount(Math.max(3, count - 1))}>–</Button>
          <span className="w-6 text-center text-sm font-medium">{count}</span>
          <Button type="button" variant="outline" size="icon" className="h-8 w-8"
            disabled={count >= 10} onClick={() => updateCount(Math.min(10, count + 1))}>+</Button>
        </div>
      </div>
    </div>
  );
}

const QUOTE_STYLES = [
  { value: 'stoic', emoji: '⚖️', label: 'Stoic' },
  { value: 'motivational', emoji: '🔥', label: 'Motivational' },
  { value: 'philosophical', emoji: '🧠', label: 'Philosophical' },
  { value: 'funny', emoji: '😄', label: 'Funny' },
];

function QuoteConfigForm({ initialConfig, onChange }: FormProps) {
  const [style, setStyle] = useState<string>(
    (initialConfig.style as string | undefined) ?? 'stoic'
  );

  function select(val: string) {
    setStyle(val);
    onChange({ style: val });
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-ink">Quote style</Label>
      <div className="grid grid-cols-2 gap-2">
        {QUOTE_STYLES.map(({ value, emoji, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => select(value)}
            className={`flex items-center gap-2.5 rounded-lg border p-3 text-left text-sm transition-colors ${
              style === value
                ? 'border-brand-purple bg-brand-purple-light font-medium text-brand-purple'
                : 'border-surface-border bg-white text-ink hover:border-brand-purple hover:bg-brand-purple-light'
            }`}
          >
            <span className="text-base">{emoji}</span>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function MarketsConfigForm({ initialConfig, onChange }: FormProps) {
  const [symbols, setSymbols] = useState<string[]>(
    (initialConfig.symbols as string[] | undefined) ?? ['']
  );

  function update(idx: number, value: string) {
    const next = symbols.map((s, i) => (i === idx ? value.toUpperCase() : s));
    setSymbols(next);
    onChange({ symbols: next.filter(Boolean) });
  }

  function remove(idx: number) {
    const next = symbols.filter((_, i) => i !== idx);
    setSymbols(next);
    onChange({ symbols: next.filter(Boolean) });
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-ink">Symbols</Label>
      {symbols.map((sym, idx) => (
        <div key={idx} className="flex gap-2">
          <Input
            value={sym}
            onChange={(e) => update(idx, e.target.value)}
            placeholder="e.g. NVDA, BTC-USD"
            className="font-mono uppercase"
          />
          {symbols.length > 1 && (
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(idx)}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      {symbols.length < 5 && (
        <Button type="button" variant="outline" size="sm"
          onClick={() => setSymbols((prev) => [...prev, ''])}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add symbol
        </Button>
      )}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────

interface ModuleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editModule?: Pick<ModuleRow, 'id' | 'module_type' | 'config'> | null;
  onSaved: () => void;
}

// ─── Main component ───────────────────────────────────────────

export default function ModuleSheet({ open, onOpenChange, editModule, onSaved }: ModuleSheetProps) {
  const isEditing = !!editModule;
  const [selectedType, setSelectedType] = useState<string | null>(editModule?.module_type ?? null);
  const [config, setConfig] = useState<Record<string, unknown>>(editModule?.config ?? {});
  const [isLoading, setIsLoading] = useState(false);

  // Reset state when sheet opens/closes
  function handleOpenChange(next: boolean) {
    if (!next) {
      setSelectedType(editModule?.module_type ?? null);
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

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(typeof error === 'string' ? error : 'Save failed');
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

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex flex-col overflow-hidden">
        <SheetHeader>
          <SheetTitle>{isEditing ? `Edit ${selectedDef?.label ?? ''}` : 'Add a module'}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Step 1 — type picker (skip if editing) */}
          {!isEditing && (
            <div className="grid grid-cols-2 gap-3">
              {Object.values(MODULE_REGISTRY).map((def) => {
                const Icon = ICON_MAP[def.icon] ?? HelpCircle;
                const isSelected = selectedType === def.type;
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
                    {isSelected && (
                      <span className="absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-purple">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </span>
                    )}
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-purple-light">
                      <Icon className="h-4 w-4 text-brand-purple" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink">{def.label}</p>
                      <p className="text-xs text-ink-muted leading-snug mt-0.5">{def.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 2 — config form */}
          {selectedType && selectedDef && (
            <div className="space-y-4">
              {!isEditing && (
                <div className="h-px bg-surface-border" />
              )}
              {selectedType === 'weather' && (
                <WeatherConfigForm
                  initialConfig={editModule?.config ?? selectedDef.defaultConfig as Record<string, unknown>}
                  onChange={setConfig}
                />
              )}
              {selectedType === 'news' && (
                <NewsConfigForm
                  initialConfig={editModule?.config ?? selectedDef.defaultConfig as Record<string, unknown>}
                  onChange={setConfig}
                />
              )}
              {selectedType === 'quote' && (
                <QuoteConfigForm
                  initialConfig={editModule?.config ?? selectedDef.defaultConfig as Record<string, unknown>}
                  onChange={setConfig}
                />
              )}
              {selectedType === 'markets' && (
                <MarketsConfigForm
                  initialConfig={editModule?.config ?? selectedDef.defaultConfig as Record<string, unknown>}
                  onChange={setConfig}
                />
              )}
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
