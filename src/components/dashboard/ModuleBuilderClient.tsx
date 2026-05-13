'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Cloud,
  Newspaper,
  Quote,
  TrendingUp,
  HelpCircle,
  Plus,
  X,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MODULE_REGISTRY } from '@/lib/modules';
import type { ModuleRow } from '@/types';

// ─────────────────────────────────────────────────────────────
// Icon map
// ─────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  Cloud,
  Newspaper,
  Quote,
  TrendingUp,
};

// ─────────────────────────────────────────────────────────────
// Config forms
// ─────────────────────────────────────────────────────────────

interface FormProps {
  initialConfig: Record<string, unknown>;
  onSubmit: (config: Record<string, unknown>) => void;
  isLoading: boolean;
}

function WeatherConfigForm({ initialConfig, onSubmit, isLoading }: FormProps) {
  const [locations, setLocations] = useState<string[]>(
    (initialConfig.locations as string[] | undefined) ?? ['']
  );

  function update(idx: number, value: string) {
    setLocations((prev) => prev.map((l, i) => (i === idx ? value : l)));
  }

  function remove(idx: number) {
    setLocations((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const filled = locations.filter((l) => l.trim() !== '');
    if (filled.length === 0) return;
    onSubmit({ locations: filled });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Locations</Label>
        {locations.map((loc, idx) => (
          <div key={idx} className="flex gap-2">
            <Input
              value={loc}
              onChange={(e) => update(idx, e.target.value)}
              placeholder="e.g. Nashville, TN"
              required
            />
            {locations.length > 1 && (
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(idx)}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        {locations.length < 5 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLocations((prev) => [...prev, ''])}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add location
          </Button>
        )}
      </div>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving…' : 'Save module'}
      </Button>
    </form>
  );
}

function NewsConfigForm({ initialConfig, onSubmit, isLoading }: FormProps) {
  const [topics, setTopics] = useState<string[]>(
    (initialConfig.topics as string[] | undefined) ?? []
  );
  const [count, setCount] = useState<number>(
    (initialConfig.count as number | undefined) ?? 5
  );
  const [inputValue, setInputValue] = useState('');

  function addTopic() {
    const trimmed = inputValue.trim().toLowerCase();
    if (trimmed && !topics.includes(trimmed) && topics.length < 10) {
      setTopics((prev) => [...prev, trimmed]);
      setInputValue('');
    }
  }

  function removeTopic(topic: string) {
    setTopics((prev) => prev.filter((t) => t !== topic));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTopic();
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (topics.length === 0) return;
    onSubmit({ topics, count });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label>Topics</Label>
        <div className="flex flex-wrap gap-1.5 rounded-md border px-3 py-2 min-h-[42px]">
          {topics.map((topic) => (
            <Badge key={topic} variant="secondary" className="gap-1 pr-1">
              {topic}
              <button type="button" onClick={() => removeTopic(topic)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={addTopic}
            placeholder={topics.length === 0 ? 'Type a topic and press Enter…' : ''}
            className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <p className="text-xs text-muted-foreground">Press Enter or comma to add a topic.</p>
      </div>

      <div className="space-y-2">
        <Label>Number of headlines</Label>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={count <= 1}
            onClick={() => setCount((n) => Math.max(1, n - 1))}
          >
            –
          </Button>
          <span className="w-6 text-center text-sm font-medium">{count}</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={count >= 10}
            onClick={() => setCount((n) => Math.min(10, n + 1))}
          >
            +
          </Button>
        </div>
      </div>

      <Button type="submit" disabled={isLoading || topics.length === 0}>
        {isLoading ? 'Saving…' : 'Save module'}
      </Button>
    </form>
  );
}

function QuoteConfigForm({ initialConfig, onSubmit, isLoading }: FormProps) {
  const [style, setStyle] = useState<string>(
    (initialConfig.style as string | undefined) ?? 'stoic'
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ style });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="quote-style">Style</Label>
        <Select value={style} onValueChange={setStyle}>
          <SelectTrigger id="quote-style" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stoic">Stoic</SelectItem>
            <SelectItem value="motivational">Motivational</SelectItem>
            <SelectItem value="philosophical">Philosophical</SelectItem>
            <SelectItem value="funny">Funny</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving…' : 'Save module'}
      </Button>
    </form>
  );
}

function MarketsConfigForm({ initialConfig, onSubmit, isLoading }: FormProps) {
  const [symbols, setSymbols] = useState<string[]>(
    (initialConfig.symbols as string[] | undefined) ?? ['']
  );

  function update(idx: number, value: string) {
    setSymbols((prev) => prev.map((s, i) => (i === idx ? value.toUpperCase() : s)));
  }

  function remove(idx: number) {
    setSymbols((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const filled = symbols.map((s) => s.trim().toUpperCase()).filter(Boolean);
    if (filled.length === 0) return;
    onSubmit({ symbols: filled });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Symbols</Label>
        {symbols.map((sym, idx) => (
          <div key={idx} className="flex gap-2">
            <Input
              value={sym}
              onChange={(e) => update(idx, e.target.value)}
              placeholder="e.g. SPY"
              required
              className="font-mono uppercase"
            />
            {symbols.length > 1 && (
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(idx)}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        {symbols.length < 10 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSymbols((prev) => [...prev, ''])}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add symbol
          </Button>
        )}
      </div>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving…' : 'Save module'}
      </Button>
    </form>
  );
}

function ConfigForm(props: { moduleType: string } & FormProps) {
  const { moduleType, ...rest } = props;
  switch (moduleType) {
    case 'weather': return <WeatherConfigForm {...rest} />;
    case 'news': return <NewsConfigForm {...rest} />;
    case 'quote': return <QuoteConfigForm {...rest} />;
    case 'markets': return <MarketsConfigForm {...rest} />;
    default: return <p className="text-sm text-muted-foreground">Unknown module type.</p>;
  }
}

// ─────────────────────────────────────────────────────────────
// Main builder component
// ─────────────────────────────────────────────────────────────

interface ModuleBuilderClientProps {
  initialModule?: Pick<ModuleRow, 'id' | 'module_type' | 'config'> | null;
}

export default function ModuleBuilderClient({ initialModule }: ModuleBuilderClientProps) {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<string | null>(
    initialModule?.module_type ?? null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!initialModule;

  async function handleSave(config: Record<string, unknown>) {
    setIsLoading(true);
    setError(null);

    try {
      const res = isEditing
        ? await fetch(`/api/modules/${initialModule!.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ config }),
          })
        : await fetch('/api/modules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ module_type: selectedType, config }),
          });

      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(typeof msg === 'string' ? msg : 'Save failed');
      }

      toast.success(isEditing ? 'Module updated.' : 'Module added.');
      router.push('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  }

  // ── Step 1: type selection grid ──────────────────────────────
  if (!selectedType) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Add a module</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Choose what to include in your daily brief.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {Object.values(MODULE_REGISTRY).map((def) => {
            const Icon = ICON_MAP[def.icon] ?? HelpCircle;
            return (
              <button
                key={def.type}
                onClick={() => setSelectedType(def.type)}
                className="flex items-start gap-3 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent hover:border-accent-foreground/20"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{def.label}</p>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                    {def.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Step 2: config form ──────────────────────────────────────
  const def = MODULE_REGISTRY[selectedType];
  const Icon = ICON_MAP[def?.icon ?? ''] ?? HelpCircle;

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 mb-3 text-muted-foreground"
          onClick={() => {
            if (isEditing) router.back();
            else setSelectedType(null);
          }}
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">
              {isEditing ? `Edit ${def?.label}` : `Configure ${def?.label}`}
            </h1>
            <p className="text-sm text-muted-foreground">{def?.description}</p>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {def && (
        <ConfigForm
          moduleType={selectedType}
          initialConfig={initialModule?.config ?? def.defaultConfig}
          onSubmit={handleSave}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
