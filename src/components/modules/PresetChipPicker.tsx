'use client';

// PresetChipPicker — pick from a curated preset list, with an optional
// freeform "Other" input that adds custom chips. Used across module config
// forms (News topics, Reddit subs, Podcast interests, AI/Tech subtopics,
// Sports leagues, Markets symbols, Recipe cuisine/dietary, Book genres,
// Local Events categories, Language).
//
// Selected values can be ANY string — both preset values and freeform user
// strings — so legacy DB rows render fine even if the preset list later
// drops the value. Items not in the preset list still render as chips with
// a slightly different visual cue ("Custom").

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { Preset } from '@/lib/modules/presets';

interface Props {
  presets: Preset[];
  value: string[];
  onChange: (next: string[]) => void;
  /** Max number of selected items. Adds beyond this are ignored. */
  max?: number;
  /** Allow freeform "Other" input. Default true. */
  allowCustom?: boolean;
  /** Placeholder for the Other input. */
  customPlaceholder?: string;
  /** Normalize incoming custom values. Default = trim. Pass `(v) => v.trim().toLowerCase()` to lowercase. */
  normalize?: (raw: string) => string;
  /** Filter custom values that should not be added (return false to reject). */
  customValidator?: (value: string) => boolean;
  /** When true, the chip list renders as single-select (radio-like). Default false. */
  singleSelect?: boolean;
}

export function PresetChipPicker({
  presets,
  value,
  onChange,
  max,
  allowCustom = true,
  customPlaceholder = 'Add your own…',
  normalize,
  customValidator,
  singleSelect = false,
}: Props) {
  const [customDraft, setCustomDraft] = useState('');

  const normalizeFn = normalize ?? ((v: string) => v.trim());
  const selectedSet = new Set(value);

  const atMax = max !== undefined && value.length >= max;

  // Custom chips are anything selected that isn't in the preset list.
  const presetValues = new Set(presets.map((p) => p.value));
  const customChips = value.filter((v) => !presetValues.has(v));

  function toggle(presetValue: string) {
    if (singleSelect) {
      onChange([presetValue]);
      return;
    }
    if (selectedSet.has(presetValue)) {
      onChange(value.filter((v) => v !== presetValue));
      return;
    }
    if (atMax) return;
    onChange([...value, presetValue]);
  }

  function removeCustom(v: string) {
    onChange(value.filter((x) => x !== v));
  }

  function addCustom() {
    const cleaned = normalizeFn(customDraft);
    if (!cleaned) return;
    if (selectedSet.has(cleaned)) {
      setCustomDraft('');
      return;
    }
    if (customValidator && !customValidator(cleaned)) return;
    if (atMax) return;
    if (singleSelect) {
      onChange([cleaned]);
    } else {
      onChange([...value, cleaned]);
    }
    setCustomDraft('');
  }

  return (
    <div className="space-y-3">
      {/* Preset chip grid */}
      <div className="flex flex-wrap gap-1.5">
        {presets.map((preset) => {
          const isSelected = selectedSet.has(preset.value);
          const isDisabled = !isSelected && atMax && !singleSelect;
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => toggle(preset.value)}
              disabled={isDisabled}
              aria-pressed={isSelected}
              className={[
                'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                'disabled:cursor-not-allowed disabled:opacity-40',
                isSelected
                  ? 'bg-brand-purple text-white'
                  : 'border border-surface-border bg-white text-ink hover:border-brand-purple hover:bg-brand-purple-light',
              ].join(' ')}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Custom (non-preset) chips already selected */}
      {customChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {customChips.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-full border border-brand-purple/30 bg-brand-purple-light px-2.5 py-1 text-xs font-medium text-brand-purple"
              title="Custom value"
            >
              {v}
              <button
                type="button"
                aria-label={`Remove ${v}`}
                onClick={() => removeCustom(v)}
                className="text-brand-purple/70 hover:text-brand-purple"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Other / freeform add */}
      {allowCustom && !atMax && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={customDraft}
            onChange={(e) => setCustomDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addCustom();
              }
            }}
            onBlur={() => {
              if (customDraft.trim()) addCustom();
            }}
            placeholder={customPlaceholder}
            className="h-9 min-w-0 flex-1 rounded-md border border-surface-border bg-white px-3 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-purple/30"
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!customDraft.trim()}
            className="inline-flex h-9 items-center gap-1 rounded-md border border-surface-border bg-white px-3 text-xs font-medium text-ink hover:border-brand-purple disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Add custom value"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
      )}

      {/* Max-reached helper */}
      {atMax && (
        <p className="text-xs text-ink-faint">
          Limit reached ({max}). Remove one to add another.
        </p>
      )}
    </div>
  );
}
