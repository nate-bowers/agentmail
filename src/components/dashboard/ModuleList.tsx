'use client';

import { useState } from 'react';
import { Plus, Inbox, MoreHorizontal, Pencil, Trash2, type LucideIcon } from 'lucide-react';
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
import { MODULE_REGISTRY } from '@/lib/modules';
import { PLANS } from '@/lib/stripe/products';
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
  const isAtLimit = !isPro && modules.length >= PLANS.free.moduleLimit;

  function openAdd() {
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
          {isAtLimit ? (
            <Button size="sm" variant="outline" asChild>
              <a href="/dashboard/upgrade">Upgrade for more</a>
            </Button>
          ) : (
            <Button size="sm" onClick={openAdd}>
              <Plus className="mr-1.5 h-4 w-4" /> Add module
            </Button>
          )}
        </div>

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
        {modules.map((module) => {
          const def = MODULE_REGISTRY[module.module_type];
          if (!def) return null;
          const Icon = ICON_MAP[def.icon] ?? HelpCircle;
          const summary = configSummary(module.module_type, module.config);

          return (
            <div
              key={module.id}
              className={`relative rounded-xl border border-surface-border bg-white p-5 border-t-[3px] border-t-brand-purple transition-opacity ${
                module.is_enabled ? 'opacity-100' : 'opacity-50'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-purple-light">
                  <Icon className="h-5 w-5 text-brand-purple" />
                </div>

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
