'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Label } from '@/components/ui/label';
import { configSchema, type RedditConfig } from '@/lib/modules/reddit';
import { SegmentedControl, RadioCards } from './FormPrimitives';
import { PresetChipPicker } from '@/components/modules/PresetChipPicker';
import { REDDIT_SUBREDDIT_PRESETS } from '@/lib/modules/presets';

interface Props {
  defaultValues: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
}

export function RedditForm({ defaultValues, onSubmit }: Props) {
  const form = useForm<RedditConfig>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(configSchema) as any,
    defaultValues: {
      subreddits: (defaultValues.subreddits as string[] | undefined) ?? ['todayilearned'],
      postCount: (defaultValues.postCount as 3 | 5 | undefined) ?? 3,
      sortBy: (defaultValues.sortBy as 'hot' | 'top' | undefined) ?? 'hot',
    },
  });

  return (
    <form id="config-form" onSubmit={form.handleSubmit(onSubmit as (data: RedditConfig) => void)} className="space-y-5">
      <Controller
        control={form.control}
        name="subreddits"
        render={({ field, fieldState }) => (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-ink">
              Subreddits <span className="font-normal text-ink-faint">(pick up to 5)</span>
            </Label>
            <PresetChipPicker
              presets={REDDIT_SUBREDDIT_PRESETS}
              value={(field.value as string[]) ?? []}
              onChange={field.onChange}
              max={5}
              customPlaceholder="Add a subreddit (without r/)…"
              normalize={(v) => v.trim().replace(/^r\//i, '')}
            />
            {fieldState.error && <p className="text-xs text-red-500">{fieldState.error.message}</p>}
          </div>
        )}
      />

      <Controller
        control={form.control}
        name="postCount"
        render={({ field }) => (
          <SegmentedControl
            label="Post count"
            value={field.value}
            onChange={field.onChange}
            options={[
              { value: 3 as const, label: '3 posts' },
              { value: 5 as const, label: '5 posts' },
            ]}
          />
        )}
      />

      <Controller
        control={form.control}
        name="sortBy"
        render={({ field }) => (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-ink">Sort by</Label>
            <RadioCards
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: 'hot' as const, label: 'Hot', description: 'Trending right now' },
                { value: 'top' as const, label: 'Top', description: 'Best of last 24 hours' },
              ]}
            />
          </div>
        )}
      />
    </form>
  );
}
