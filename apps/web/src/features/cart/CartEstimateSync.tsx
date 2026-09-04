'use client';

import { useEffect, useRef } from 'react';
import { estimateCart } from '@/features/cart/api';
import { useCartStore } from '@/stores/cartStore';

const DEBOUNCE_MS = 300;

/**
 * Renders nothing — keeps `cartStore.estimate` in sync with `lines`/
 * `isExpress` by re-pricing through the server on every change. Mounted
 * once (see (marketing)/layout.tsx), same pattern as AuthSessionInit.
 * Debounced so rapid quantity-stepper clicks don't fire a request per click.
 */
export function CartEstimateSync(): null {
  const lines = useCartStore((state) => state.lines);
  const isExpress = useCartStore((state) => state.isExpress);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Lines' object identity changes on every store update even when the
  // underlying quantities don't — key on the actual content instead so the
  // effect doesn't re-fire (and re-debounce) for unrelated store changes.
  const linesKey = JSON.stringify(lines.map((l) => [l.serviceItemId, l.quantity]));

  useEffect(() => {
    clearTimeout(debounceTimer.current);
    const { lines: currentLines, setEstimate, setEstimating } = useCartStore.getState();

    if (currentLines.length === 0) {
      setEstimate(null, null);
      return;
    }

    setEstimating(true);
    debounceTimer.current = setTimeout(() => {
      // Re-read at fire time, not the value captured when the effect ran —
      // the debounce window may span more than one store update.
      const { lines: latestLines, isExpress: latestIsExpress } = useCartStore.getState();
      void estimateCart({
        items: latestLines.map((l) => ({ serviceItemId: l.serviceItemId, quantity: l.quantity })),
        isExpress: latestIsExpress,
      })
        .then((result) => useCartStore.getState().setEstimate(result, null))
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : 'Could not price your cart.';
          useCartStore.getState().setEstimate(null, message);
        })
        .finally(() => useCartStore.getState().setEstimating(false));
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounceTimer.current);
  }, [linesKey, isExpress]);

  return null;
}
