'use client';

import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ─── RadioCards ───────────────────────────────────────────────

export function RadioCards<T extends string>({
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

// ─── PillSelect ───────────────────────────────────────────────

export function PillSelect<T extends string>({
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

// ─── MultiInput ───────────────────────────────────────────────

export function MultiInput({
  values, onChange, placeholder, max = 5, label, uppercase = false,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  max?: number;
  label?: string;
  uppercase?: boolean;
}) {
  function update(idx: number, val: string) {
    const next = values.map((v, i) => (i === idx ? (uppercase ? val.toUpperCase() : val) : v));
    onChange(next);
  }
  function remove(idx: number) { onChange(values.filter((_, i) => i !== idx)); }
  function add() { if (values.length < max) onChange([...values, '']); }

  return (
    <div className="space-y-3">
      {label && <Label className="text-sm font-medium text-ink">{label}</Label>}
      {values.map((val, idx) => (
        <div key={idx} className="flex gap-2">
          <Input
            value={val}
            onChange={(e) => update(idx, e.target.value)}
            placeholder={placeholder}
            className={uppercase ? 'font-mono uppercase' : undefined}
          />
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

// ─── TagInput ─────────────────────────────────────────────────

export function TagInput({
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

// ─── SegmentedControl ─────────────────────────────────────────

export function SegmentedControl<T extends string | number>({
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

// ─── OptionalTextarea ─────────────────────────────────────────

export function OptionalTextarea({
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

// ─── OptionalInput ────────────────────────────────────────────

export function OptionalInput({
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

// ─── Toggle ───────────────────────────────────────────────────

export function Toggle({
  label, description, checked, onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        {description && <p className="text-xs text-ink-muted">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
          checked ? 'bg-brand-purple' : 'bg-surface-border'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
