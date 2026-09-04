'use client';

import type { OrderPayload, OrderStatus } from '@clenzy/shared';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Spinner } from '@/components/ui/Spinner';
import { StatusPill } from '@/components/ui/StatusPill';
import { getOrder } from '@/features/checkout/api';
import { ApiError } from '@/lib/api-client';
import { formatRupees, formatSlotDate, formatSlotWindow } from '@/lib/format';
import { ORDER_STATUS_META } from '@/lib/orderStatus';
import { useCartStore } from '@/stores/cartStore';

export function ConfirmationContent({ orderNumber }: { orderNumber: string }): ReactNode {
  const [order, setOrder] = useState<OrderPayload | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    getOrder(orderNumber)
      .then(({ order: loaded }) => {
        if (cancelled) return;
        setOrder(loaded);
        // Cleared here, once the just-placed order is confirmed to exist server-side —
        // see CheckoutWizard.tsx for why it isn't cleared at place-order time instead.
        useCartStore.getState().clear();
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Could not load your order.');
      });
    return () => {
      cancelled = true;
    };
  }, [orderNumber]);

  if (error) {
    return <ErrorState title="Couldn't load this order" description={error} />;
  }

  if (!order) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const statusMeta = ORDER_STATUS_META[order.status as OrderStatus];

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex flex-col items-center text-center">
        <CheckCircle2 className="text-success size-14" aria-hidden="true" />
        <h1 className="font-heading text-text mt-4 text-2xl font-semibold sm:text-3xl">
          Order placed!
        </h1>
        <p className="text-text-muted mt-2 text-sm">
          Your order <span className="text-text font-semibold">{order.orderNumber}</span> is
          confirmed.
        </p>
        <StatusPill
          label={statusMeta.label}
          color={statusMeta.color}
          icon={statusMeta.icon}
          className="mt-3"
        />
      </div>

      <div className="border-border mt-8 rounded-lg border p-5">
        <h2 className="text-text text-sm font-semibold">Items</h2>
        <div className="border-border divide-border mt-2 divide-y rounded-lg border">
          {order.items.map((item) => (
            <div key={item.serviceItemId} className="flex justify-between px-4 py-2.5 text-sm">
              <span className="text-text">
                {item.name} × {item.quantity}
              </span>
              <span className="text-text-muted tabular-nums">{formatRupees(item.lineTotal)}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <h3 className="text-text text-sm font-semibold">Pickup</h3>
            <p className="text-text-muted mt-1 text-sm">
              {formatSlotDate(order.pickupSlot.date)}, {formatSlotWindow(order.pickupSlot.window)}
            </p>
          </div>
          <div>
            <h3 className="text-text text-sm font-semibold">Delivery</h3>
            <p className="text-text-muted mt-1 text-sm">
              {formatSlotDate(order.deliverySlot.date)},{' '}
              {formatSlotWindow(order.deliverySlot.window)}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="text-text text-sm font-semibold">Deliver to</h3>
          <p className="text-text-muted mt-1 text-sm">
            {order.deliveryAddress.contactName} — {order.deliveryAddress.line1},{' '}
            {order.deliveryAddress.area}, {order.deliveryAddress.city} –{' '}
            {order.deliveryAddress.pincode}
          </p>
        </div>

        <div className="border-border mt-4 flex justify-between border-t pt-3 text-base font-semibold">
          <span className="text-text">
            Total ({order.paymentMethod === 'cod' ? 'Cash on delivery' : order.paymentMethod})
          </span>
          <span className="text-text tabular-nums">{formatRupees(order.pricing.grandTotal)}</span>
        </div>
      </div>

      <p className="text-text-muted mt-6 text-center text-sm">
        We&rsquo;ll text and email you as your order moves through pickup, cleaning, and delivery.
      </p>

      <div className="mt-4 flex justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/account">View my orders</Link>
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
