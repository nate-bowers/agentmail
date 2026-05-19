'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Label } from '@/components/ui/label';
import { configSchema, type SportsConfig } from '@/lib/modules/sports';
import { MultiInput, OptionalTextarea } from './FormPrimitives';
import { SpecificityTooltip } from '@/components/modules/SpecificityTooltip';

const LEAGUE_OPTIONS = ['NBA', 'NFL', 'MLB', 'NHL', 'EPL', 'La Liga', 'F1'];

interface Props {
  defaultValues: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
  disableHints?: boolean;
}

export function SportsForm({ defaultValues, onSubmit, disableHints }: Props) {
  const form = useForm<SportsConfig>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(configSchema) as any,
    defaultValues: {
      teams: (defaultValues.teams as string[] | undefined) ?? [],
      leagues: (defaultValues.leagues as string[] | undefined) ?? ['NBA'],
      customRequest: (defaultValues.customRequest as string | undefined) ?? '',
    },
  });

  return (
    <form id="config-form" onSubmit={form.handleSubmit(onSubmit as (data: SportsConfig) => void)} className="space-y-5">
      <Controller
        control={form.control}
        name="teams"
        render={({ field }) => {
          const teams = (field.value ?? []) as string[];
          const withEmpty = teams.length === 0 ? [''] : teams;
          return (
            <SpecificityTooltip
              fieldId="sports.teams"
              disabled={disableHints}
              message="List specific teams and leagues you follow. &lsquo;Premier League, especially Arsenal&rsquo; beats &lsquo;soccer.&rsquo;"
            >
              <MultiInput
                values={withEmpty}
                onChange={(v) => field.onChange(v.filter(Boolean))}
                placeholder="e.g. Lakers, 49ers"
                max={5}
                label="Teams (optional)"
              />
            </SpecificityTooltip>
          );
        }}
      />

      <Controller
        control={form.control}
        name="leagues"
        render={({ field, fieldState }) => {
          const leagues = (field.value ?? []) as string[];
          return (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-ink">Leagues <span className="font-normal text-ink-faint">(max 3)</span></Label>
              <div className="flex flex-wrap gap-2">
                {LEAGUE_OPTIONS.map((lg) => (
                  <button
                    key={lg}
                    type="button"
                    onClick={() => {
                      const next = leagues.includes(lg)
                        ? leagues.filter((l) => l !== lg)
                        : leagues.length < 3 ? [...leagues, lg] : leagues;
                      field.onChange(next);
                    }}
                    className={`rounded-full px-3 py-1 text-sm transition-colors ${
                      leagues.includes(lg)
                        ? 'bg-brand-purple text-white'
                        : 'border border-surface-border bg-white text-ink hover:border-brand-purple'
                    }`}
                  >
                    {lg}
                  </button>
                ))}
              </div>
              {fieldState.error && <p className="text-xs text-red-500">{fieldState.error.message}</p>}
            </div>
          );
        }}
      />

      <Controller
        control={form.control}
        name="customRequest"
        render={({ field }) => (
          <SpecificityTooltip
            fieldId="sports.customRequest"
            disabled={disableHints}
            message="Spell out what you actually want. &lsquo;Box scores plus injury report&rsquo; beats &lsquo;more detail&rsquo;."
          >
            <OptionalTextarea
              label="Anything specific? (optional)"
              value={field.value ?? ''}
              onChange={field.onChange}
              placeholder="e.g. Only show 49ers scores if they won, or include injury reports"
              maxLength={200}
            />
          </SpecificityTooltip>
        )}
      />
    </form>
  );
}
