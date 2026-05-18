'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, X } from 'lucide-react';

export interface SpecificityTooltipProps {
  /** Stable id used for localStorage dismissal — usually `${moduleType}.${fieldName}`. */
  fieldId: string;
  /** The hint copy. Defaults to the canonical "the more specific" line. */
  message?: string;
  /**
   * Render mode. "focus" listens to focus/blur on the wrapped input.
   * "icon" shows a small info button users can hover or click to open.
   */
  mode?: 'focus' | 'icon';
  /** When true, do not render at all. Use to gate behind plan/locked state. */
  disabled?: boolean;
  /**
   * Anchor side on desktop. On mobile (<768px) the tooltip always anchors below.
   */
  side?: 'right' | 'bottom';
  /** The input or label the tooltip should wrap. */
  children: React.ReactNode;
}

const DEFAULT_MESSAGE = 'The more specific you are, the better your brief will be.';

function localKey(fieldId: string) {
  return `specificity-hint:dismissed:${fieldId}`;
}

function useDismissed(fieldId: string) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      setDismissed(window.localStorage.getItem(localKey(fieldId)) === '1');
    } catch {
      setDismissed(false);
    }
  }, [fieldId]);

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(localKey(fieldId), '1');
    } catch {
      // ignore quota / privacy mode errors
    }
  }

  return { dismissed, dismiss };
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, [breakpoint]);
  return isMobile;
}

export function SpecificityTooltip({
  fieldId,
  message = DEFAULT_MESSAGE,
  mode = 'focus',
  disabled = false,
  side = 'right',
  children,
}: SpecificityTooltipProps) {
  const { dismissed, dismiss } = useDismissed(fieldId);
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  if (disabled) return <>{children}</>;

  const effectiveSide = isMobile ? 'bottom' : side;
  const shouldShow = open && !dismissed;

  // Focus-mode: capture focus/blur on inner inputs/textareas
  function handleFocusIn() {
    if (mode === 'focus') setOpen(true);
  }
  function handleFocusOut(e: React.FocusEvent) {
    if (mode !== 'focus') return;
    // Don't close if focus moves inside the tooltip popup or anywhere inside this wrapper
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setOpen(false);
  }

  return (
    <div
      className="relative"
      onFocus={handleFocusIn}
      onBlur={handleFocusOut}
    >
      {mode === 'icon' && (
        <button
          type="button"
          aria-label="Tip about this field"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onClick={() => setOpen((v) => !v)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          className="ml-1 inline-flex items-center justify-center text-ink-faint hover:text-brand-purple transition-colors"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      )}

      {children}

      <AnimatePresence>
        {shouldShow && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: effectiveSide === 'bottom' ? -4 : 0, x: effectiveSide === 'right' ? -4 : 0 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: effectiveSide === 'bottom' ? -4 : 0, x: effectiveSide === 'right' ? -4 : 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            role="tooltip"
            className={[
              'absolute z-30 pointer-events-auto',
              'rounded-xl border border-purple-300/30 bg-purple-500/15 backdrop-blur-sm',
              'shadow-[0_4px_18px_-4px_rgba(124,58,237,0.25)]',
              'px-3 py-2 pr-9 max-w-xs',
              effectiveSide === 'right'
                ? 'left-full top-1 ml-3'
                : 'left-0 right-0 top-full mt-2',
            ].join(' ')}
          >
            <p className="text-xs leading-snug text-brand-purple-dark font-medium">
              <span className="mr-1">✦</span>
              {message}
            </p>
            <button
              type="button"
              aria-label="Dismiss tip"
              onClick={(e) => { e.stopPropagation(); dismiss(); setOpen(false); }}
              className="absolute right-1 top-1 inline-flex h-11 w-11 sm:h-7 sm:w-7 items-center justify-center rounded-md text-brand-purple/70 hover:text-brand-purple hover:bg-purple-500/10 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
