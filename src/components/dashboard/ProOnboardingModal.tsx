'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowRight, Check } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { TagInput, MultiInput, PillSelect } from '@/components/modules/forms/FormPrimitives';
import type { ModuleRow } from '@/types';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const TOPIC_MODULES = ['news', 'ai_tech', 'reddit', 'podcast', 'local_events'] as const;
type TopicModule = typeof TOPIC_MODULES[number];
type Step = 'welcome' | 'send_time' | TopicModule | 'done';

const AI_TECH_OPTIONS = [
  { value: 'AI Models', label: 'AI Models' },
  { value: 'Startups', label: 'Startups' },
  { value: 'Policy & Regulation', label: 'Policy & Regulation' },
  { value: 'Hardware', label: 'Hardware' },
  { value: 'Open Source', label: 'Open Source' },
  { value: 'Big Tech', label: 'Big Tech' },
  { value: 'Crypto & Web3', label: 'Crypto & Web3' },
  { value: 'Robotics', label: 'Robotics' },
];

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function buildSteps(modules: ModuleRow[]): Step[] {
  const enabledTopics = TOPIC_MODULES.filter((type) =>
    modules.some((m) => m.module_type === type && m.is_enabled)
  );
  return ['welcome', 'send_time', ...enabledTopics, 'done'];
}

function moduleOf(modules: ModuleRow[], type: string): ModuleRow | undefined {
  return modules.find((m) => m.module_type === type && m.is_enabled);
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  modules: ModuleRow[];
  initialSendTime: string; // HH:mm or HH:mm:ss
}

