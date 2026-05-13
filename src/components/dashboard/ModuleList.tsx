'use client';

import { useState } from 'react';
import {
  Plus, Inbox, MoreHorizontal, Pencil, Trash2, Lock,
  ChevronUp, ChevronDown, type LucideIcon,
} from 'lucide-react';
import { Cloud, Newspaper, Quote, TrendingUp, HelpCircle } from 'lucide-react';
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
import { MODULE_POINTS, FREE_TIER_POINTS, PRO_TIER_POINTS, getTotalPoints } from '@/lib/modules/points';
import type { ModuleRow } from '@/types';

const ICON_MAP: Record<string, LucideIcon> = { Cloud, Newspaper, Quote, TrendingUp };

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
  return '';
}

interface ModuleListProps {
  initialModules: ModuleRow[];
  subscriptionStatus: string;
}

export default function ModuleList({ initialModules, subscriptionStatus }: ModuleListProps) {
  const [modules, setModules] = useState<ModuleRow[]>(initialModules);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editModule, setEditModule] = useState<Pick<ModuleRow, 'id' | 'module_type' | 'config'> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const isPro = subscriptionStatus === 'active';
  const pointsUsed = getTotalPoints(modules);
  const pointsLimit = isPro ? PRO_TIER_POINTS : FREE_TIER_POINTS;
  const isAtLimit = pointsUsed >= pointsLimit;

  function openAdd() {
    if (isAtLimit) {
      toast('No credits remaining', {
        description: `You've used all ${pointsLimit} credits. Upgrade to Pro to add more modules.`,
        action: {
          label: 'Upgrade',
          onClick: () => { window.location.href = '/dashboard/upgrade'; },
        },
      });
      return;
    }
    setEditModule(null);
    setSheetOpen(true);
  }

  function openEdit(module: ModuleRow) {
    setEditModule({ id: module.id, module_type: module.module_type, config: module.config });
    setSheetOpen(true);
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
            className="gap-1.5"
          >
            {isAtLimit ? (
              <><Lock className="h-3.5 w-3.5" /> Add module</>
            ) : (
              <><Plus className="h-3.5 w-3.5" /> Add module</>
            )}
          </Button>
        </div>

        {/* Points bar */}
        {modules.length > 0 && (
          <PointsBar modules={modules} isPro={isPro} />
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
          const pts = MODULE_POINTS[module.module_type] ?? 1;

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
      </div>

      {/* Module sheet */}
      <ModuleSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editModule={editModule}
        onSaved={handleSaved}
      />

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
