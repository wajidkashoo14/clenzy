'use client';

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  type LucideIcon,
  X,
} from 'lucide-react';
import { motion, type PanInfo } from 'motion/react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { transitions } from '@/lib/motion';
import type { ToastItem, ToastVariant } from '@/stores/toastStore';
import { useToastStore } from '@/stores/toastStore';

const SWIPE_DISMISS_THRESHOLD_PX = 80;
/** Must match the `transitions.enter` duration used for the dismiss animation below. */
const DISMISS_ANIMATION_MS = 240;

const VARIANT_META: Record<
  ToastVariant,
  { icon: LucideIcon; classes: string; role: 'status' | 'alert' }
> = {
  success: { icon: CheckCircle2, classes: 'text-success', role: 'status' },
  info: { icon: Info, classes: 'text-info', role: 'status' },
  warning: { icon: AlertTriangle, classes: 'text-warning', role: 'status' },
  error: { icon: AlertCircle, classes: 'text-error', role: 'alert' },
  loading: { icon: Loader2, classes: 'text-text-muted', role: 'status' },
};

/**
 * Dismissal is a manual two-phase transition (mark dismissing → animate →
 * remove from the store after the animation's duration) rather than
 * Framer's AnimatePresence + exit prop. That's the pattern used everywhere
 * else in this codebase (see Modal.tsx) after AnimatePresence's exit
 * animation was confirmed, three times over (Modal, QuantityStepper, and
 * this component), to never report completion in this environment — it
 * left toasts stuck in the DOM indefinitely after both manual dismiss and,
 * intermittently, the auto-dismiss timer. This version doesn't depend on
 * AnimatePresence at all, so it can't have that failure mode.
 */
function ToastCard({ toast }: { toast: ToastItem }): ReactNode {
  const removeToast = useToastStore((state) => state.dismiss);
  const [isDismissing, setIsDismissing] = useState(false);
  const meta = VARIANT_META[toast.variant];
  const Icon = meta.icon;
  const action = toast.action;

  const dismiss = useCallback(() => {
    setIsDismissing(true);
    setTimeout(() => removeToast(toast.id), DISMISS_ANIMATION_MS);
  }, [toast.id, removeToast]);

  useEffect(() => {
    if (toast.duration === undefined) return;
    const timer = setTimeout(dismiss, toast.duration);
    return () => clearTimeout(timer);
  }, [toast.duration, dismiss]);

  function handleDragEnd(_: unknown, info: PanInfo): void {
    if (Math.abs(info.offset.x) > SWIPE_DISMISS_THRESHOLD_PX) dismiss();
  }

  return (
    <motion.div
      layout
      role={meta.role}
      aria-live={meta.role === 'alert' ? 'assertive' : 'polite'}
      initial={{ opacity: 0, y: -12, scale: 0.98 }}
      animate={isDismissing ? { opacity: 0, x: 80 } : { opacity: 1, y: 0, scale: 1 }}
      transition={transitions.enter}
      drag={isDismissing ? false : 'x'}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0.5, right: 0.5 }}
      onDragEnd={handleDragEnd}
      className="border-border bg-surface pointer-events-auto flex w-[calc(100vw-2rem)] max-w-sm items-start gap-3 rounded-md border p-4 shadow-lg sm:w-96"
    >
      <Icon
        className={cn(
          'mt-0.5 size-5 shrink-0',
          meta.classes,
          toast.variant === 'loading' && 'animate-spin',
        )}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-text text-sm font-medium">{toast.title}</p>
        {toast.description && (
          <p className="text-text-muted mt-0.5 text-[13px]">{toast.description}</p>
        )}
        {action && (
          <button
            type="button"
            onClick={() => {
              action.onClick();
              dismiss();
            }}
            className="text-primary mt-2 text-[13px] font-semibold hover:underline"
          >
            {action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="text-text-muted duration-fast ease-standard hover:text-text focus-visible:shadow-focus shrink-0 rounded transition-colors focus-visible:outline-none"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </motion.div>
  );
}

/** Mount once at the app root (see components/layout/AppProviders). */
export function Toaster(): ReactNode {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-[100] flex flex-col items-center gap-2 sm:inset-x-auto sm:top-20 sm:right-4 sm:items-end">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
