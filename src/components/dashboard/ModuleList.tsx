'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import ModuleCard from './ModuleCard';
import { MODULE_REGISTRY } from '@/lib/modules';
import { PLANS } from '@/lib/stripe/products';
import type { ModuleRow } from '@/types';

interface ModuleListProps {
  initialModules: ModuleRow[];
  subscriptionStatus: string;
}

export default function ModuleList({ initialModules, subscriptionStatus }: ModuleListProps) {
  const [modules, setModules] = useState<ModuleRow[]>(initialModules);

  const isPro = subscriptionStatus === 'active';
  const isAtLimit = !isPro && modules.length >= PLANS.free.moduleLimit;

  async function handleToggle(id: string) {
    const module = modules.find((m) => m.id === id);
    if (!module) return;
    const newValue = !module.is_enabled;

    setModules((prev) =>
      prev.map((m) => (m.id === id ? { ...m, is_enabled: newValue } : m))
    );

    const res = await fetch(`/api/modules/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_enabled: newValue }),
    });
    if (!res.ok) {
      setModules((prev) =>
        prev.map((m) => (m.id === id ? { ...m, is_enabled: !newValue } : m))
      );
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
  }

  async function handleReorder(id: string, direction: 'up' | 'down') {
    const idx = modules.findIndex((m) => m.id === id);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= modules.length) return;

    const a = modules[idx];
    const b = modules[swapIdx];

    const next = [...modules];
    next[idx] = { ...b, display_order: a.display_order };
    next[swapIdx] = { ...a, display_order: b.display_order };
    setModules(next);

    const [resA, resB] = await Promise.all([
      fetch(`/api/modules/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_order: b.display_order }),
      }),
      fetch(`/api/modules/${b.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_order: a.display_order }),
      }),
    ]);

    if (!resA.ok || !resB.ok) {
      setModules(modules);
      toast.error('Failed to reorder modules.');
    }
  }

  if (modules.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-12 text-center">
        <p className="text-sm text-muted-foreground">No modules yet.</p>
        <Button size="sm" asChild>
          <Link href="/dashboard/builder">
            <Plus className="mr-1.5 h-4 w-4" />
            Add your first module
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {modules.map((module, idx) => {
        const def = MODULE_REGISTRY[module.module_type];
        if (!def) return null;
        return (
          <ModuleCard
            key={module.id}
            module={module}
            label={def.label}
            icon={def.icon}
            isFirst={idx === 0}
            isLast={idx === modules.length - 1}
            onMoveUp={() => handleReorder(module.id, 'up')}
            onMoveDown={() => handleReorder(module.id, 'down')}
            onToggle={() => handleToggle(module.id)}
            onDelete={() => handleDelete(module.id)}
          />
        );
      })}

      <div className="pt-2">
        {isAtLimit ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                {/* Wrapper span needed — disabled buttons don't fire pointer events */}
                <span className="inline-flex">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/upgrade">
                      <Lock className="mr-1.5 h-3.5 w-3.5" />
                      Add module
                    </Link>
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="right">
                Upgrade to Pro to add more modules
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/builder">
              <Plus className="mr-1.5 h-4 w-4" />
              Add module
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
