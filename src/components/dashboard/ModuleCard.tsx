'use client';

import Link from 'next/link';
import {
  Cloud,
  Newspaper,
  Quote,
  TrendingUp,
  HelpCircle,
  ChevronUp,
  ChevronDown,
  Pencil,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { ModuleRow } from '@/types';

const ICON_MAP: Record<string, LucideIcon> = {
  Cloud,
  Newspaper,
  Quote,
  TrendingUp,
};

function getConfigSummary(type: string, config: Record<string, unknown>): string {
  switch (type) {
    case 'weather': {
      const locations = config.locations as string[] | undefined;
      return locations?.join(' · ') ?? '';
    }
    case 'news': {
      const topics = config.topics as string[] | undefined;
      const count = config.count as number | undefined;
      return `${topics?.join(' · ')} · ${count ?? 5} headlines`;
    }
    case 'quote': {
      const style = config.style as string | undefined;
      return style ? style.charAt(0).toUpperCase() + style.slice(1) : '';
    }
    case 'markets': {
      const symbols = config.symbols as string[] | undefined;
      return symbols?.join(' · ') ?? '';
    }
    default:
      return '';
  }
}

interface ModuleCardProps {
  module: ModuleRow;
  label: string;
  icon: string;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

export default function ModuleCard({
  module,
  label,
  icon,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onToggle,
  onDelete,
}: ModuleCardProps) {
  const Icon = ICON_MAP[icon] ?? HelpCircle;
  const summary = getConfigSummary(module.module_type, module.config);

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
      {/* Reorder arrows */}
      <div className="flex flex-col">
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-muted-foreground"
          disabled={isFirst}
          onClick={onMoveUp}
          aria-label="Move up"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-muted-foreground"
          disabled={isLast}
          onClick={onMoveDown}
          aria-label="Move down"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Icon */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Label + summary */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{label}</span>
          {!module.is_enabled && (
            <Badge variant="secondary" className="text-xs">Disabled</Badge>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">{summary}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground"
          onClick={onToggle}
        >
          {module.is_enabled ? 'Disable' : 'Enable'}
        </Button>

        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
          <Link href={`/dashboard/builder?edit=${module.id}`} aria-label="Edit module">
            <Pencil className="h-3.5 w-3.5" />
          </Link>
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              aria-label="Delete module"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {label} module?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove it from your daily brief. You can always add it back later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={onDelete}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
