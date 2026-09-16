import type { CartEstimateResult } from '@clenzy/shared';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartLine {
  serviceItemId: string;
  name: string;
  unit: 'piece' | 'kg' | 'sqft' | 'set' | 'pair';
  careNote?: string;
  quantity: number;
}

interface CartState {
  lines: CartLine[];
  isDrawerOpen: boolean;
  isExpress: boolean;
  /** Server-priced breakdown for the current `lines` — see features/cart/CartEstimateSync.tsx. Never computed client-side. */
  estimate: CartEstimateResult | null;
  isEstimating: boolean;
  estimateError: string | null;
  /**
   * The lines+express key `estimate` was priced for. Runtime-only (the
   * `partialize` below omits it from localStorage) — lets CartEstimateSync
   * skip refetching after a remount when nothing actually changed, e.g. a
   * dev Fast Refresh remounting the layout component.
   */
  pricedKey: string | null;

  itemCount: () => number;
  addItem: (line: Omit<CartLine, 'quantity'>, quantity: number) => void;
  updateQuantity: (serviceItemId: string, quantity: number) => void;
  removeItem: (serviceItemId: string) => void;
  clear: () => void;
  setExpress: (isExpress: boolean) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  setEstimate: (
    estimate: CartEstimateResult | null,
    error: string | null,
    key: string | null,
  ) => void;
  setEstimating: (isEstimating: boolean) => void;
}

/**
 * Client-only cart — see docs/DEVELOPMENT_PLAN.md Phase 6. There's no
 * `carts` collection in docs/DATABASE.md, so this store (persisted to
 * localStorage) is the only source of truth for BOTH guest and logged-in
 * users; the server is only ever asked to price it (`POST
 * /cart/estimate`), never to store it. `estimate` is refreshed by
 * features/cart/CartEstimateSync.tsx whenever `lines`/`isExpress` change —
 * every total shown in the UI reads from `estimate`, never computed here.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      isDrawerOpen: false,
      isExpress: false,
      estimate: null,
      isEstimating: false,
      estimateError: null,
      pricedKey: null,

      itemCount: () => get().lines.reduce((sum, line) => sum + line.quantity, 0),

      addItem: (line, quantity) =>
        set((state) => {
          const existing = state.lines.find((l) => l.serviceItemId === line.serviceItemId);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.serviceItemId === line.serviceItemId
                  ? { ...l, quantity: l.quantity + quantity }
                  : l,
              ),
            };
          }
          return { lines: [...state.lines, { ...line, quantity }] };
        }),

      updateQuantity: (serviceItemId, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => l.serviceItemId !== serviceItemId)
              : state.lines.map((l) =>
                  l.serviceItemId === serviceItemId ? { ...l, quantity } : l,
                ),
        })),

      removeItem: (serviceItemId) =>
        set((state) => ({ lines: state.lines.filter((l) => l.serviceItemId !== serviceItemId) })),

      clear: () => set({ lines: [] }),
      setExpress: (isExpress) => set({ isExpress }),
      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
      setEstimate: (estimate, error, key) =>
        set({ estimate, estimateError: error, pricedKey: key }),
      setEstimating: (isEstimating) => set({ isEstimating }),
    }),
    {
      name: 'clenzy-cart',
      partialize: (state) => ({ lines: state.lines, isExpress: state.isExpress }),
    },
  ),
);
