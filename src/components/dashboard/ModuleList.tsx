'use client';

import { useState } from 'react';
import {
  Plus, Inbox, Pencil, Trash2, Lock, GripVertical, Loader2, HelpCircle,
  Cloud, Newspaper, Quote, TrendingUp,
  Trophy, BookOpen, Dumbbell, Brain, Calendar, ArrowLeftRight, Headphones, Lightbulb,
  ChefHat, BookMarked, MessageSquare, Stars, Languages, Heart, Cpu, MapPin, Landmark, Zap,
  MinusCircle, LayoutGrid,
  type LucideIcon,
} from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  arrayMove, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import ModuleModal from './ModuleModal';
import PointsBar from './PointsBar';
import ReorderHint from './ReorderHint';
import { Toggle } from '@/components/ui/toggle';
import { MODULE_REGISTRY } from '@/lib/modules';
import { getModulePoints } from '@/lib/modules/points';
import { usePoints } from '@/hooks/usePoints';
import { usePlan } from '@/hooks/usePlan';
import { getModuleRecommendations } from '@/lib/dashboard/recommendations';
import type { ModuleRow } from '@/types';

const ICON_MAP: Record<string, LucideIcon> = {
  Cloud, Newspaper, Quote, TrendingUp,
  Trophy, BookOpen, Dumbbell, Brain, Calendar, ArrowLeftRight, Headphones, Lightbulb,
  ChefHat, BookMarked, MessageSquare, Stars, Languages, Heart, Cpu, MapPin, Landmark, Zap,
};

// Zero-config modules: can be added immediately with defaults, no sheet needed
const ZERO_CONFIG_TYPES = new Set([
  'fact', 'on_this_day', 'word_of_day', 'mindfulness', 'quote',
  'challenge', 'affirmation', 'workout',
]);

function configSummary(moduleType: string, config: Record<string, unknown>): string {
  if (moduleType === 'weather') {
    const locs = config.locations as Array<string | { input?: string; display_name?: string }> | undefined;
    if (!locs?.length) return '';
    return locs.map((l) => (typeof l === 'string' ? l : (l.display_name ?? l.input ?? ''))).join(' · ');
  }
  if (moduleType === 'news') {
    const topics = config.topics as string[] | undefined;
    return topics?.slice(0, 3).join(', ') ?? '';
  }
  if (moduleType === 'quote') {
    const style = config.style as string | undefined;
    return style ? style.charAt(0).toUpperCase() + style.slice(1) : '';
  }
  if (moduleType === 'markets') {
    const symbols = config.symbols as string[] | undefined;
    return symbols?.join(', ') ?? '';
  }
  if (moduleType === 'sports') {
    const teams = config.teams as string[] | undefined;
    return teams?.slice(0, 3).join(', ') ?? '';
  }
  if (moduleType === 'word_of_day') {
    const diff = config.difficulty as string | undefined;
    return diff ? diff.charAt(0).toUpperCase() + diff.slice(1) : '';
  }
  if (moduleType === 'workout') {
    const level = config.fitnessLevel as string | undefined;
    const focus = config.focus as string | undefined;
    return [level, focus].filter(Boolean).join(' · ');
  }
  if (moduleType === 'mindfulness') {
    const style = config.style as string | undefined;
    return style ? style.charAt(0).toUpperCase() + style.slice(1) : '';
  }
  if (moduleType === 'on_this_day') {
    const cat = config.category as string | undefined;
    return cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : '';
  }
  if (moduleType === 'currency') {
    const base = config.baseCurrency as string | undefined;
    const targets = config.targetCurrencies as string[] | undefined;
    return base && targets ? `${base} → ${targets.join(', ')}` : '';
  }
  if (moduleType === 'podcast') {
    const interests = config.interests as string[] | undefined;
    return interests?.slice(0, 3).join(', ') ?? '';
  }
  if (moduleType === 'fact') {
    const cat = config.category as string | undefined;
    return cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : '';
  }
  if (moduleType === 'local_events') {
    const city = config.city as string | { display_name?: string; input?: string } | undefined;
    if (!city) return '';
    if (typeof city === 'string') return city;
    return city.display_name ?? city.input ?? '';
  }
  return '';
}

// ─────────────────────────────────────────────────────────────
// Sortable card wrapper
// ─────────────────────────────────────────────────────────────

interface SortableCardProps {
  module: ModuleRow;
  onEdit: (module: ModuleRow) => void;
  onDeleteRequest: (id: string) => void;
  onToggle: (id: string) => void;
  toggling: boolean;
}

