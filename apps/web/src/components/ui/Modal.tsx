'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { motion } from 'motion/react';
import type { PanInfo } from 'motion/react';
import type { ReactNode } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/lib/motion';

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Max-width on desktop — see docs/DESIGN_SYSTEM.md §5 "Modals & sheets". */
  size?: 'sm' | 'md';
}

const DRAG_DISMISS_THRESHOLD_PX = 100;

/**
 * Centered dialog on desktop (≥640px), bottom sheet with drag-to-dismiss on
 * mobile — one adaptive component per docs/DESIGN_SYSTEM.md §5, rather than
 * two components a caller has to choose between.
 *
 * Enter/exit animation is CSS, driven by Radix's own `data-state` attribute
 * (see the `dialog-*` keyframes in globals.css) — the same pattern as
 * Accordion. An earlier version used Framer's AnimatePresence + forceMount,
 * which is the commonly-recommended recipe, but its exit never reported
 * completion here (verified directly via onExitComplete never firing), so
 * closed dialogs stayed mounted-but-invisible. Framer is kept only for the
 * mobile drag-to-dismiss gesture, which doesn't depend on AnimatePresence.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = 'sm',
}: ModalProps): ReactNode {
  const isDesktop = useMediaQuery('(min-width: 640px)');
  const reducedMotion = useReducedMotion();

  function handleDragEnd(_: unknown, info: PanInfo): void {
    if (info.offset.y > DRAG_DISMISS_THRESHOLD_PX) onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-[rgba(32,33,30,0.45)] backdrop-blur-[4px]',
            'data-[state=open]:animate-[dialog-overlay-in_var(--duration-base)_var(--ease-standard)]',
            'data-[state=closed]:animate-[dialog-overlay-out_var(--duration-fast)_var(--ease-in)]',
          )}
        />

        <Dialog.Content asChild>
          <motion.div
            className={cn(
              'bg-surface fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-xl shadow-lg',
              'pb-[env(safe-area-inset-bottom)]',
              'data-[state=open]:animate-[dialog-content-in-mobile_var(--duration-slow)_var(--ease-out)]',
              'data-[state=closed]:animate-[dialog-content-out-mobile_var(--duration-fast)_var(--ease-in)]',
              'sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-full sm:[transform:translate(-50%,-50%)] sm:rounded-xl sm:pb-0',
              'sm:data-[state=open]:animate-[dialog-content-in-desktop_var(--duration-base)_var(--ease-standard)]',
              'sm:data-[state=closed]:animate-[dialog-content-out-desktop_var(--duration-fast)_var(--ease-in)]',
              size === 'sm' ? 'sm:max-w-[480px]' : 'sm:max-w-[640px]',
            )}
            drag={!isDesktop && !reducedMotion ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
          >
            {!isDesktop && (
              <div className="flex justify-center pt-2.5" aria-hidden="true">
                <div className="bg-border-strong h-1 w-10 rounded-full" />
              </div>
            )}

            <div className="flex items-start justify-between gap-4 p-6 pb-4">
              <div className="flex flex-col gap-1">
                <Dialog.Title className="text-text text-lg font-semibold">{title}</Dialog.Title>
                {description && (
                  <Dialog.Description className="text-text-muted text-sm">
                    {description}
                  </Dialog.Description>
                )}
              </div>
              <Dialog.Close
                className={cn(
                  'text-text-muted flex size-8 shrink-0 items-center justify-center rounded-full',
                  'duration-fast ease-standard hover:bg-surface-alt hover:text-text transition-colors',
                  'focus-visible:shadow-focus focus-visible:outline-none',
                )}
                aria-label="Close"
              >
                <X className="size-4" aria-hidden="true" />
              </Dialog.Close>
            </div>

            <div className="px-6 pb-6">{children}</div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
