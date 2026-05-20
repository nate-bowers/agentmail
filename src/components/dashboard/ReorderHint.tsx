'use client';

// One-time discovery banner for the drag-to-reorder behavior on the module
// list. Styled to match SpecificityTooltip (purple-translucent, framer-motion
// fade/scale, dismissible with localStorage). Lives above the first module
// card so the connection between dragging here and email order is obvious.

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GripVertical, X } from 'lucide-react';

const STORAGE_KEY = 'dashboard-hint:reorder-dismissed';

function useDismissed() {
  // Default to dismissed so the banner doesn't flash before we know the
  // localStorage answer on first paint.
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      setDismissed(window.localStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore quota / privacy mode errors
    }
  }

  return { dismissed, dismiss };
}

export default function ReorderHint() {
  const { dismissed, dismiss } = useDismissed();

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: -4 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          role="status"
          aria-label="Drag-to-reorder hint"
          className={[
            'relative mb-3 rounded-xl',
            'border border-purple-300/30 bg-purple-500/15 backdrop-blur-sm',
            'shadow-[0_4px_18px_-4px_rgba(124,58,237,0.25)]',
            'px-3 py-2 pr-12 sm:pr-10',
          ].join(' ')}
        >
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 shrink-0 text-brand-purple" aria-hidden />
            <p className="text-xs leading-snug text-brand-purple-dark font-medium">
              Drag to reorder. The order here is the order in your email.
            </p>
          </div>
          <button
            type="button"
            aria-label="Dismiss tip"
            onClick={dismiss}
            // Big mobile target, regular desktop target.
            className="absolute right-1 top-1 inline-flex h-11 w-11 sm:h-7 sm:w-7 items-center justify-center rounded-md text-brand-purple/70 hover:text-brand-purple hover:bg-purple-500/10 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
