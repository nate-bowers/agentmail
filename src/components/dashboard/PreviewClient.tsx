'use client';

import { useState, useRef } from 'react';
import { AlertCircle, RefreshCw, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { EMAIL_THEMES } from '@/lib/email/themes';
import { MODULE_REGISTRY } from '@/lib/modules';
import { getModulePoints } from '@/lib/modules/points';
import type { ModuleRow } from '@/types';

const LOADING_MESSAGES = [
  'Checking today\'s weather...',
  'Scanning the news...',
  'Finding your quote...',
  'Assembling your brief...',
  'Almost ready...',
];

const THEME_LIST = [
  { id: 'light', bg: '#f9fafb', accent: '#7c3aed' },
  { id: 'dark', bg: '#0f0f0f', accent: '#a78bfa' },
  { id: 'pink', bg: '#fdf2f8', accent: '#db2777' },
  { id: 'succinct', bg: '#f9fafb', accent: '#7c3aed' },
  { id: 'wordy', bg: '#f9fafb', accent: '#7c3aed' },
];

interface PreviewData {
  html: string;
  totalTokens: number;
  generatedAt: string;
  moduleStatus: Record<string, 'success' | 'error'>;
  modulesIncluded: string[];
}

interface PreviewClientProps {
  modules: ModuleRow[];
  initialTheme: string;
  userEmail: string;
  sendTime: string;
  timezone: string;
}

export default function PreviewClient({
  modules,
  initialTheme,
  userEmail,
  sendTime,
  timezone,
}: PreviewClientProps) {
  const [theme, setTheme] = useState(initialTheme);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [testSending, setTestSending] = useState(false);
  const msgIntervalRef = useRef<NodeJS.Timeout | null>(null);

  async function generate(themeOverride?: string) {
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
      const res = await fetch('/api/email/preview-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: themeOverride ?? theme }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');
      setPreviewData(data as PreviewData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      if (msgIntervalRef.current) clearInterval(msgIntervalRef.current);
      setLoading(false);
    }
  }

  async function handleTestSend() {
    setTestSending(true);
    try {
      const res = await fetch('/api/email/test-send', { method: 'POST' });
      const data = await res.json();
      if (res.status === 429) {
        toast.error('You\'ve reached the 3 test sends per day limit.');
        return;
      }
      if (!res.ok) throw new Error(data.error ?? 'Send failed');
      toast.success(`Test email sent! ${data.remaining ?? 0} sends remaining today.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send test email');
    } finally {
      setTestSending(false);
    }
  }

  function handleThemeChange(newTheme: string) {
    setTheme(newTheme);
    if (previewData) {
      generate(newTheme);
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
        <div className="rounded-xl border border-surface-border bg-white p-5 space-y-4">
          <p className="font-semibold text-ink">Preview</p>

          {/* Theme selector */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-ink-muted">Email theme</p>
            <div className="flex gap-2">
              {THEME_LIST.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  title={EMAIL_THEMES[t.id]?.name ?? t.id}
                  onClick={() => handleThemeChange(t.id)}
                  className={`h-7 w-7 rounded-full border-2 transition-all ${
                    theme === t.id ? 'border-brand-purple scale-110' : 'border-transparent hover:border-surface-border'
                  }`}
                  style={{ backgroundColor: t.bg, boxShadow: `inset 0 0 0 2px ${t.accent}` }}
                />
              ))}
            </div>
            <p className="text-xs text-ink-muted capitalize">{EMAIL_THEMES[theme]?.name ?? theme}</p>
          </div>

          {/* Generate */}
          {!previewData && !loading && !error && (
            <Button onClick={() => generate()} className="w-full" disabled={loading}>
              Generate preview
            </Button>
          )}

          {/* Regenerate */}
          {(previewData || error) && (
            <Button
              variant="ghost"
              onClick={() => generate()}
              disabled={loading}
              className="w-full gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Regenerate preview
            </Button>
          )}

          {/* Test send */}
          <div className="space-y-1">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleTestSend}
              disabled={testSending}
            >
              <Send className="h-4 w-4" />
              {testSending ? 'Sending…' : 'Send test email'}
            </Button>
            <p className="text-xs text-ink-muted text-center">3 test sends per day</p>
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
            <Button className="mt-5" onClick={() => generate()}>Generate preview</Button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="rounded-2xl border border-surface-border overflow-hidden shadow-md">
            {/* Mock email header */}
            <div className="border-b border-surface-border bg-surface-secondary px-4 py-3 space-y-1.5 animate-pulse">
              <div className="h-3 w-48 rounded bg-surface-border" />
              <div className="h-3 w-36 rounded bg-surface-border" />
              <div className="h-3 w-56 rounded bg-surface-border" />
            </div>
            {/* Skeleton body */}
            <div className="p-6 space-y-6 animate-pulse">
              {[120, 80, 160, 100, 140].map((h, i) => (
                <div key={i} style={{ height: h }} className="rounded-lg bg-surface-border" />
              ))}
            </div>
            <div className="px-6 pb-6 text-center text-sm text-ink-muted">{loadingMsg}</div>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-surface-border bg-white py-16 text-center gap-4">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <div>
              <p className="font-medium text-ink">Preview failed</p>
              <p className="mt-1 text-sm text-ink-muted max-w-sm">
                Something went wrong generating your preview. This is usually a temporary issue.
              </p>
            </div>
            <Button variant="outline" onClick={() => generate()}>Try again</Button>
          </div>
        )}

        {/* Rendered email */}
        {!loading && previewData && (
          <div className="hidden sm:block rounded-2xl border border-surface-border overflow-hidden shadow-md">
            {/* Mock email client header */}
            <div className="border-b border-surface-border bg-surface-secondary px-4 py-3">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-yellow-400" />
                <span className="h-3 w-3 rounded-full bg-green-400" />
              </div>
              <p className="text-xs text-ink-muted">From: Daily Brief &lt;noreply@dailybriefmail.com&gt;</p>
              <p className="text-xs text-ink-muted">To: {userEmail}</p>
              <p className="text-xs text-ink-muted">Subject: Your Brief — {today}</p>
            </div>
            {/* Email body */}
            <div className="overflow-y-auto max-h-[700px]">
              <div className="mx-auto max-w-[600px]" dangerouslySetInnerHTML={{ __html: previewData.html }} />
            </div>
          </div>
        )}

        {/* Mobile: simpler frame */}
        {!loading && previewData && (
          <div className="sm:hidden rounded-xl border border-surface-border overflow-hidden">
            <div className="overflow-y-auto max-h-[500px]">
              <div dangerouslySetInnerHTML={{ __html: previewData.html }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
