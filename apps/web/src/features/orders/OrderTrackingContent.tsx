'use client';

import type { OrderPayload, OrderStatus, OrderTrackResult } from '@clenzy/shared';
import { Phone, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Spinner } from '@/components/ui/Spinner';
import { StatusPill } from '@/components/ui/StatusPill';
import { getOrder } from '@/features/checkout/api';
import { CancelOrderModal } from '@/features/orders/CancelOrderModal';
import { approveRevision, requestReclean, trackOrder } from '@/features/orders/api';
import { OrderTimeline } from '@/features/orders/OrderTimeline';
import { RescheduleModal } from '@/features/orders/RescheduleModal';
import { ApiError } from '@/lib/api-client';
import { formatRupees, formatSlotDate, formatSlotWindow } from '@/lib/format';
import { ORDER_STATUS_META } from '@/lib/orderStatus';
import { toast } from '@/lib/toast';

const CUSTOMER_CANCELLABLE_STATUSES: OrderStatus[] = [
  'PENDING_PAYMENT',
  'PLACED',
  'CONFIRMED',
  'PICKUP_SCHEDULED',
];
const PICKUP_RESCHEDULABLE_STATUSES: OrderStatus[] = [
  'CONFIRMED',
  'PICKUP_SCHEDULED',
  'PICKUP_FAILED',
];
const DELIVERY_RESCHEDULABLE_STATUSES: OrderStatus[] = [
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERY_FAILED',
];
const RECLEAN_ELIGIBLE_STATUSES: OrderStatus[] = ['DELIVERED', 'COMPLETED'];
const RECLEAN_WINDOW_HOURS = 72;
const MAX_RESCHEDULES = 2;

