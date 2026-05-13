'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { configSchema, type NewsConfig } from '@/lib/modules/news';
import { SegmentedControl } from './FormPrimitives';
import { getModulePoints } from '@/lib/modules/points';

interface Props {
  defaultValues: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
}

export function NewsForm({ defaultValues, onSubmit }: Props) {
  const form = useForm<NewsConfig>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(configSchema) as any,
    defaultValues: {
      topics: (defaultValues.topics as string[] | undefined) ?? ['technology'],
      customQuery: (defaultValues.customQuery as string | undefined) ?? '',
      sources: (defaultValues.sources as string[] | undefined) ?? [],
      articleCount: (defaultValues.articleCount as 3 | 5 | 10 | undefined) ?? 5,
      excludeTopics: (defaultValues.excludeTopics as string | undefined) ?? '',
    },
  });

  const articleCount = form.watch('articleCount');
  const pointCost = getModulePoints('news', { articleCount });

  return (
    <form id="config-form" onSubmit={form.handleSubmit(onSubmit as (data: NewsConfig) => void)} className="space-y-5">
      <Controller
        control={form.control}
        name="topics"
        render={({ field, fieldState }) => {
          const topics = field.value as string[];
          return (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-ink">Topics</Label>
              <div className="flex min-h-[44px] flex-wrap gap-1.5 rounded-lg border border-surface-border bg-white px-3 py-2">
                {topics.map((topic) => (
                  <span key={topic} className="inline-flex items-center gap-1 rounded-full bg-brand-purple-light px-2.5 py-0.5 text-xs font-medium text-brand-purple">
                    {topic}
                    <button type="button" onClick={() => field.onChange(topics.filter((t) => t !== topic))}><X className="h-3 w-3" /></button>
                  </span>
                ))}
                {topics.length < 5 && (
                  <TopicInput onAdd={(t) => { if (!topics.includes(t)) field.onChange([...topics, t]); }} />
                )}
              </div>
              <p className="text-xs text-ink-faint">Press Enter to add. Max 5 topics.</p>
              {fieldState.error && <p className="text-xs text-red-500">{fieldState.error.message}</p>}
            </div>
          );
        }}
      />

      <Controller
        control={form.control}
        name="customQuery"
        render={({ field }) => (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-ink">Narrow it down <span className="font-normal text-ink-faint">(optional)</span></Label>
            <div className="relative">
              <textarea
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value.slice(0, 200))}
                placeholder="e.g. Only Taiwanese AI GPU supply chain news"
                rows={2}
                className="w-full resize-none rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-purple/30"
              />
              <span className="absolute bottom-2 right-3 text-[10px] text-ink-faint">{(field.value ?? '').length}/200</span>
            </div>
          </div>
        )}
      />

      <Controller
        control={form.control}
        name="sources"
        render={({ field }) => {
          const sources = (field.value ?? []) as string[];
          return (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-ink">Preferred sources <span className="font-normal text-ink-faint">(optional, max 3)</span></Label>
              <div className="flex min-h-[44px] flex-wrap gap-1.5 rounded-lg border border-surface-border bg-white px-3 py-2">
                {sources.map((src) => (
                  <span key={src} className="inline-flex items-center gap-1 rounded-full bg-brand-purple-light px-2.5 py-0.5 text-xs font-medium text-brand-purple">
                    {src}
                    <button type="button" onClick={() => field.onChange(sources.filter((s) => s !== src))}><X className="h-3 w-3" /></button>
                  </span>
                ))}
                {sources.length < 3 && (
                  <TopicInput onAdd={(s) => { if (!sources.includes(s)) field.onChange([...sources, s]); }} placeholder="e.g. Reuters, The Verge" />
                )}
              </div>
            </div>
          );
        }}
      />

      <Controller
        control={form.control}
        name="excludeTopics"
        render={({ field }) => (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-ink">Exclude topics <span className="font-normal text-ink-faint">(optional)</span></Label>
            <Input
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value.slice(0, 100))}
              placeholder="e.g. crypto, celebrity news"
            />
          </div>
        )}
      />

      <Controller
        control={form.control}
        name="articleCount"
        render={({ field }) => (
          <SegmentedControl
            label="Article count"
            value={field.value}
            onChange={field.onChange}
            options={[
              { value: 3 as const, label: '3 articles — 1pt' },
              { value: 5 as const, label: '5 articles — 2pts' },
              { value: 10 as const, label: '10 articles — 3pts' },
            ]}
          />
        )}
      />
      <p className="text-sm text-ink-muted">
        This module costs{' '}
        <span className="font-medium text-brand-purple">{pointCost} {pointCost === 1 ? 'point' : 'points'}</span>
      </p>
    </form>
  );
}

function TopicInput({ onAdd, placeholder }: { onAdd: (t: string) => void; placeholder?: string }) {
  return (
    <input
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          const val = (e.target as HTMLInputElement).value.trim().toLowerCase();
          if (val) { onAdd(val); (e.target as HTMLInputElement).value = ''; }
        }
      }}
      onBlur={(e) => {
        const val = e.target.value.trim().toLowerCase();
        if (val) { onAdd(val); e.target.value = ''; }
      }}
      placeholder={placeholder ?? 'Type a topic and press Enter…'}
      className="min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-ink-faint"
    />
  );
}
