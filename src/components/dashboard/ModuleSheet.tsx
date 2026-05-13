'use client';

import { useState } from 'react';
import {
  Cloud, Newspaper, Quote, TrendingUp,
  Trophy, BookOpen, Dumbbell, Brain, Calendar, ArrowLeftRight, Headphones, Lightbulb,
  HelpCircle, Check, type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose,
} from '@/components/ui/sheet';
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
import type { ModuleRow } from '@/types';

const ICON_MAP: Record<string, LucideIcon> = {
  Cloud, Newspaper, Quote, TrendingUp,
  Trophy, BookOpen, Dumbbell, Brain, Calendar, ArrowLeftRight, Headphones, Lightbulb,
};

interface ModuleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'add' | 'edit';
  existingModule?: Pick<ModuleRow, 'id' | 'module_type' | 'config'>;
  initialModuleType?: string | null;
  remainingPoints: number;
  isPro: boolean;
  onSuccess: () => void;
}

export default function ModuleSheet({
  open, onOpenChange, mode, existingModule, initialModuleType,
  remainingPoints, onSuccess,
}: ModuleSheetProps) {
  const isEditing = mode === 'edit';
  const [selectedType, setSelectedType] = useState<string | null>(
    existingModule?.module_type ?? initialModuleType ?? null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [pointsError, setPointsError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setSelectedType(existingModule?.module_type ?? initialModuleType ?? null);
      setPointsError(null);
    }
    onOpenChange(next);
  }

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
      onSuccess();
      handleOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  }

  const selectedDef = selectedType ? MODULE_REGISTRY[selectedType] : null;
  const showPicker = !isEditing && !initialModuleType;

  const orderedModules = MODULE_DISPLAY_ORDER
    .map((type) => MODULE_REGISTRY[type])
    .filter(Boolean);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex flex-col overflow-hidden">
        <SheetHeader>
          <SheetTitle>{isEditing ? `Edit ${selectedDef?.label ?? ''}` : 'Add a module'}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Type picker */}
          {showPicker && (
            <div className="grid grid-cols-2 gap-3">
              {orderedModules.map((def) => {
                const Icon = ICON_MAP[def.icon] ?? HelpCircle;
                const isSelected = selectedType === def.type;
                const isPopular = POPULAR_MODULE_TYPES.has(def.type);
                const isNew = NEW_MODULE_TYPES.has(def.type);
                const pts = getModulePoints(def.type, def.defaultConfig as Record<string, unknown>);
                const canAfford = pts <= remainingPoints;

                return (
                  <button
                    key={def.type}
                    onClick={() => {
                      setSelectedType(def.type);
                      setPointsError(null);
                    }}
                    className={`relative flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors ${
                      isSelected
                        ? 'border-brand-purple bg-brand-purple-light'
                        : 'border-surface-border bg-white hover:border-brand-purple hover:bg-brand-purple-light'
                    }`}
                  >
                    {/* Affordability or Popular/New badge */}
                    {!isSelected && !canAfford && (
                      <span className="absolute right-2 top-2 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
                        Needs {pts} pt
                      </span>
                    )}
                    {!isSelected && canAfford && isPopular && (
                      <span className="absolute right-2 top-2 rounded-full bg-brand-purple-light px-1.5 py-0.5 text-[10px] font-medium text-brand-purple border border-brand-purple/20">
                        Popular
                      </span>
                    )}
                    {!isSelected && canAfford && isNew && !isPopular && (
                      <span className="absolute right-2 top-2 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                        New
                      </span>
                    )}
                    {isSelected && (
                      <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-brand-purple">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </span>
                    )}

                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-purple-light">
                      <Icon className="h-4 w-4 text-brand-purple" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink pr-8">{def.label}</p>
                      <p className="text-xs text-ink-muted leading-snug mt-0.5 pr-4">{def.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Config form */}
          {selectedType && selectedDef && (
            <div className="space-y-4">
              {showPicker && selectedType && <div className="h-px bg-surface-border" />}

              {/* Pre-selected type header */}
              {initialModuleType && !isEditing && (
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-purple-light">
                    {(() => { const Icon = ICON_MAP[selectedDef.icon] ?? HelpCircle; return <Icon className="h-4 w-4 text-brand-purple" />; })()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">{selectedDef.label}</p>
                    <p className="text-xs text-ink-muted">{selectedDef.description}</p>
                  </div>
                </div>
              )}

              {selectedType === 'weather' && <WeatherForm defaultValues={existingModule?.config ?? selectedDef.defaultConfig as Record<string, unknown>} onSubmit={handleFormSubmit} />}
              {selectedType === 'news' && <NewsForm defaultValues={existingModule?.config ?? selectedDef.defaultConfig as Record<string, unknown>} onSubmit={handleFormSubmit} />}
              {selectedType === 'quote' && <QuoteForm defaultValues={existingModule?.config ?? selectedDef.defaultConfig as Record<string, unknown>} onSubmit={handleFormSubmit} />}
              {selectedType === 'markets' && <MarketsForm defaultValues={existingModule?.config ?? selectedDef.defaultConfig as Record<string, unknown>} onSubmit={handleFormSubmit} />}
              {selectedType === 'sports' && <SportsForm defaultValues={existingModule?.config ?? selectedDef.defaultConfig as Record<string, unknown>} onSubmit={handleFormSubmit} />}
              {selectedType === 'word_of_day' && <WordOfDayForm defaultValues={existingModule?.config ?? selectedDef.defaultConfig as Record<string, unknown>} onSubmit={handleFormSubmit} />}
              {selectedType === 'workout' && <WorkoutForm defaultValues={existingModule?.config ?? selectedDef.defaultConfig as Record<string, unknown>} onSubmit={handleFormSubmit} />}
              {selectedType === 'mindfulness' && <MindfulnessForm defaultValues={existingModule?.config ?? selectedDef.defaultConfig as Record<string, unknown>} onSubmit={handleFormSubmit} />}
              {selectedType === 'on_this_day' && <OnThisDayForm defaultValues={existingModule?.config ?? selectedDef.defaultConfig as Record<string, unknown>} onSubmit={handleFormSubmit} />}
              {selectedType === 'currency' && <CurrencyForm defaultValues={existingModule?.config ?? selectedDef.defaultConfig as Record<string, unknown>} onSubmit={handleFormSubmit} />}
              {selectedType === 'podcast' && <PodcastForm defaultValues={existingModule?.config ?? selectedDef.defaultConfig as Record<string, unknown>} onSubmit={handleFormSubmit} />}
              {selectedType === 'fact' && <FactForm defaultValues={existingModule?.config ?? selectedDef.defaultConfig as Record<string, unknown>} onSubmit={handleFormSubmit} />}
            </div>
          )}
        </div>

        <SheetFooter className="flex-col gap-2">
          {pointsError && (
            <p className="w-full text-sm text-red-500">{pointsError}</p>
          )}
          <div className="flex w-full gap-2">
            <SheetClose asChild>
              <Button variant="ghost" className="flex-1">Cancel</Button>
            </SheetClose>
            <Button
              form="config-form"
              type="submit"
              disabled={!selectedType || isLoading}
              className="flex-1"
            >
              {isLoading ? 'Saving…' : isEditing ? 'Save changes' : 'Add module'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
