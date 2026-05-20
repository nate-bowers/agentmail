'use client';

import { useState, useRef } from 'react';
import { AlertCircle, RefreshCw, Send, Zap, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MODULE_REGISTRY } from '@/lib/modules';
import { getModulePoints } from '@/lib/modules/points';
import type { GeneratedSection } from '@/lib/email/generate';
import type { ModuleRow } from '@/types';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOADING_MESSAGES = [
  "Checking today's weather...",
  'Scanning the news...',
  'Finding your quote...',
  'Assembling your brief...',
  'Almost ready...',
];

const APPEARANCE_OPTIONS = [
  { id: 'light', label: 'Light', color: '#ffffff', border: '#d1d5db' },
  { id: 'dark', label: 'Dark', color: '#0D0D0F', border: '#374151' },
  { id: 'pink', label: 'Pink', color: '#ffe4ea', border: '#f9a8d4' },
] as const;

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface PreviewData {
  html: string;
  intro?: string;
  sections?: GeneratedSection[];
  totalTokens: number;
  generatedAt: string;
  moduleStatus: Record<string, 'success' | 'error'>;
  modulesIncluded: string[];
}

interface PreviewClientProps {
  modules: ModuleRow[];
  initialTheme: string;
  initialVerbosity: string;
  userEmail: string;
  sendTime: string;
  timezone: string;
  initialGenerationsToday: number;
  initialTestSendsToday: number;
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

const DAILY_LIMIT = 3;
const TEST_SEND_LIMIT = 3;

export default function PreviewClient({
  modules,
  initialTheme,
  initialVerbosity,
  userEmail,
  sendTime,
  timezone,
  initialGenerationsToday,
  initialTestSendsToday,
}: PreviewClientProps) {
  // Appearance is always one of light/dark/pink
  const [appearance, setAppearance] = useState<string>(
    ['light', 'dark', 'pink'].includes(initialTheme) ? initialTheme : 'light'
  );
  const [verbosity, setVerbosity] = useState<'succinct' | 'medium' | 'wordy'>(
    (initialVerbosity as 'succinct' | 'medium' | 'wordy') ?? 'medium'
  );

  const [loading, setLoading] = useState(false);
  const [rerendering, setRerendering] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [testSending, setTestSending] = useState(false);
  const [generationsToday, setGenerationsToday] = useState(initialGenerationsToday);
  const [testSendsToday, setTestSendsToday] = useState(initialTestSendsToday);
  const msgIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const remaining = DAILY_LIMIT - generationsToday;
  const atLimit = remaining <= 0;
  const testSendsRemaining = TEST_SEND_LIMIT - testSendsToday;
  const testSendsAtLimit = testSendsRemaining <= 0;

  // Generate: calls Claude — expensive, slow
  async function generate(appearanceOverride?: string) {
    if (atLimit) return;
    const themeToUse = appearanceOverride ?? appearance;
    setLoading(true);
    setError(null);
    setPreviewData(null);

    let msgIdx = 0;
    setLoadingMsg(LOADING_MESSAGES[0]);
    msgIntervalRef.current = setInterval(() => {
      msgIdx = (msgIdx + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[msgIdx]);
    }, 2000);

    try {
      const res = await fetch('/api/email/generate-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: themeToUse }),
      });
      const data = await res.json();
      if (res.status === 429) {
        setGenerationsToday(DAILY_LIMIT);
        setError('limit_reached');
        return;
      }
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');
      setPreviewData(data as PreviewData);
      setGenerationsToday(DAILY_LIMIT - (data.remaining ?? 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      if (msgIntervalRef.current) clearInterval(msgIntervalRef.current);
      setLoading(false);
    }
  }

  // Re-render: uses stored sections + new theme — fast, no Claude
  async function rerenderWithTheme(newAppearance: string) {
    if (!previewData?.sections) return;
    setRerendering(true);
    try {
      const res = await fetch('/api/email/render-only', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intro: previewData.intro,
          sections: previewData.sections,
          theme: newAppearance,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Render failed');
      setPreviewData((prev) => prev ? { ...prev, html: data.html } : prev);
    } catch {
      // Silent fail — user still sees old HTML
    } finally {
      setRerendering(false);
    }
  }

  function handleAppearanceChange(newAppearance: string) {
    setAppearance(newAppearance);
    if (previewData) {
      // Re-render with stored sections — no Claude call
      rerenderWithTheme(newAppearance);
    }
  }

  async function handleSaveDefault() {
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_theme: appearance, email_verbosity: verbosity }),
      });
      if (!res.ok) throw new Error('Save failed');
      toast.success('Default theme saved ✓');
    } catch {
      toast.error('Failed to save theme.');
    }
  }

  async function handleTestSend() {
    if (testSendsAtLimit) return;
    setTestSending(true);
    try {
      const res = await fetch('/api/email/test-send', { method: 'POST' });
      const data = await res.json();
      if (res.status === 429) {
        setTestSendsToday(TEST_SEND_LIMIT);
        toast.error("You've reached the 3 test sends per day limit.");
        return;
      }
      if (!res.ok) throw new Error(data.error ?? 'Send failed');
      setTestSendsToday((prev) => prev + 1);
      toast.success(`Test email sent! ${data.remaining ?? 0} sends remaining today.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send test email');
    } finally {
      setTestSending(false);
    }
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-5 lg:gap-8">
      {/* ── Left sidebar ── */}
      <div className="space-y-4 lg:col-span-2">
        {/* Controls card */}
        <div className="rounded-xl border border-surface-border bg-white p-5 space-y-5">
          <p className="font-semibold text-ink">Preview</p>

          {/* Appearance selector */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted mb-2">
              Appearance
            </p>
            <TooltipProvider delayDuration={200}>
              <div className="flex gap-2">
                {APPEARANCE_OPTIONS.map((opt) => (
                  <Tooltip key={opt.id}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => handleAppearanceChange(opt.id)}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                          appearance === opt.id
                            ? 'border-brand-purple bg-brand-purple-light text-brand-purple'
                            : 'border-surface-border bg-white text-ink hover:border-brand-purple/50'
                        }`}
                      >
                        <span
                          className="inline-block h-3.5 w-3.5 rounded-full border flex-shrink-0"
                          style={{ backgroundColor: opt.color, borderColor: opt.border }}
                        />
                        {opt.label}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{opt.label} theme</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
          </div>

          {/* Length selector */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted mb-2">
              Length
            </p>
            <TooltipProvider delayDuration={200}>
              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setVerbosity('succinct')}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                        verbosity === 'succinct'
                          ? 'border-brand-purple bg-brand-purple-light text-brand-purple'
                          : 'border-surface-border bg-white text-ink hover:border-brand-purple/50'
                      }`}
                    >
                      <Zap className="h-3.5 w-3.5" /> Succinct
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Shorter summaries, less prose</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setVerbosity('wordy')}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                        verbosity === 'wordy'
                          ? 'border-brand-purple bg-brand-purple-light text-brand-purple'
                          : 'border-surface-border bg-white text-ink hover:border-brand-purple/50'
                      }`}
                    >
                      <BookOpen className="h-3.5 w-3.5" /> Wordy
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Full context, longer summaries</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>

          {/* Save as default */}
          <button
            type="button"
            onClick={handleSaveDefault}
            className="text-xs text-ink-muted hover:text-brand-purple transition-colors"
          >
            Save as my default theme
          </button>

          {/* Generate */}
          {!previewData && !loading && error !== 'limit_reached' && (
            <Button onClick={() => generate()} className="w-full" disabled={loading || atLimit}>
              Generate preview
            </Button>
          )}

          {/* Regenerate */}
          {(previewData || (error && error !== 'limit_reached')) && (
            <div className="space-y-1.5">
              <Button
                variant="ghost"
                onClick={() => generate()}
                disabled={loading || rerendering || atLimit}
                className="w-full gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Regenerate preview
              </Button>
              <p className="text-xs text-ink-muted text-center">
                {atLimit ? 'Limit reached — resets tomorrow' : `${remaining} of ${DAILY_LIMIT} remaining today`}
              </p>
            </div>
          )}

          {/* Limit reached (no prior preview) */}
          {error === 'limit_reached' && !previewData && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-center space-y-1">
              <p className="text-sm font-medium text-amber-800">Daily limit reached</p>
              <p className="text-xs text-amber-700">You&apos;ve used all {DAILY_LIMIT} previews for today. Resets at midnight.</p>
            </div>
          )}

          {/* Test send */}
          <div className="space-y-1.5">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleTestSend}
              disabled={testSending || testSendsAtLimit}
            >
              <Send className="h-4 w-4" />
              {testSending ? 'Sending…' : 'Send test email'}
            </Button>
          </div>

          {/* Counters */}
          <div className="space-y-3 pt-1 border-t border-surface-border mt-1">
            {/* Preview counter */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-ink-muted">Preview generations</span>
                <span className={`text-xs font-medium ${atLimit ? 'text-red-500' : 'text-ink'}`}>
                  {remaining} / {DAILY_LIMIT} remaining
                </span>
              </div>
              <div className="w-full bg-surface-border rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${atLimit ? 'bg-red-400' : 'bg-brand-purple'}`}
                  style={{ width: `${(remaining / DAILY_LIMIT) * 100}%` }}
                />
              </div>
            </div>
            {/* Test send counter */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-ink-muted">Test emails</span>
                <span className={`text-xs font-medium ${testSendsAtLimit ? 'text-red-500' : 'text-ink'}`}>
                  {testSendsRemaining} / {TEST_SEND_LIMIT} remaining
                </span>
              </div>
              <div className="w-full bg-surface-border rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${testSendsAtLimit ? 'bg-red-400' : 'bg-brand-purple'}`}
                  style={{ width: `${(testSendsRemaining / TEST_SEND_LIMIT) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Module status */}
        {previewData && (
          <div className="rounded-xl border border-surface-border bg-white p-5 space-y-3">
            <p className="text-sm font-semibold text-ink">Modules</p>
            {modules.map((m) => {
              const status = previewData.moduleStatus[m.module_type];
              const def = MODULE_REGISTRY[m.module_type];
              const pts = getModulePoints(m.module_type, m.config ?? {});
              return (
                <div key={m.id} className="flex items-center gap-2.5">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${
                    !m.is_enabled ? 'bg-surface-border' :
                    status === 'error' ? 'bg-red-400' : 'bg-emerald-400'
                  }`} />
                  <span className="text-sm text-ink flex-1 truncate">{def?.label ?? m.module_type}</span>
                  <span className="text-xs text-ink-faint shrink-0">{pts} pt</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Metadata */}
        {previewData && (
          <div className="rounded-xl border border-surface-border bg-white p-5 space-y-1.5">
            <p className="text-xs text-ink-muted">
              Generated at {new Date(previewData.generatedAt).toLocaleTimeString()}
            </p>
            <p className="text-xs text-ink-muted">Tokens used: {previewData.totalTokens.toLocaleString()}</p>
            <p className="text-xs text-ink-muted">Delivery: {sendTime} {timezone}</p>
          </div>
        )}
      </div>

      {/* ── Right: email preview ── */}
      <div className="lg:col-span-3">
        {/* Ungenerated state */}
        {!loading && !previewData && !error && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-surface-border bg-white py-20 text-center">
            <p className="font-medium text-ink">Ready to preview?</p>
            <p className="mt-1 text-sm text-ink-muted">Generating calls the AI and takes 15–30 seconds.</p>
            <Button className="mt-5" onClick={() => generate()} disabled={atLimit}>Generate preview</Button>
            {atLimit && (
              <p className="mt-2 text-xs text-ink-muted">Daily limit reached — resets tomorrow</p>
            )}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="rounded-2xl border border-surface-border overflow-hidden shadow-md">
            <div className="border-b border-surface-border bg-surface-secondary px-4 py-3 space-y-1.5 animate-pulse">
              <div className="h-3 w-48 rounded bg-surface-border" />
              <div className="h-3 w-36 rounded bg-surface-border" />
              <div className="h-3 w-56 rounded bg-surface-border" />
            </div>
            <div className="p-4 space-y-3 animate-pulse">
              {[32, 48, 32, 48, 32].map((h, i) => (
                <div key={i} style={{ height: h }} className="rounded-lg bg-surface-border" />
              ))}
            </div>
            <div className="px-4 pb-4 text-center text-sm text-ink-muted">{loadingMsg}</div>
          </div>
        )}

        {/* Error state */}
        {!loading && error && error !== 'limit_reached' && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-surface-border bg-white py-16 text-center gap-4">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <div>
              <p className="font-medium text-ink">Preview failed</p>
              <p className="mt-1 text-sm text-ink-muted max-w-sm">
                Something went wrong generating your preview. This is usually a temporary issue.
              </p>
            </div>
            <Button variant="outline" onClick={() => generate()} disabled={atLimit}>Try again</Button>
          </div>
        )}

        {/* Rendered email */}
        {!loading && previewData && (
          <div className={`hidden sm:block rounded-2xl border border-surface-border overflow-hidden shadow-md transition-opacity ${rerendering ? 'opacity-60' : 'opacity-100'}`}>
            <div className="border-b border-surface-border bg-surface-secondary px-4 py-3">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-yellow-400" />
                <span className="h-3 w-3 rounded-full bg-green-400" />
              </div>
              <p className="text-xs text-ink-muted">From: Daily Brief &lt;brief@dailybriefmail.com&gt;</p>
              <p className="text-xs text-ink-muted">To: {userEmail}</p>
              <p className="text-xs text-ink-muted">Subject: Your Brief — {today}</p>
            </div>
            <div className="overflow-y-auto max-h-[700px]">
              <div className="mx-auto max-w-[600px]" dangerouslySetInnerHTML={{ __html: previewData.html }} />
            </div>
          </div>
        )}

        {/* Mobile frame */}
        {!loading && previewData && (
          <div className={`sm:hidden rounded-xl border border-surface-border overflow-hidden transition-opacity ${rerendering ? 'opacity-60' : 'opacity-100'}`}>
            <div className="overflow-y-auto max-h-[500px]">
              <div dangerouslySetInnerHTML={{ __html: previewData.html }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