export default function ProOnboardingModal({ open, onClose, modules, initialSendTime }: Props) {
  const steps = buildSteps(modules);
  const [stepIdx, setStepIdx] = useState(0);
  const [saving, setSaving] = useState(false);

  // ── Per-step state ────────────────────────────────────────
  const [sendTime, setSendTime] = useState(initialSendTime.slice(0, 5));

  const newsMod   = moduleOf(modules, 'news');
  const aiMod     = moduleOf(modules, 'ai_tech');
  const redditMod = moduleOf(modules, 'reddit');
  const podcastMod = moduleOf(modules, 'podcast');
  const eventsMod = moduleOf(modules, 'local_events');

  const [newsTopics, setNewsTopics] = useState<string[]>(
    (newsMod?.config?.topics as string[] | undefined) ?? ['technology', 'business']
  );
  const [aiSubtopics, setAiSubtopics] = useState<string[]>(
    (aiMod?.config?.subtopics as string[] | undefined) ?? ['AI Models', 'Startups']
  );
  const [redditSubs, setRedditSubs] = useState<string[]>(
    (redditMod?.config?.subreddits as string[] | undefined) ?? ['todayilearned']
  );
  const [podcastInterests, setPodcastInterests] = useState<string[]>(
    (podcastMod?.config?.interests as string[] | undefined) ?? ['technology']
  );
  const [eventsCity, setEventsCity] = useState<string>(
    (eventsMod?.config?.city as string | undefined) ?? ''
  );

  // ── Navigation ────────────────────────────────────────────
  const currentStep = steps[stepIdx];
  const configSteps = steps.slice(1, -1); // send_time + topic steps, for progress
  const configIdx   = stepIdx - 1;        // index within configSteps

  function advance() {
    if (stepIdx < steps.length - 1) setStepIdx((i) => i + 1);
    else onClose();
  }

  async function saveAndAdvance() {
    setSaving(true);
    try {
      if (currentStep === 'send_time') {
        const res = await fetch('/api/user/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ send_time: sendTime }),
        });
        if (!res.ok) toast.error('Could not save send time. You can update it in Settings.');
      } else if (currentStep === 'news' && newsMod) {
        const res = await fetch(`/api/modules/${newsMod.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config: { ...newsMod.config, topics: newsTopics } }),
        });
        if (!res.ok) toast.error('Could not save news topics. You can update them in the module settings.');
      } else if (currentStep === 'ai_tech' && aiMod) {
        const res = await fetch(`/api/modules/${aiMod.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config: { ...aiMod.config, subtopics: aiSubtopics } }),
        });
        if (!res.ok) toast.error('Could not save AI & Tech subtopics.');
      } else if (currentStep === 'reddit' && redditMod) {
        const res = await fetch(`/api/modules/${redditMod.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config: { ...redditMod.config, subreddits: redditSubs.filter(Boolean) } }),
        });
        if (!res.ok) toast.error('Could not save subreddits.');
      } else if (currentStep === 'podcast' && podcastMod) {
        const res = await fetch(`/api/modules/${podcastMod.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config: { ...podcastMod.config, interests: podcastInterests } }),
        });
        if (!res.ok) toast.error('Could not save podcast interests.');
      } else if (currentStep === 'local_events' && eventsMod) {
        const res = await fetch(`/api/modules/${eventsMod.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config: { ...eventsMod.config, city: eventsCity } }),
        });
        if (!res.ok) toast.error('Could not save city.');
      }
    } catch {
      toast.error('Something went wrong. You can update this in your settings.');
    } finally {
      setSaving(false);
    }
    advance();
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        {/* Progress bar — shown on config steps only */}
        {currentStep !== 'welcome' && currentStep !== 'done' && (
          <div className="flex items-center justify-between px-6 pt-5">
            <span className="text-xs text-ink-muted">
              Step {configIdx + 1} of {configSteps.length}
            </span>
            <div className="flex gap-1.5">
              {configSteps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i <= configIdx ? 'w-5 bg-brand-purple' : 'w-1.5 bg-surface-border'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        <div className="px-6 py-6 space-y-6">

          {/* ── Welcome ────────────────────────────────── */}
          {currentStep === 'welcome' && (
            <div className="space-y-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-purple-light text-2xl select-none">
                🎉
              </div>
              <div>
                <h2 className="text-xl font-semibold text-ink">Welcome to Brief Pro</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Let&rsquo;s personalize your daily brief. Takes about 2 minutes.
                </p>
              </div>
              <ul className="space-y-2.5">
                {[
                  ['⏰', 'Custom send time, delivered when it suits you'],
                  ['📰', 'Personalized topics, pick exactly what you want to read'],
                  ['✨', '12 module credits to build the brief that fits your life'],
                ].map(([emoji, text]) => (
                  <li key={text as string} className="flex items-start gap-3 text-sm text-ink">
                    <span className="shrink-0">{emoji}</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
              <Button className="w-full" onClick={advance}>
                Get started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <button
                type="button"
                onClick={onClose}
                className="w-full text-center text-xs text-ink-muted hover:text-ink transition-colors"
              >
                Skip for now
              </button>
            </div>
          )}

          {/* ── Send time ──────────────────────────────── */}
          {currentStep === 'send_time' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-ink">⏰ When should we send it?</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Pick the time that fits your morning routine.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="onboarding-send-time">Send time</Label>
                <input
                  id="onboarding-send-time"
                  type="time"
                  value={sendTime}
                  onChange={(e) => setSendTime(e.target.value)}
                  className="flex h-9 w-36 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <p className="text-xs text-ink-muted">In your configured timezone.</p>
              </div>
              <ActionRow onSave={saveAndAdvance} onSkip={advance} saving={saving} />
            </div>
          )}

          {/* ── News ───────────────────────────────────── */}
          {currentStep === 'news' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-ink">📰 News topics</h2>
                <p className="mt-1 text-sm text-ink-muted">What topics should your news brief cover?</p>
              </div>
              <TagInput
                label="Topics"
                values={newsTopics}
                onChange={setNewsTopics}
                placeholder="Type a topic and press Enter…"
                max={5}
              />
              <ActionRow onSave={saveAndAdvance} onSkip={advance} saving={saving} />
            </div>
          )}

          {/* ── AI & Tech ──────────────────────────────── */}
          {currentStep === 'ai_tech' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-ink">🤖 AI &amp; Tech</h2>
                <p className="mt-1 text-sm text-ink-muted">Which subtopics interest you most? Pick up to 4.</p>
              </div>
              <PillSelect
                value={aiSubtopics}
                onChange={(v) => setAiSubtopics(v as string[])}
                options={AI_TECH_OPTIONS}
                multi
                maxSelect={4}
              />
              <ActionRow onSave={saveAndAdvance} onSkip={advance} saving={saving} />
            </div>
          )}

          {/* ── Reddit ─────────────────────────────────── */}
          {currentStep === 'reddit' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-ink">🟠 Reddit</h2>
                <p className="mt-1 text-sm text-ink-muted">Which subreddits should we pull posts from?</p>
              </div>
              <MultiInput
                label="Subreddits"
                values={redditSubs.length === 0 ? [''] : redditSubs}
                onChange={setRedditSubs}
                placeholder="e.g. MachineLearning"
                max={5}
              />
              <p className="text-xs text-ink-faint -mt-3">Enter names without the r/ prefix.</p>
              <ActionRow onSave={saveAndAdvance} onSkip={advance} saving={saving} />
            </div>
          )}

          {/* ── Podcast ────────────────────────────────── */}
          {currentStep === 'podcast' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-ink">🎙️ Podcast</h2>
                <p className="mt-1 text-sm text-ink-muted">What podcast topics should we look for?</p>
              </div>
              <TagInput
                label="Interests"
                values={podcastInterests}
                onChange={setPodcastInterests}
                placeholder="Type an interest and press Enter…"
                max={4}
              />
              <ActionRow onSave={saveAndAdvance} onSkip={advance} saving={saving} />
            </div>
          )}

          {/* ── Local Events ───────────────────────────── */}
          {currentStep === 'local_events' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-ink">📍 Local Events</h2>
                <p className="mt-1 text-sm text-ink-muted">What city should we find events in?</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="onboarding-city">City</Label>
                <Input
                  id="onboarding-city"
                  value={eventsCity}
                  onChange={(e) => setEventsCity(e.target.value)}
                  placeholder="e.g. San Francisco, Nashville, London"
                />
              </div>
              <ActionRow onSave={saveAndAdvance} onSkip={advance} saving={saving} />
            </div>
          )}

          {/* ── Done ───────────────────────────────────── */}
          {currentStep === 'done' && (
            <div className="space-y-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-ink">You&rsquo;re all set!</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Your preferences are saved. Your next brief will be personalized to your choices.
                </p>
              </div>
              <Button className="w-full" onClick={onClose}>
                Go to dashboard
              </Button>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// Shared action row
// ─────────────────────────────────────────────────────────────

function ActionRow({
  onSave, onSkip, saving,
}: { onSave: () => void; onSkip: () => void; saving: boolean }) {
  return (
    <div className="flex gap-3">
      <Button className="flex-1" onClick={onSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save & continue'}
      </Button>
      <Button variant="ghost" onClick={onSkip} disabled={saving}>
        Skip
      </Button>
    </div>
  );
}
