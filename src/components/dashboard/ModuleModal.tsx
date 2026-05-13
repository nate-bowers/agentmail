'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Cloud, Newspaper, Quote, TrendingUp,
  Trophy, BookOpen, Dumbbell, Brain, Calendar, ArrowLeftRight, Headphones, Lightbulb,
  ChefHat, BookMarked, MessageSquare, Stars, Languages, Heart, Cpu, MapPin, Landmark, Zap,
  HelpCircle, ChevronLeft, Loader2, type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { MODULE_REGISTRY, MODULE_DISPLAY_ORDER, POPULAR_MODULE_TYPES, NEW_MODULE_TYPES } from '@/lib/modules';
import { getModulePoints } from '@/lib/modules/points';
import { WeatherForm } from '@/components/modules/forms/WeatherForm';
import { NewsForm } from '@/components/modules/forms/NewsForm';
import { QuoteForm } from '@/components/modules/forms/QuoteForm';
import { MarketsForm } from '@/components/modules/forms/MarketsForm';
import { SportsForm } from '@/components/modules/forms/SportsForm';
import { WordOfDayForm } from '@/components/modules/forms/WordOfDayForm';
import { WorkoutForm } from '@/components/modules/forms/WorkoutForm';
import { MindfulnessForm } from '@/components/modules/forms/MindfulnessForm';
import { OnThisDayForm } from '@/components/modules/forms/OnThisDayForm';
import { CurrencyForm } from '@/components/modules/forms/CurrencyForm';
import { PodcastForm } from '@/components/modules/forms/PodcastForm';
import { FactForm } from '@/components/modules/forms/FactForm';
import { RecipeForm } from '@/components/modules/forms/RecipeForm';
import { BookForm } from '@/components/modules/forms/BookForm';
import { RedditForm } from '@/components/modules/forms/RedditForm';
import { HoroscopeForm } from '@/components/modules/forms/HoroscopeForm';
import { LanguageForm } from '@/components/modules/forms/LanguageForm';
import { AffirmationForm } from '@/components/modules/forms/AffirmationForm';
import { AiTechForm } from '@/components/modules/forms/AiTechForm';
import { LocalEventsForm } from '@/components/modules/forms/LocalEventsForm';
import { WeekHistoryForm } from '@/components/modules/forms/WeekHistoryForm';
import { ChallengeForm } from '@/components/modules/forms/ChallengeForm';
import type { ModuleRow } from '@/types';

const ICON_MAP: Record<string, LucideIcon> = {
  Cloud, Newspaper, Quote, TrendingUp,
  Trophy, BookOpen, Dumbbell, Brain, Calendar, ArrowLeftRight, Headphones, Lightbulb,
  ChefHat, BookMarked, MessageSquare, Stars, Languages, Heart, Cpu, MapPin, Landmark, Zap,
};

interface ModuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'add' | 'edit';
  existingModule?: Pick<ModuleRow, 'id' | 'module_type' | 'config'>;
  initialModuleType?: string | null;
  remainingPoints: number;
  onSuccess: () => Promise<void>;
}

