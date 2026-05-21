'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { configSchema, type NewsConfig, FIXED_ARTICLE_COUNT } from '@/lib/modules/news';
import { SpecificityTooltip } from '@/components/modules/SpecificityTooltip';
import { PresetChipPicker } from '@/components/modules/PresetChipPicker';
import { NEWS_TOPIC_PRESETS, NEWS_SOURCE_PRESETS } from '@/lib/modules/presets';

interface Props {
  defaultValues: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
  disableHints?: boolean;
}

export function NewsForm({ defaultValues, onSubmit, disableHints }: Props) {
  const form = useForm<NewsConfig>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(configSchema) as any,
    defaultValues: {
      topics: (defaultValues.topics as string[] | undefined) ?? ['technology'],
      customQuery: (defaultValues.customQuery as string | undefined) ?? '',
      sources: (defaultValues.sources as string[] | undefined) ?? [],
      // articleCount is no longer user-editable. We keep it in the form state
      // so legacy DB values (5, 10) don't trip the resolver; new rows save as 3.
      articleCount: (defaultValues.articleCount as 3 | 5 | 10 | undefined) ?? FIXED_ARTICLE_COUNT,
      excludeTopics: (defaultValues.excludeTopics as string | undefined) ?? '',
    },
  });

  return (
    <form id="config-form" onSubmit={form.handleSubmit(onSubmit as (data: NewsConfig) => void)} className="space-y-5">
      <Controller
        control={form.control}
        name="topics"
        render={({ field, fieldState }) => (
          <SpecificityTooltip
            fieldId="news.topics"
            disabled={disableHints}
            message="Pick from the list or type your own. Niche works: &lsquo;AI chip supply chain&rsquo; beats &lsquo;tech&rsquo;."
          >
            <div className="space-y-2">
              <Label className="text-sm font-medium text-ink">
                Topics <span className="font-normal text-ink-faint">(pick up to 5)</span>
              </Label>
              <PresetChipPicker
                presets={NEWS_TOPIC_PRESETS}
                value={(field.value as string[]) ?? []}
                onChange={field.onChange}
                max={5}
                customPlaceholder="Add your own topic…"
                normalize={(v) => v.trim().toLowerCase()}
              />
              {fieldState.error && <p className="text-xs text-red-500">{fieldState.error.message}</p>}
            </div>
          </SpecificityTooltip>
        )}
      />

      <Controller
        control={form.control}
        name="customQuery"
        render={({ field }) => (
          <SpecificityTooltip
            fieldId="news.customQuery"
            disabled={disableHints}
            message="The more specific you are, the better. &lsquo;Federal Reserve rate decisions and bond market reaction&rsquo; beats &lsquo;finance&rsquo;."
          >
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
          </SpecificityTooltip>
        )}
      />

      <Controller
        control={form.control}
        name="sources"
        render={({ field }) => (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-ink">
              Preferred sources <span className="font-normal text-ink-faint">(optional, max 3)</span>
            </Label>
            <PresetChipPicker
              presets={NEWS_SOURCE_PRESETS}
              value={(field.value as string[] | undefined) ?? []}
              onChange={field.onChange}
              max={3}
              customPlaceholder="Add a specific publication…"
            />
            <p className="text-xs text-ink-faint">
              Pinning sources turns this into a hard whitelist. Leave empty for a mix of mainstream outlets.
            </p>
          </div>
        )}
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

      <p className="text-sm text-ink-muted">
        You get <span className="font-medium text-ink">3 articles</span> from {FIXED_ARTICLE_COUNT} different mainstream sources. Costs{' '}
        <span className="font-medium text-brand-purple">2 credits</span>.
      </p>
    </form>
  );
}