function SortableModuleCard({ module, onEdit, onDeleteRequest, onToggle, toggling }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: module.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const def = MODULE_REGISTRY[module.module_type];
  if (!def) return null;

  const Icon = ICON_MAP[def.icon] ?? HelpCircle;
  const summary = configSummary(module.module_type, module.config);
  const pts = getModulePoints(module.module_type, module.config ?? {});

  // Weather: detect rows that still hold plain-string locations (pre-geocode
  // legacy data) so the user can re-save and trigger geocoding.
  const weatherNeedsResave = module.module_type === 'weather' && (() => {
    const locs = module.config?.locations as unknown;
    if (!Array.isArray(locs) || locs.length === 0) return false;
    return locs.some((l) => typeof l === 'string' || (l && typeof l === 'object' && typeof (l as { latitude?: unknown }).latitude !== 'number'));
  })();

  // local_events: detect rows where city is still a bare string (legacy pre-
  // geocode data) so the user can re-save and trigger geocoding.
  const eventsNeedsResave = module.module_type === 'local_events' && (() => {
    const city = module.config?.city as unknown;
    if (!city) return false;
    if (typeof city === 'string') return true;
    if (typeof city === 'object' && typeof (city as { latitude?: unknown }).latitude !== 'number') return true;
    return false;
  })();

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={`relative rounded-xl border border-surface-border bg-white p-5 border-t-[3px] border-t-brand-purple transition-opacity ${
          module.is_enabled ? 'opacity-100' : 'opacity-60'
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Drag handle. 44x44 hit target on mobile, smaller visual on desktop.
              `touch-none` is required for dnd-kit's PointerSensor to capture
              touch drags without the browser stealing them for scroll.
              dnd-kit's `attributes` spread already provides role/tabindex/aria
              so we only add the title for screen readers. */}
          <div
            aria-label="Drag to reorder"
            className="flex h-11 w-11 sm:h-8 sm:w-8 shrink-0 items-center justify-center text-ink-faint hover:text-brand-purple cursor-grab active:cursor-grabbing touch-none transition-colors"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5 sm:h-4 sm:w-4" />
          </div>

          {/* Icon */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-purple-light">
            <Icon className="h-5 w-5 text-brand-purple" />
          </div>

          {/* Label + summary */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-ink">{def.label}</p>
              {!module.is_enabled && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                  Paused
                </span>
              )}
            </div>
            {summary && (
              <p className="text-sm text-ink-muted truncate">{summary}</p>
            )}
            {weatherNeedsResave && (
              <p className="mt-1 text-xs text-amber-700">
                We couldn&rsquo;t verify your weather location. Please re-enter it.
              </p>
            )}
            {eventsNeedsResave && (
              <p className="mt-1 text-xs text-amber-700">
                We couldn&rsquo;t verify your events city. Please re-enter it.
              </p>
            )}
          </div>

          {/* Points badge */}
          <span className="shrink-0 rounded-full bg-surface-secondary px-2 py-0.5 text-xs text-ink-muted">
            {pts} {pts === 1 ? 'pt' : 'pts'}
          </span>

          {/* iOS-style toggle */}
          <Toggle
            checked={module.is_enabled}
            onChange={() => onToggle(module.id)}
            loading={toggling}
          />

          {/* Edit + Delete buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(module)}
              className="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-surface-secondary transition-colors"
              title="Edit module"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDeleteRequest(module.id)}
              className="p-1.5 rounded-lg text-ink-faint hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Remove module"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main ModuleList
// ─────────────────────────────────────────────────────────────

interface ModuleListProps {
  modules: ModuleRow[];
  onModulesChange: (modules: ModuleRow[]) => void;
  onRefresh: () => Promise<void>;
  refreshing: boolean;
  subscriptionStatus: string;
}

export default function ModuleList({
  modules, onModulesChange, onRefresh, refreshing, subscriptionStatus,
}: ModuleListProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [modalInitialType, setModalInitialType] = useState<string | null>(null);
  const [existingModule, setExistingModule] = useState<Pick<ModuleRow, 'id' | 'module_type' | 'config'> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [loadingQuickAdd, setLoadingQuickAdd] = useState<string | null>(null);
  const [togglingModule, setTogglingModule] = useState<string | null>(null);
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);

  const { used: pointsUsed, limit: pointsLimit, remaining, isAtLimit } = usePoints(modules, subscriptionStatus);
  const { isFree, isPro } = usePlan(subscriptionStatus);
  const recommendations = getModuleRecommendations(modules, remaining);
  const showSuggestions = !isAtLimit && modules.length > 0;

  // DnD sensors — require 8px drag before activating to avoid click conflicts
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function openAdd() {
    if (isAtLimit) { setLimitDialogOpen(true); return; }
    setExistingModule(null);
    setModalInitialType(null);
    setModalMode('add');
    setModalOpen(true);
  }

  function openEdit(module: ModuleRow) {
    setExistingModule({ id: module.id, module_type: module.module_type, config: module.config });
    setModalInitialType(null);
    setModalMode('edit');
    setModalOpen(true);
  }

  async function handleQuickAdd(moduleType: string) {
    if (isAtLimit) { setLimitDialogOpen(true); return; }
    const def = MODULE_REGISTRY[moduleType];
    if (!def) return;

    if (ZERO_CONFIG_TYPES.has(moduleType)) {
      setLoadingQuickAdd(moduleType);
      try {
        const res = await fetch('/api/modules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ module_type: moduleType, config: def.defaultConfig }),
        });
        if (res.status === 403) {
          const body = await res.json();
          if (body.error === 'points_exceeded') {
            if (isFree) {
              toast('No credits remaining', {
                description: `You've used all ${body.pointsLimit ?? 3} credits.`,
                action: { label: 'Upgrade', onClick: () => { window.location.href = '/dashboard/upgrade'; } },
              });
            } else {
              toast('No credits remaining', {
                description: 'Remove a module to free up credits.',
              });
            }
            return;
          }
        }
        if (!res.ok) throw new Error('Failed');
        toast.success(`${def.label} added to your brief ✓`);
        await onRefresh();
      } catch {
        toast.error('Something went wrong. Please try again.');
      } finally {
        setLoadingQuickAdd(null);
      }
    } else {
      setExistingModule(null);
      setModalInitialType(moduleType);
      setModalMode('add');
      setModalOpen(true);
    }
  }

  async function handleToggle(id: string) {
    const found = modules.find((m) => m.id === id);
    if (!found || togglingModule) return;
    const newValue = !found.is_enabled;
    // Optimistic update
    setTogglingModule(id);
    onModulesChange(modules.map((m) => (m.id === id ? { ...m, is_enabled: newValue } : m)));
    try {
      const res = await fetch(`/api/modules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: newValue }),
      });
      if (!res.ok) {
        // Revert on failure
        onModulesChange(modules.map((m) => (m.id === id ? { ...m, is_enabled: !newValue } : m)));
        toast.error('Failed to update module.');
      }
    } finally {
      setTogglingModule(null);
    }
  }

  async function handleDelete(id: string) {
    const snapshot = [...modules];
    onModulesChange(modules.filter((m) => m.id !== id));
    setDeleteTarget(null);
    const res = await fetch(`/api/modules/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      onModulesChange(snapshot);
      toast.error('Failed to remove module.');
    } else {
      toast.success('Module removed.');
      await onRefresh();
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = modules.findIndex((m) => m.id === active.id);
    const newIndex = modules.findIndex((m) => m.id === over.id);
    const reordered = arrayMove(modules, oldIndex, newIndex);
    const updated = reordered.map((m, i) => ({ ...m, display_order: i }));

    // Optimistic update
    onModulesChange(updated);

    try {
      await fetch('/api/modules/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: updated.map((m) => ({ id: m.id, display_order: m.display_order })) }),
      });
    } catch {
      // Revert to DB state on failure
      await onRefresh();
      toast.error('Reorder failed. Changes reverted.');
    }
  }

  const deleteTargetModule = deleteTarget ? modules.find((m) => m.id === deleteTarget) : null;
  const deleteLabel = deleteTargetModule
    ? (MODULE_REGISTRY[deleteTargetModule.module_type]?.label ?? deleteTargetModule.module_type)
    : '';

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Your Modules</h2>
          <Button
            size="sm"
            variant={isAtLimit ? 'outline' : 'default'}
            onClick={openAdd}
            className="gap-1.5 min-h-[44px] sm:min-h-0"
            disabled={refreshing}
          >
            {isAtLimit && isFree
              ? <><Lock className="h-3.5 w-3.5" /><span className="hidden sm:inline"> Add module</span></>
              : isAtLimit && isPro
                ? <><LayoutGrid className="h-3.5 w-3.5" /><span className="hidden sm:inline"> Add module</span></>
                : <><Plus className="h-3.5 w-3.5" /><span className="hidden sm:inline"> Add module</span></>
            }
          </Button>
        </div>

        {/* Points bar */}
        {modules.length > 0 && (
          <PointsBar modules={modules} subscriptionStatus={subscriptionStatus} refreshing={refreshing} />
        )}

        {/* Suggested modules strip */}
        {showSuggestions && recommendations.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-medium uppercase tracking-widest text-ink-muted">
              Suggested for you
            </p>
            <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
              {recommendations.map((type) => {
                const def = MODULE_REGISTRY[type];
                if (!def) return null;
                const Icon = ICON_MAP[def.icon] ?? HelpCircle;
                const pts = getModulePoints(type, def.defaultConfig as Record<string, unknown>);
                const canAfford = pts <= remaining;
                const isLoading = loadingQuickAdd === type;

                return (
                  <button
                    key={type}
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      if (!canAfford) {
                        if (isFree) {
                          toast('Not enough credits', {
                            description: `This module costs ${pts} credit${pts !== 1 ? 's' : ''} but you only have ${remaining} left.`,
                            action: { label: 'Upgrade', onClick: () => { window.location.href = '/dashboard/upgrade'; } },
                          });
                        } else {
                          toast('Not enough credits', {
                            description: 'Remove a module to free up credits.',
                          });
                        }
                        return;
                      }
                      handleQuickAdd(type);
                    }}
                    className={`group flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                      canAfford
                        ? 'border-surface-border bg-white hover:border-brand-purple hover:bg-brand-purple-light'
                        : 'border-surface-border bg-surface-secondary opacity-60 cursor-not-allowed'
                    }`}
                  >
                    {isLoading
                      ? <Loader2 className="h-4 w-4 shrink-0 text-brand-purple animate-spin" />
                      : canAfford
                        ? <Icon className="h-4 w-4 shrink-0 text-brand-purple" />
                        : isFree
                          ? <Lock className="h-4 w-4 shrink-0 text-ink-faint" />
                          : <MinusCircle className="h-4 w-4 shrink-0 text-ink-faint" />
                    }
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink leading-none">{def.label}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">{pts} {pts === 1 ? 'pt' : 'pts'}</p>
                    </div>
                    {canAfford && !isLoading && (
                      <Plus className="h-3.5 w-3.5 shrink-0 text-brand-purple opacity-70 group-hover:opacity-100" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {modules.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-surface-border bg-white py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-purple-light">
              <Inbox className="h-7 w-7 text-brand-purple" />
            </div>
            <p className="text-base font-semibold text-ink">No modules yet</p>
            <p className="mt-1 text-sm text-ink-muted">
              Add your first module to start receiving your daily brief.
            </p>
            <Button className="mt-5" onClick={openAdd}>
              <Plus className="mr-1.5 h-4 w-4" /> Add your first module
            </Button>
            <p className="mt-5 text-xs text-ink-faint">
              Reply to your brief if there&rsquo;s a module you wish existed.
            </p>
          </div>
        )}

        {/* DnD module list */}
        {modules.length > 0 && (
          <>
            {/* Discovery hint — purple-translucent banner, one-time dismiss
                stored in localStorage. Sits directly above the first card so
                the reorder/email-order connection is impossible to miss. */}
            <ReorderHint />
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={modules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {modules.map((module) => (
                    <SortableModuleCard
                      key={module.id}
                      module={module}
                      onEdit={openEdit}
                      onDeleteRequest={setDeleteTarget}
                      onToggle={handleToggle}
                      toggling={togglingModule === module.id}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </>
        )}

        {/* Full-width add button */}
        {modules.length > 0 && (
          isAtLimit && isFree ? (
            <button
              type="button"
              onClick={() => { window.location.href = '/dashboard/upgrade'; }}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-red-200 text-brand-purple transition-all hover:border-brand-purple hover:bg-brand-purple-light"
            >
              <span className="text-sm font-medium">Upgrade to Pro to add more modules →</span>
            </button>
          ) : isAtLimit && isPro ? (
            <button
              type="button"
              onClick={() => toast('Remove a module to free up credits.')}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-surface-border text-ink-muted"
            >
              <span className="text-sm font-medium">12-credit limit reached. Remove a module to add another.</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={openAdd}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-surface-border text-ink-muted transition-all hover:border-brand-purple hover:bg-brand-purple-light hover:text-brand-purple"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm font-medium">Add a module</span>
            </button>
          )
        )}
      </div>

      {/* Module modal */}
      <ModuleModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) { setModalInitialType(null); setExistingModule(null); }
        }}
        mode={modalMode}
        existingModule={existingModule ?? undefined}
        initialModuleType={modalInitialType}
        remainingPoints={remaining}
        subscriptionStatus={subscriptionStatus}
        onSuccess={onRefresh}
      />

      {/* Credit limit dialog — free user */}
      {isFree && (
        <AlertDialog open={limitDialogOpen} onOpenChange={setLimitDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>You&rsquo;ve used all your credits</AlertDialogTitle>
              <AlertDialogDescription>
                You&rsquo;re using {pointsUsed} of {pointsLimit} credits. Upgrade to Brief Pro for 12
                credits and access to all modules.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Maybe later</AlertDialogCancel>
              <AlertDialogAction onClick={() => { window.location.href = '/dashboard/upgrade'; }}>
                Upgrade to Pro
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Credit limit dialog — pro user */}
      {isPro && (
        <AlertDialog open={limitDialogOpen} onOpenChange={setLimitDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>12-credit limit reached</AlertDialogTitle>
              <AlertDialogDescription>
                You have used all 12 module credits. To add a new module, remove one of your
                existing modules first.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setLimitDialogOpen(false)}>
                Got it
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this module?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {deleteLabel} from your brief. You can add it back anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