export default function ModuleModal({
  open, onOpenChange, mode, existingModule, initialModuleType,
  remainingPoints, onSuccess,
}: ModuleModalProps) {
  const isEditing = mode === 'edit';

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<string | undefined>(undefined);
  const [formKey, setFormKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [pointsError, setPointsError] = useState<string | null>(null);

  // Reset state every time the modal opens — fixes stale closure bugs
  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && existingModule) {
      setSelectedType(existingModule.module_type);
      setStep(2);
      setFormKey((prev) => prev + 1);
    } else if (mode === 'add' && initialModuleType) {
      setSelectedType(initialModuleType);
      setStep(2);
      setFormKey((prev) => prev + 1);
    } else {
      setSelectedType(undefined);
      setStep(1);
      setFormKey((prev) => prev + 1);
    }
    setPointsError(null);
    setIsLoading(false);
  }, [open, mode, existingModule?.id, initialModuleType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stable defaultValues — never computed inline in JSX
  const defaultValues = useMemo(() => {
    if (mode === 'edit' && existingModule?.config) {
      return existingModule.config;
    }
    return (MODULE_REGISTRY[selectedType ?? '']?.defaultConfig as Record<string, unknown>) ?? {};
  }, [mode, existingModule?.id, selectedType]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleFormSubmit(config: Record<string, unknown>) {
    if (!selectedType) return;

    if (!isEditing) {
      const cost = getModulePoints(selectedType, config);
      if (cost > remainingPoints) {
        setPointsError(
          `This module costs ${cost} credit${cost !== 1 ? 's' : ''} but you only have ${remainingPoints} left.`
        );
        return;
      }
    }

    setPointsError(null);
    setIsLoading(true);

    try {
      const res = isEditing
        ? await fetch(`/api/modules/${existingModule!.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ config }),
          })
        : await fetch('/api/modules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ module_type: selectedType, config }),
          });

      if (res.status === 403 && !isEditing) {
        const body = await res.json();
        if (body.error === 'points_exceeded') {
          setPointsError(
            `You've used all ${body.pointsLimit ?? remainingPoints} credits. Upgrade to Pro for more.`
          );
          setIsLoading(false);
          return;
        }
      }

      if (!res.ok) {
        const body = await res.json();
        throw new Error(typeof body.error === 'string' ? body.error : 'Save failed');
      }

      toast.success(isEditing ? 'Module updated.' : 'Module added.');
      onOpenChange(false);
      await onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  }

  const selectedDef = selectedType ? MODULE_REGISTRY[selectedType] : null;
  const selectedPts = selectedType ? getModulePoints(selectedType, defaultValues) : 0;
  const SelectedIcon = selectedDef ? (ICON_MAP[selectedDef.icon] ?? HelpCircle) : null;

  const orderedModules = MODULE_DISPLAY_ORDER
    .map((type) => MODULE_REGISTRY[type])
    .filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose={step === 1 && !isEditing}
        className="max-w-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* ── STEP 1: Type picker ── */}
        {step === 1 && (
          <>
            <div className="px-6 pt-6 pb-4 border-b border-surface-border">
              <DialogHeader>
                <DialogTitle>What would you like to add?</DialogTitle>
                <DialogDescription className="mt-1">
                  Choose a module type to add to your daily brief.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {orderedModules.map((def) => {
                  const Icon = ICON_MAP[def.icon] ?? HelpCircle;
                  const isPopular = POPULAR_MODULE_TYPES.has(def.type);
                  const isNew = NEW_MODULE_TYPES.has(def.type);
                  const pts = getModulePoints(def.type, def.defaultConfig as Record<string, unknown>);
                  const canAfford = pts <= remainingPoints;

                  return (
                    <button
                      key={def.type}
                      onClick={() => {
                        if (!canAfford) {
                          toast('Not enough credits', {
                            description: `This module costs ${pts} credit${pts !== 1 ? 's' : ''}.`,
                            action: { label: 'Upgrade', onClick: () => { window.location.href = '/dashboard/upgrade'; } },
                          });
                          return;
                        }
                        setSelectedType(def.type);
                        setFormKey((prev) => prev + 1);
                        setStep(2);
                      }}
                      className={`relative flex flex-col gap-2 rounded-xl border p-4 text-left h-full transition-all duration-150 ${
                        canAfford
                          ? 'border-surface-border bg-white hover:border-brand-purple hover:bg-brand-purple-light cursor-pointer'
                          : 'border-surface-border bg-surface-secondary opacity-50 cursor-not-allowed'
                      }`}
                    >
                      {/* Badge top-right */}
                      {!canAfford && (
                        <span className="absolute right-2 top-2 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
                          Needs {pts} pt
                        </span>
                      )}
                      {canAfford && isPopular && (
                        <span className="absolute right-2 top-2 rounded-full bg-brand-purple-light px-1.5 py-0.5 text-[10px] font-medium text-brand-purple border border-brand-purple/20">
                          Popular
                        </span>
                      )}
                      {canAfford && isNew && !isPopular && (
                        <span className="absolute right-2 top-2 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                          New
                        </span>
                      )}

                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-purple-light">
                        <Icon className="h-4 w-4 text-brand-purple" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink pr-8">{def.label}</p>
                        <p className="text-xs text-ink-muted leading-snug mt-0.5 pr-2">{def.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-surface-border">
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-sm">
                Cancel
              </Button>
            </div>
          </>
        )}

        {/* ── STEP 2: Config form ── */}
        {step === 2 && selectedDef && (
          <>
            <div className="px-6 pt-6 pb-4 border-b border-surface-border flex items-center gap-3">
              {!isEditing && (
                <button
                  onClick={() => { setStep(1); setSelectedType(undefined); }}
                  className="flex items-center gap-1 text-sm text-ink-muted hover:text-ink transition-colors mr-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
              )}
              <DialogHeader className="flex-1">
                <DialogTitle>
                  {isEditing ? `Edit ${selectedDef.label}` : `Configure ${selectedDef.label}`}
                </DialogTitle>
                <DialogDescription className="mt-0.5">
                  {selectedDef.description}
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {selectedType === 'weather' && <WeatherForm key={formKey} defaultValues={defaultValues} onSubmit={handleFormSubmit} />}
              {selectedType === 'news' && <NewsForm key={formKey} defaultValues={defaultValues} onSubmit={handleFormSubmit} />}
              {selectedType === 'quote' && <QuoteForm key={formKey} defaultValues={defaultValues} onSubmit={handleFormSubmit} />}
              {selectedType === 'markets' && <MarketsForm key={formKey} defaultValues={defaultValues} onSubmit={handleFormSubmit} />}
              {selectedType === 'sports' && <SportsForm key={formKey} defaultValues={defaultValues} onSubmit={handleFormSubmit} />}
              {selectedType === 'word_of_day' && <WordOfDayForm key={formKey} defaultValues={defaultValues} onSubmit={handleFormSubmit} />}
              {selectedType === 'workout' && <WorkoutForm key={formKey} defaultValues={defaultValues} onSubmit={handleFormSubmit} />}
              {selectedType === 'mindfulness' && <MindfulnessForm key={formKey} defaultValues={defaultValues} onSubmit={handleFormSubmit} />}
              {selectedType === 'on_this_day' && <OnThisDayForm key={formKey} defaultValues={defaultValues} onSubmit={handleFormSubmit} />}
              {selectedType === 'currency' && <CurrencyForm key={formKey} defaultValues={defaultValues} onSubmit={handleFormSubmit} />}
              {selectedType === 'podcast' && <PodcastForm key={formKey} defaultValues={defaultValues} onSubmit={handleFormSubmit} />}
              {selectedType === 'fact' && <FactForm key={formKey} defaultValues={defaultValues} onSubmit={handleFormSubmit} />}
              {selectedType === 'recipe' && <RecipeForm key={formKey} defaultValues={defaultValues} onSubmit={handleFormSubmit} />}
              {selectedType === 'book' && <BookForm key={formKey} defaultValues={defaultValues} onSubmit={handleFormSubmit} />}
              {selectedType === 'reddit' && <RedditForm key={formKey} defaultValues={defaultValues} onSubmit={handleFormSubmit} />}
              {selectedType === 'horoscope' && <HoroscopeForm key={formKey} defaultValues={defaultValues} onSubmit={handleFormSubmit} />}
              {selectedType === 'language' && <LanguageForm key={formKey} defaultValues={defaultValues} onSubmit={handleFormSubmit} />}
              {selectedType === 'affirmation' && <AffirmationForm key={formKey} defaultValues={defaultValues} onSubmit={handleFormSubmit} />}
              {selectedType === 'ai_tech' && <AiTechForm key={formKey} defaultValues={defaultValues} onSubmit={handleFormSubmit} />}
              {selectedType === 'local_events' && <LocalEventsForm key={formKey} defaultValues={defaultValues} onSubmit={handleFormSubmit} />}
              {selectedType === 'week_history' && <WeekHistoryForm key={formKey} defaultValues={defaultValues} onSubmit={handleFormSubmit} />}
              {selectedType === 'challenge' && <ChallengeForm key={formKey} defaultValues={defaultValues} onSubmit={handleFormSubmit} />}
            </div>

            <div className="border-t border-surface-border px-6 py-4">
              {pointsError && (
                <p className="mb-3 text-sm text-red-500">{pointsError}</p>
              )}
              <DialogFooter>
                {/* Left: point cost pill */}
                <div className="flex items-center gap-1.5">
                  {SelectedIcon && <SelectedIcon className="h-3.5 w-3.5 text-brand-purple" />}
                  <span className="text-xs text-ink-muted">
                    {selectedPts} {selectedPts === 1 ? 'pt' : 'pts'}
                  </span>
                </div>
                {/* Right: action buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => onOpenChange(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    form="config-form"
                    type="submit"
                    disabled={isLoading}
                  >
                    {isLoading
                      ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
                      : isEditing ? 'Save changes' : 'Add to brief'}
                  </Button>
                </div>
              </DialogFooter>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
