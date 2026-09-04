'use client';

import { ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Switch } from '@/components/ui/Switch';
import { Container } from '@/components/layout/Container';
import { ItemRow } from '@/components/cart/ItemRow';
import { removeWithUndo } from '@/features/cart/undoRemove';
import { formatRupees } from '@/lib/format';
import { useCartStore } from '@/stores/cartStore';

export function CartPageContent(): ReactNode {
  const lines = useCartStore((state) => state.lines);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const isExpress = useCartStore((state) => state.isExpress);
  const setExpress = useCartStore((state) => state.setExpress);
  const estimate = useCartStore((state) => state.estimate);
  const isEstimating = useCartStore((state) => state.isEstimating);
  const estimateError = useCartStore((state) => state.estimateError);

  if (lines.length === 0) {
    return (
      <Container className="py-10 lg:py-16">
        <h1 className="font-heading text-text text-3xl font-semibold sm:text-4xl">Your cart</h1>
        <div className="mt-8">
          <EmptyState
            icon={ShoppingCart}
            title="Your cart is empty"
            description="Browse our services and add exactly what you need."
          />
          <div className="flex justify-center">
            <Button asChild size="lg">
              <Link href="/pricing">Browse services</Link>
            </Button>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-10 lg:py-16">
      <h1 className="font-heading text-text text-3xl font-semibold sm:text-4xl">Your cart</h1>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="border-border divide-border divide-y rounded-lg border">
            {lines.map((line) => (
              <ItemRow
                key={line.serviceItemId}
                name={line.name}
                careNote={line.careNote}
                unit={line.unit}
                unitPrice={
                  estimate?.items.find((i) => i.serviceItemId === line.serviceItemId)?.unitPrice ??
                  0
                }
                quantity={line.quantity}
                onQuantityChange={(quantity) => {
                  if (quantity <= 0) removeWithUndo(line);
                  else updateQuantity(line.serviceItemId, quantity);
                }}
              />
            ))}
          </div>

          <div className="border-border bg-surface-alt mt-4 rounded-lg border p-4">
            <Switch
              label="Express service"
              description="Faster turnaround, a surcharge applies."
              checked={isExpress}
              onCheckedChange={setExpress}
            />
          </div>
        </div>

        <div className="border-border h-fit rounded-lg border p-5">
          <h2 className="text-text text-base font-semibold">Order summary</h2>

          {isEstimating && !estimate ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : estimateError ? (
            <p className="text-error mt-4 text-sm">{estimateError}</p>
          ) : (
            estimate && (
              <>
                <div className="mt-4 flex flex-col gap-1.5 text-sm">
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
                  <div className="border-border text-text mt-2 flex justify-between border-t pt-2 text-base font-semibold">
                    <span>Total</span>
                    <span className="tabular-nums">{formatRupees(estimate.grandTotal)}</span>
                  </div>
                </div>

                {!estimate.meetsMinimumOrder && (
                  <p className="text-warning mt-3 text-[13px]">
                    Add {formatRupees(estimate.minOrderValue - estimate.itemsSubtotal)} more to
                    reach the ₹{estimate.minOrderValue / 100} minimum order.
                  </p>
                )}

                <p className="text-text-muted mt-4 text-[13px]">
                  Online checkout is launching soon. For now, book a pickup and we&rsquo;ll confirm
                  your order directly.
                </p>
                {estimate.meetsMinimumOrder ? (
                  <Button asChild size="lg" className="mt-2 w-full">
                    <Link href="/book">Book a pickup</Link>
                  </Button>
                ) : (
                  <Button size="lg" className="mt-2 w-full" disabled>
                    Book a pickup
                  </Button>
                )}
              </>
            )
          )}
        </div>
      </div>
    </Container>
  );
}
