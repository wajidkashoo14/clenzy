'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { ShoppingCart, X } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { ItemRow } from '@/components/cart/ItemRow';
import { removeWithUndo } from '@/features/cart/undoRemove';
import { cn } from '@/lib/cn';
import { formatRupees } from '@/lib/format';
import { useCartStore } from '@/stores/cartStore';

/** Right-side drawer — same CSS/data-state animation pattern as components/layout/MobileNav.tsx. */
export function CartDrawer(): ReactNode {
  const isOpen = useCartStore((state) => state.isDrawerOpen);
  const closeDrawer = useCartStore((state) => state.closeDrawer);
  const lines = useCartStore((state) => state.lines);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const estimate = useCartStore((state) => state.estimate);
  const isEstimating = useCartStore((state) => state.isEstimating);
  const estimateError = useCartStore((state) => state.estimateError);

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => (open ? undefined : closeDrawer())}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-[rgba(32,33,30,0.45)]',
            'data-[state=open]:animate-[dialog-overlay-in_var(--duration-base)_var(--ease-standard)]',
            'data-[state=closed]:animate-[dialog-overlay-out_var(--duration-fast)_var(--ease-in)]',
          )}
        />

        <Dialog.Content
          className={cn(
            'bg-surface fixed inset-y-0 right-0 z-50 flex w-[85vw] max-w-sm flex-col overflow-y-auto shadow-lg',
            'data-[state=open]:animate-[drawer-in_var(--duration-slow)_var(--ease-out)]',
            'data-[state=closed]:animate-[drawer-out_var(--duration-fast)_var(--ease-in)]',
          )}
        >
          <div className="border-border flex items-center justify-between border-b p-4">
            <Dialog.Title className="text-text text-base font-semibold">Your cart</Dialog.Title>
            <Dialog.Close
              aria-label="Close cart"
              className="text-text-muted duration-fast ease-standard hover:bg-surface-alt hover:text-text focus-visible:shadow-focus flex size-9 items-center justify-center rounded-full transition-colors focus-visible:outline-none"
            >
              <X className="size-4" aria-hidden="true" />
            </Dialog.Close>
          </div>

          {lines.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="Your cart is empty"
              description="Browse our services and add items to get started."
              action={{ label: 'Browse services', onClick: closeDrawer }}
            />
          ) : (
            <>
              <div className="divide-border flex-1 divide-y">
                {lines.map((line) => (
                  <ItemRow
                    key={line.serviceItemId}
                    name={line.name}
                    careNote={line.careNote}
                    unit={line.unit}
                    unitPrice={
                      estimate?.items.find((i) => i.serviceItemId === line.serviceItemId)
                        ?.unitPrice ?? 0
                    }
                    quantity={line.quantity}
                    onQuantityChange={(quantity) => {
                      if (quantity <= 0) removeWithUndo(line);
                      else updateQuantity(line.serviceItemId, quantity);
                    }}
                  />
                ))}
              </div>

              <div className="border-border flex flex-col gap-3 border-t p-4">
                {isEstimating && !estimate ? (
                  <div className="flex justify-center py-2">
                    <Spinner size="sm" />
                  </div>
                ) : estimateError ? (
                  <p className="text-error text-sm">{estimateError}</p>
                ) : (
                  estimate && (
                    <div className="flex flex-col gap-1.5 text-sm">
                      <div className="text-text-muted flex justify-between">
                        <span>Subtotal</span>
                        <span className="tabular-nums">{formatRupees(estimate.itemsSubtotal)}</span>
                      </div>
                      {estimate.expressSurcharge > 0 && (
                        <div className="text-text-muted flex justify-between">
                          <span>Express surcharge</span>
                          <span className="tabular-nums">
                            {formatRupees(estimate.expressSurcharge)}
                          </span>
                        </div>
                      )}
                      <div className="text-text-muted flex justify-between">
                        <span>Delivery</span>
                        <span className="tabular-nums">
                          {estimate.deliveryFee === 0 ? 'Free' : formatRupees(estimate.deliveryFee)}
                        </span>
                      </div>
                      {estimate.taxTotal > 0 && (
                        <div className="text-text-muted flex justify-between">
                          <span>Tax</span>
                          <span className="tabular-nums">{formatRupees(estimate.taxTotal)}</span>
                        </div>
                      )}
                      <div className="text-text mt-1 flex justify-between font-semibold">
                        <span>Total</span>
                        <span className="tabular-nums">{formatRupees(estimate.grandTotal)}</span>
                      </div>

                      {!estimate.meetsMinimumOrder && (
                        <p className="text-warning mt-1 text-[13px]">
                          Add {formatRupees(estimate.minOrderValue - estimate.itemsSubtotal)} more
                          to reach the ₹{estimate.minOrderValue / 100} minimum order.
                        </p>
                      )}
                    </div>
                  )
                )}

                <Button asChild size="lg" className="w-full" onClick={closeDrawer}>
                  <Link href="/cart">View cart</Link>
                </Button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