export function OrderTrackingContent({ orderNumber }: { orderNumber: string }): ReactNode {
  const [order, setOrder] = useState<OrderPayload | null>(null);
  const [track, setTrack] = useState<OrderTrackResult | null>(null);
  const [error, setError] = useState<string>();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRequestingReclean, setIsRequestingReclean] = useState(false);
  // Lazy initializer, not a bare `Date.now()` call in the render body — see
  // https://react.dev/reference/rules/components-and-hooks-must-be-pure. A
  // snapshot at mount is fine here: worst case the re-clean button stays
  // visible a few seconds past the window, and the server re-checks anyway.
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    Promise.all([getOrder(orderNumber), trackOrder(orderNumber)])
      .then(([orderResult, trackResult]) => {
        if (cancelled) return;
        setOrder(orderResult.order);
        setTrack(trackResult);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Could not load this order.');
      });
    return () => {
      cancelled = true;
    };
  }, [orderNumber]);

  async function refreshTrack(): Promise<void> {
    try {
      setTrack(await trackOrder(orderNumber));
    } catch {
      // The order itself already updated — a stale timeline isn't worth surfacing an error for.
    }
  }

  async function handleApproveRevision(): Promise<void> {
    setIsApproving(true);
    try {
      const { order: updated } = await approveRevision(orderNumber);
      setOrder(updated);
      toast.success('Revised total approved');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not approve this revision.');
    } finally {
      setIsApproving(false);
    }
  }

  async function handleRequestReclean(): Promise<void> {
    setIsRequestingReclean(true);
    try {
      const { order: reclean } = await requestReclean(orderNumber);
      toast.success('Re-clean requested', {
        description: `Order ${reclean.orderNumber} created — no charge.`,
      });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not request a re-clean.');
    } finally {
      setIsRequestingReclean(false);
    }
  }

  if (error) return <ErrorState title="Couldn't load this order" description={error} />;

  if (!order || !track) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const status = order.status as OrderStatus;
  const statusMeta = ORDER_STATUS_META[status];
  const canCancel = CUSTOMER_CANCELLABLE_STATUSES.includes(status);
  const canReschedulePickup =
    order.rescheduleCount < MAX_RESCHEDULES && PICKUP_RESCHEDULABLE_STATUSES.includes(status);
  const canRescheduleDelivery =
    order.rescheduleCount < MAX_RESCHEDULES && DELIVERY_RESCHEDULABLE_STATUSES.includes(status);
  const deliveredAt = order.deliveredAt ? new Date(order.deliveredAt) : null;
  const canReclean =
    RECLEAN_ELIGIBLE_STATUSES.includes(status) &&
    deliveredAt !== null &&
    now - deliveredAt.getTime() <= RECLEAN_WINDOW_HOURS * 60 * 60 * 1000;

  const allowedRescheduleTypes: ('pickup' | 'delivery')[] = [
    ...(canReschedulePickup ? (['pickup'] as const) : []),
    ...(canRescheduleDelivery ? (['delivery'] as const) : []),
  ];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-text text-2xl font-semibold">{order.orderNumber}</h1>
            <p className="text-text-muted mt-0.5 text-sm">
              Placed {formatSlotDate(order.pickupSlot.date)}
            </p>
          </div>
          <StatusPill
            label={track.statusLabel || statusMeta.label}
            color={statusMeta.color}
            icon={statusMeta.icon}
          />
        </div>
      </div>

      {order.priceRevision?.requiresApproval && (
        <Card className="border-warning bg-warning-soft">
          <p className="text-text text-sm font-semibold">Revised total needs your approval</p>
          <p className="text-text-muted mt-1 text-sm">{order.priceRevision.reason}</p>
          <p className="text-text mt-2 text-sm">
            <span className="line-through">{formatRupees(order.priceRevision.originalTotal)}</span>{' '}
            <span className="font-semibold">{formatRupees(order.priceRevision.revisedTotal)}</span>
          </p>
          <Button
            size="sm"
            className="mt-3"
            isLoading={isApproving}
            onClick={() => void handleApproveRevision()}
          >
            Approve revised total
          </Button>
        </Card>
      )}

      <Card>
        <OrderTimeline timeline={track.timeline} />
      </Card>

      {track.agent && (
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-text-muted text-[13px]">Your agent</p>
            <p className="text-text text-sm font-medium">{track.agent.name}</p>
          </div>
          <Button asChild variant="secondary" size="sm">
            <a href={`tel:${track.agent.phone}`}>
              <Phone className="size-4" aria-hidden="true" />
              Call
            </a>
          </Button>
        </Card>
      )}

      <Card>
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

        <div className="border-border mt-4 flex justify-between border-t pt-3 text-base font-semibold">
          <span className="text-text">
            Total ({order.paymentMethod === 'cod' ? 'Cash on delivery' : 'Paid online'})
          </span>
          <span className="text-text tabular-nums">{formatRupees(order.pricing.grandTotal)}</span>
        </div>
      </Card>

      {(canCancel || allowedRescheduleTypes.length > 0 || canReclean) && (
        <div className="flex flex-wrap gap-3">
          {allowedRescheduleTypes.length > 0 && (
            <Button variant="secondary" onClick={() => setRescheduleOpen(true)}>
              Reschedule
            </Button>
          )}
          {canReclean && (
            <Button
              variant="secondary"
              isLoading={isRequestingReclean}
              onClick={() => void handleRequestReclean()}
            >
              <Sparkles className="size-4" aria-hidden="true" />
              Request re-clean
            </Button>
          )}
          {canCancel && (
            <Button variant="danger" onClick={() => setCancelOpen(true)}>
              Cancel order
            </Button>
          )}
        </div>
      )}

      <CancelOrderModal
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        orderNumber={order.orderNumber}
        onSuccess={(updated) => {
          setOrder(updated);
          void refreshTrack();
        }}
      />

      {allowedRescheduleTypes.length > 0 && (
        <RescheduleModal
          open={rescheduleOpen}
          onOpenChange={setRescheduleOpen}
          order={order}
          allowedTypes={allowedRescheduleTypes}
          onSuccess={(updated) => {
            setOrder(updated);
            void refreshTrack();
          }}
        />
      )}
    </div>
  );
}
