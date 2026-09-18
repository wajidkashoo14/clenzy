import type { ToastAction, ToastItem, ToastVariant } from '@/stores/toastStore';
import { useToastStore } from '@/stores/toastStore';

interface ToastOptions {
  description?: string;
  duration?: number;
  action?: ToastAction;
}

const DEFAULT_DURATION_MS: Record<ToastVariant, number | undefined> = {
  success: 4000,
  info: 4000,
  warning: 4000,
  error: 6000,
  loading: undefined,
};

function show(variant: ToastVariant, title: string, opts?: ToastOptions): string {
  const duration = opts?.action ? undefined : (opts?.duration ?? DEFAULT_DURATION_MS[variant]);
  return useToastStore
    .getState()
    .add({ variant, title, description: opts?.description, duration, action: opts?.action });
}

/**
 * Imperative toast API — see docs/DESIGN_SYSTEM.md §5 "Toasts". Call from
 * anywhere (not just components); the store drives the `<Toaster>` mounted
 * once at the app root.
 *
 * @example
 * const id = toast.loading('Placing order…');
 * try {
 *   await placeOrder();
 *   toast.update(id, { variant: 'success', title: 'Order placed', duration: 4000 });
 * } catch {
 *   toast.update(id, { variant: 'error', title: 'Could not place order', duration: 6000 });
 * }
 */
export const toast = {
  success: (title: string, opts?: ToastOptions) => show('success', title, opts),
  error: (title: string, opts?: ToastOptions) => show('error', title, opts),
  warning: (title: string, opts?: ToastOptions) => show('warning', title, opts),
  info: (title: string, opts?: ToastOptions) => show('info', title, opts),
  loading: (title: string, opts?: ToastOptions) => show('loading', title, opts),
  update: (id: string, patch: Partial<Omit<ToastItem, 'id'>>) => {
    useToastStore.getState().update(id, patch);
  },
  dismiss: (id: string) => {
    useToastStore.getState().dismiss(id);
  },
};
