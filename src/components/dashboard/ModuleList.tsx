'use client';

import { useState } from 'react';
import {
  Plus, Inbox, MoreHorizontal, Pencil, Trash2, Lock,
  ChevronUp, ChevronDown, type LucideIcon,
} from 'lucide-react';
import {
  Cloud, Newspaper, Quote, TrendingUp, HelpCircle,
  Trophy, BookOpen, Dumbbell, Brain, Calendar, ArrowLeftRight, Headphones, Lightbulb,
  ChefHat, BookMarked, MessageSquare, Stars, Languages, Heart, Cpu, MapPin, Landmark, Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import ModuleSheet from './ModuleSheet';
import PointsBar from './PointsBar';
import { MODULE_REGISTRY } from '@/lib/modules';
import { getModulePoints } from '@/lib/modules/points';
import { usePoints } from '@/hooks/usePoints';
import { getModuleRecommendations } from '@/lib/dashboard/recommendations';
import type { ModuleRow } from '@/types';

const ICON_MAP: Record<string, LucideIcon> = {
  Cloud, Newspaper, Quote, TrendingUp,
  Trophy, BookOpen, Dumbbell, Brain, Calendar, ArrowLeftRight, Headphones, Lightbulb,
  ChefHat, BookMarked, MessageSquare, Stars, Languages, Heart, Cpu, MapPin, Landmark, Zap,
};

// Modules that can be added immediately with default config (no required user input)
const ZERO_CONFIG_TYPES = new Set([
  'fact', 'on_this_day', 'word_of_day', 'mindfulness', 'quote', 'workout',
]);

function configSummary(moduleType: string, config: Record<string, unknown>): string {
  if (moduleType === 'weather') {
    const locs = config.locations as string[] | undefined;
    return locs?.join(' · ') ?? '';
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
  return '';
}

interface ModuleListProps {
  initialModules: ModuleRow[];
  subscriptionStatus: string;
}

export default function ModuleList({ initialModules, subscriptionStatus }: ModuleListProps) {
  const [modules, setModules] = useState<ModuleRow[]>(initialModules);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<'add' | 'edit'>('add');
  const [sheetInitialType, setSheetInitialType] = useState<string | null>(null);
  const [existingModule, setExistingModule] = useState<Pick<ModuleRow, 'id' | 'module_type' | 'config'> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const isPro = subscriptionStatus === 'active';
  const { used: pointsUsed, limit: pointsLimit, remaining, isAtLimit } = usePoints(modules, isPro);

  const [limitDialogOpen, setLimitDialogOpen] = useState(false);

  const recommendations = getModuleRecommendations(modules, remaining);
  const showSuggestions = !isAtLimit && modules.length > 0;

  function openAdd() {
    if (isAtLimit) {
      setLimitDialogOpen(true);
      return;
    }
    setExistingModule(null);
    setSheetInitialType(null);
    setSheetMode('add');
    setSheetOpen(true);
  }

  function openEdit(module: ModuleRow) {
    setExistingModule({ id: module.id, module_type: module.module_type, config: module.config });
    setSheetInitialType(null);
    setSheetMode('edit');
    setSheetOpen(true);
  }

  async function handleQuickAdd(moduleType: string) {
    if (isAtLimit) {
      setLimitDialogOpen(true);
      return;
    }

    const def = MODULE_REGISTRY[moduleType];
    if (!def) return;

    if (ZERO_CONFIG_TYPES.has(moduleType)) {
      try {
        const res = await fetch('/api/modules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ module_type: moduleType, config: def.defaultConfig }),
        });
        if (res.status === 403) {
          const body = await res.json();
          if (body.error === 'points_exceeded') {
            toast('No credits remaining', {
              description: `You've used all ${body.pointsLimit ?? 3} credits.`,
              action: { label: 'Upgrade', onClick: () => { window.location.href = '/dashboard/upgrade'; } },
            });
            return;
          }
        }
        if (!res.ok) throw new Error('Failed');
        toast.success(`${def.label} added to your brief ✓`);
        window.location.reload();
      } catch {
        toast.error('Something went wrong. Please try again.');
      }
    } else {
      // Open sheet pre-selected on this type
      setExistingModule(null);
      setSheetInitialType(moduleType);
      setSheetMode('add');
      setSheetOpen(true);
    }
  }

  function handleSaved() {
    window.location.reload();
  }

  async function handleToggle(id: string) {
    const found = modules.find((m) => m.id === id);
    if (!found) return;
    const newValue = !found.is_enabled;
    setModules((prev) => prev.map((m) => (m.id === id ? { ...m, is_enabled: newValue } : m)));
    const res = await fetch(`/api/modules/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_enabled: newValue }),
    });
    if (!res.ok) {
      setModules((prev) => prev.map((m) => (m.id === id ? { ...m, is_enabled: !newValue } : m)));
      toast.error('Failed to update module.');
    }
  }

  async function handleReorder(id: string, direction: 'up' | 'down') {
    const idx = modules.findIndex((m) => m.id === id);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= modules.length) return;

    const newModules = [...modules];
    const aOrder = newModules[idx].display_order;
    const bOrder = newModules[swapIdx].display_order;
    newModules[idx] = { ...newModules[idx], display_order: bOrder };
    newModules[swapIdx] = { ...newModules[swapIdx], display_order: aOrder };
    newModules.sort((a, b) => a.display_order - b.display_order);
    setModules(newModules);

    await Promise.all([
      fetch(`/api/modules/${modules[idx].id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_order: bOrder }),
      }),
      fetch(`/api/modules/${modules[swapIdx].id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_order: aOrder }),
      }),
    ]);
  }

  async function handleDelete(id: string) {
    const snapshot = [...modules];
    setModules((prev) => prev.filter((m) => m.id !== id));
    const res = await fetch(`/api/modules/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      setModules(snapshot);
      toast.error('Failed to delete module.');
    } else {
      toast.success('Module removed.');
    }
    setDeleteTarget(null);
  }

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
          >
            {isAtLimit ? (
              <><Lock className="h-3.5 w-3.5" /><span className="hidden sm:inline"> Add module</span></>
            ) : (
              <><Plus className="h-3.5 w-3.5" /><span className="hidden sm:inline"> Add module</span></>
            )}
          </Button>
        </div>

        {/* Points bar */}
        {modules.length > 0 && (
          <PointsBar modules={modules} isPro={isPro} />
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
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      if (!canAfford) {
                        toast('Not enough credits', {
                          description: `This module costs ${pts} credit${pts !== 1 ? 's' : ''} but you only have ${remaining} left.`,
                          action: { label: 'Upgrade', onClick: () => { window.location.href = '/dashboard/upgrade'; } },
                        });
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
                    {canAfford
                      ? <Icon className="h-4 w-4 shrink-0 text-brand-purple" />
                      : <Lock className="h-4 w-4 shrink-0 text-ink-faint" />
                    }
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink leading-none">{def.label}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">{pts} {pts === 1 ? 'pt' : 'pts'}</p>
                    </div>
                    {canAfford && <Plus className="h-3.5 w-3.5 shrink-0 text-brand-purple opacity-70 group-hover:opacity-100" />}
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
          </div>
        )}

        {/* Module cards */}
        {modules.map((module, index) => {
          const def = MODULE_REGISTRY[module.module_type];
          if (!def) return null;
          const Icon = ICON_MAP[def.icon] ?? HelpCircle;
          const summary = configSummary(module.module_type, module.config);
          const pts = getModulePoints(module.module_type, module.config ?? {});

          return (
            <div
              key={module.id}
              className={`relative rounded-xl border border-surface-border bg-white p-5 border-t-[3px] border-t-brand-purple transition-opacity ${
                module.is_enabled ? 'opacity-100' : 'opacity-50'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Reorder arrows */}
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => handleReorder(module.id, 'up')}
                    disabled={index === 0}
                    className="flex h-5 w-5 items-center justify-center rounded text-ink-faint transition-colors hover:text-ink disabled:opacity-25 disabled:cursor-default"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleReorder(module.id, 'down')}
                    disabled={index === modules.length - 1}
                    className="flex h-5 w-5 items-center justify-center rounded text-ink-faint transition-colors hover:text-ink disabled:opacity-25 disabled:cursor-default"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
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
                      <span className="text-xs italic text-ink-muted">Disabled</span>
                    )}
                  </div>
                  {summary && (
                    <p className="text-sm text-ink-muted truncate">{summary}</p>
                  )}
                </div>

                {/* Points badge */}
                <span className="shrink-0 rounded-full bg-surface-secondary px-2 py-0.5 text-xs text-ink-muted">
                  {pts} {pts === 1 ? 'pt' : 'pts'}
                </span>

                {/* Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-ink-faint">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Module options</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(module)}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggle(module.id)}>
                      {module.is_enabled ? 'Disable' : 'Enable'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteTarget(module.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}

        {/* Full-width add button (only shown when there are modules) */}
        {modules.length > 0 && (
          isAtLimit ? (
            <button
              type="button"
              onClick={() => { window.location.href = '/dashboard/upgrade'; }}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-red-200 text-brand-purple transition-all hover:border-brand-purple hover:bg-brand-purple-light"
            >
              <span className="text-sm font-medium">Upgrade to add more modules →</span>
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

      {/* Module sheet */}
      <ModuleSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) { setSheetInitialType(null); setExistingModule(null); }
        }}
        mode={sheetMode}
        existingModule={existingModule ?? undefined}
        initialModuleType={sheetInitialType}
        remainingPoints={remaining}
        isPro={isPro}
        onSuccess={handleSaved}
      />

      {/* Credit limit dialog */}
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

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this module?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the module from your daily brief. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
