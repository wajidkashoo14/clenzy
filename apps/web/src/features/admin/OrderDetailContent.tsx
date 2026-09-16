'use client';

import { hasRole, ORDER_STATUS_LABELS, type OrderStatus } from '@clenzy/shared';
import { AlertTriangle, MapPin, MessageCircle, Phone } from 'lucide-react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusPill } from '@/components/ui/StatusPill';
import { Textarea } from '@/components/ui/Textarea';
import {
  addInternalNoteAdmin,
  assignAgentAdmin,
  cancelOrderAdmin,
  getOrderAdmin,
  listAgents,
  refundOrderAdmin,
  rescheduleOrderAdmin,
  reviseOrderItemsAdmin,
  updateOrderStatusAdmin,
} from '@/features/admin/api';
import type { AdminOrderDetail } from '@/features/admin/types';
import { useSlotWindows } from '@/features/admin/useSlotWindows';
import { ApiError } from '@/lib/api-client';
import { formatDateTime, formatRupees, formatSlotDate, formatSlotWindow } from '@/lib/format';
import { ORDER_STATUS_META, PAYMENT_STATUS_META } from '@/lib/orderStatus';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/stores/authStore';

function mapsHref(order: AdminOrderDetail['pickupAddress']): string {
  const query = `${order.line1}, ${order.area}, ${order.city} ${order.pincode}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** A reason-required confirm dialog, shared shape for cancel/refund/status-move actions. */
function ReasonModal({
  open,
  onOpenChange,
  title,
  confirmLabel,
  danger,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: (reason: string) => Promise<void>;
}): ReactNode {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm(): Promise<void> {
    if (!reason.trim()) return;
    setIsSubmitting(true);
    try {
      await onConfirm(reason.trim());
      setReason('');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title}>
      <div className="flex flex-col gap-4">
        <Textarea
          label="Reason"
          required
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Back
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            disabled={!reason.trim()}
            isLoading={isSubmitting}
            onClick={() => void handleConfirm()}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function RescheduleModal({
  open,
  onOpenChange,
  type,
  pincode,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'pickup' | 'delivery';
  pincode: string;
  onConfirm: (date: string, window: string) => Promise<void>;
}): ReactNode {
  const [date, setDate] = useState('');
  const [window, setWindow] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { windows, isLoading } = useSlotWindows(pincode, date, type);

  async function handleConfirm(): Promise<void> {
    if (!date || !window) return;
    setIsSubmitting(true);
    try {
      await onConfirm(date, window);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not reschedule.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={`Reschedule ${type}`}>
      <div className="flex flex-col gap-4">
        <Input
          label="New date"
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setWindow('');
          }}
        />
        <Select
          label="Window"
          options={windows.map((w) => ({ value: w.window, label: w.label }))}
          value={window}
          onValueChange={setWindow}
          placeholder={isLoading ? 'Loading…' : 'Select a window'}
          disabled={windows.length === 0}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Back
          </Button>
          <Button
            disabled={!date || !window}
            isLoading={isSubmitting}
            onClick={() => void handleConfirm()}
          >
            Reschedule
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ItemsPricingPanel({
  order,
  onRevised,
}: {
  order: AdminOrderDetail;
  onRevised: () => void;
}): ReactNode {
  const [items, setItems] = useState<
    { serviceItemId: string; quantity: number; unitPrice: number; name: string }[]
  >(
    order.items.map((i) => ({
      serviceItemId: i.serviceItemId,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      name: i.name,
    })),
  );
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const newSubtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const originalSubtotal = order.items.reduce((sum, i) => sum + i.lineTotal, 0);
  const hasChanges = newSubtotal !== originalSubtotal || items.length !== order.items.length;

  async function handleSave(): Promise<void> {
    if (!reason.trim()) return;
    setIsSubmitting(true);
    try {
      await reviseOrderItemsAdmin(order._id, {
        items: items.map((i) => ({
          serviceItemId: i.serviceItemId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        reason: reason.trim(),
      });
      toast.success('Items revised');
      setReason('');
      onRevised();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not revise items.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-text text-sm font-semibold">Items &amp; pricing</h2>
      <div className="divide-border flex flex-col divide-y">
        {items.map((item, index) => (
          <div
            key={item.serviceItemId + index}
            className="flex items-center justify-between gap-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="text-text truncate text-sm">{item.name}</p>
              <p className="text-text-muted text-xs">{formatRupees(item.unitPrice)} each</p>
            </div>
            <QuantityStepper
              value={item.quantity}
              onChange={(q) =>
                setItems((prev) => prev.map((it, i) => (i === index ? { ...it, quantity: q } : it)))
              }
              min={0}
              max={99}
              aria-label={`Quantity for ${item.name}`}
            />
            <span className="w-20 shrink-0 text-right text-sm tabular-nums">
              {formatRupees(item.unitPrice * item.quantity)}
            </span>
          </div>
        ))}
      </div>

      <div className="border-border flex flex-col gap-1 border-t pt-3 text-sm">
        <div className="flex justify-between">
          <span className="text-text-muted">Items subtotal</span>
          <span className={hasChanges ? 'text-warning font-semibold' : ''}>
            {formatRupees(newSubtotal)}
          </span>
        </div>
        {hasChanges && (
          <p className="text-text-muted text-xs">
            Was {formatRupees(originalSubtotal)}. Saving may require the customer&apos;s approval if
            the increase exceeds the configured threshold.
          </p>
        )}
      </div>

      {hasChanges && (
        <div className="border-border flex flex-col gap-2 border-t pt-3">
          <Textarea
            label="Reason for change"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
          />
          <Button
            size="sm"
            className="self-start"
            disabled={!reason.trim()}
            isLoading={isSubmitting}
            onClick={() => void handleSave()}
          >
            Save revision
          </Button>
        </div>
      )}

      {order.priceRevision?.requiresApproval && (
        <div className="bg-warning-soft flex items-center gap-2 rounded-md p-3 text-sm">
          <AlertTriangle className="text-warning size-4 shrink-0" aria-hidden="true" />
          <span>
            A revision to {formatRupees(order.priceRevision.revisedTotal)} is awaiting the
            customer&apos;s approval.
          </span>
        </div>
      )}
    </Card>
  );
}

export function OrderDetailContent({ id }: { id: string }): ReactNode {
  const currentUser = useAuthStore((s) => s.user);
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agents, setAgents] = useState<{ id: string; name?: string; phone?: string }[]>([]);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [rescheduling, setRescheduling] = useState<'pickup' | 'delivery' | null>(null);
  const [noteText, setNoteText] = useState('');
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [statusSubmitting, setStatusSubmitting] = useState<OrderStatus | null>(null);

  const load = useCallback(() => {
    getOrderAdmin(id)
      .then(({ order: o }) => setOrder(o))
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'Could not load this order.'),
      );
  }, [id]);

  useEffect(() => {
    load();
    listAgents()
      .then(({ agents: a }) => setAgents(a))
      .catch(() => setAgents([]));
  }, [load]);

  if (error) return <ErrorState title="Couldn't load this order" description={error} />;
  if (!order) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const statusMeta = ORDER_STATUS_META[order.status];
  const paymentMeta = PAYMENT_STATUS_META[order.paymentStatus];
  const isAdmin = currentUser && hasRole(currentUser.role, 'admin');

  async function handleStatusChange(status: OrderStatus): Promise<void> {
    setStatusSubmitting(status);
    try {
      await updateOrderStatusAdmin(order!._id, { status });
      toast.success(`Order moved to ${ORDER_STATUS_LABELS[status]}`);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update status.');
    } finally {
      setStatusSubmitting(null);
    }
  }

  async function handleAddNote(): Promise<void> {
    if (!noteText.trim()) return;
    setNoteSubmitting(true);
    try {
      await addInternalNoteAdmin(order!._id, { note: noteText.trim() });
      setNoteText('');
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not add note.');
    } finally {
      setNoteSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-text text-xl font-semibold">{order.orderNumber}</h1>
            <StatusPill label={statusMeta.label} color={statusMeta.color} icon={statusMeta.icon} />
            <StatusPill
              label={paymentMeta.label}
              color={paymentMeta.color}
              icon={paymentMeta.icon}
            />
            {order.isExpress && <Badge color="accent">Express</Badge>}
            <Badge color="neutral" className="capitalize">
              {order.source}
            </Badge>
          </div>
          <p className="text-text-muted text-xs">Created {formatDateTime(order.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {order.availableTransitions.map((status) =>
            status === 'CANCELLED' ? (
              <Button
                key={status}
                size="sm"
                variant="secondary"
                onClick={() => setCancelOpen(true)}
              >
                Cancel order
              </Button>
            ) : (
              <Button
                key={status}
                size="sm"
                isLoading={statusSubmitting === status}
                onClick={() => void handleStatusChange(status)}
              >
                Move to {ORDER_STATUS_LABELS[status]}
              </Button>
            ),
          )}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-2">
          <h2 className="text-text text-sm font-semibold">Customer</h2>
          <p className="text-text text-sm">{order.pickupAddress.contactName}</p>
          <div className="flex gap-3">
            <a
              href={`tel:${order.pickupAddress.contactPhone}`}
              className="text-primary inline-flex items-center gap-1 text-sm"
            >
              <Phone className="size-3.5" aria-hidden="true" />
              Call
            </a>
            <a
              href={`https://wa.me/${order.pickupAddress.contactPhone.replace(/[^\d]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="text-primary inline-flex items-center gap-1 text-sm"
            >
              <MessageCircle className="size-3.5" aria-hidden="true" />
              WhatsApp
            </a>
          </div>
          <p className="text-text-muted text-xs">
            Full customer profile (lifetime orders, value) isn&apos;t available yet — that&apos;s
            part of the customer management screen (docs/ADMIN_DASHBOARD.md §4, not yet built).
          </p>
        </Card>

        <Card className="flex flex-col gap-2">
          <h2 className="text-text text-sm font-semibold">Assignment</h2>
          <Select
            label="Pickup agent"
            options={agents.map((a) => ({ value: a.id, label: a.name ?? a.phone ?? 'Agent' }))}
            value={order.assignedPickupAgentId ?? ''}
            placeholder="Unassigned"
            onValueChange={(agentId) =>
              assignAgentAdmin(order!._id, { type: 'pickup', agentId })
                .then(() => load())
                .catch((err: unknown) =>
                  toast.error(err instanceof ApiError ? err.message : 'Could not assign agent.'),
                )
            }
          />
          <Select
            label="Delivery agent"
            options={agents.map((a) => ({ value: a.id, label: a.name ?? a.phone ?? 'Agent' }))}
            value={order.assignedDeliveryAgentId ?? ''}
            placeholder="Unassigned"
            onValueChange={(agentId) =>
              assignAgentAdmin(order!._id, { type: 'delivery', agentId })
                .then(() => load())
                .catch((err: unknown) =>
                  toast.error(err instanceof ApiError ? err.message : 'Could not assign agent.'),
                )
            }
          />
        </Card>

        <Card className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-text text-sm font-semibold">Pickup</h2>
            <Button size="sm" variant="ghost" onClick={() => setRescheduling('pickup')}>
              Reschedule
            </Button>
          </div>
          <p className="text-text text-sm">
            {formatSlotDate(order.pickupSlot.date)} · {formatSlotWindow(order.pickupSlot.window)}
          </p>
          <div className="flex items-start gap-1.5 text-sm">
            <MapPin className="text-text-muted mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <p className="text-text-muted">
              {order.pickupAddress.line1}
              {order.pickupAddress.landmark && `, near ${order.pickupAddress.landmark}`},{' '}
              {order.pickupAddress.area}, {order.pickupAddress.city} – {order.pickupAddress.pincode}
            </p>
          </div>
          <a
            href={mapsHref(order.pickupAddress)}
            target="_blank"
            rel="noreferrer"
            className="text-primary text-xs underline"
          >
            Open in Maps
          </a>
        </Card>

        <Card className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-text text-sm font-semibold">Delivery</h2>
            <Button size="sm" variant="ghost" onClick={() => setRescheduling('delivery')}>
              Reschedule
            </Button>
          </div>
          <p className="text-text text-sm">
            {formatSlotDate(order.deliverySlot.date)} ·{' '}
            {formatSlotWindow(order.deliverySlot.window)}
          </p>
          <div className="flex items-start gap-1.5 text-sm">
            <MapPin className="text-text-muted mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <p className="text-text-muted">
              {order.deliveryAddress.line1}
              {order.deliveryAddress.landmark && `, near ${order.deliveryAddress.landmark}`},{' '}
              {order.deliveryAddress.area}, {order.deliveryAddress.city} –{' '}
              {order.deliveryAddress.pincode}
            </p>
          </div>
          <a
            href={mapsHref(order.deliveryAddress)}
            target="_blank"
            rel="noreferrer"
            className="text-primary text-xs underline"
          >
            Open in Maps
          </a>
        </Card>
      </div>

      <ItemsPricingPanel order={order} onRevised={load} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-2">
          <h2 className="text-text text-sm font-semibold">Payment</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-text-muted">Method</span>
            <span className="text-text capitalize">{order.paymentMethod}</span>
            <span className="text-text-muted">Amount paid</span>
            <span className="text-text">{formatRupees(order.pricing.amountPaid)}</span>
            <span className="text-text-muted">Amount refunded</span>
            <span className="text-text">{formatRupees(order.pricing.amountRefunded)}</span>
            <span className="text-text-muted">Grand total</span>
            <span className="text-text font-semibold">
              {formatRupees(order.pricing.grandTotal)}
            </span>
          </div>
          {isAdmin ? (
            <Button
              size="sm"
              variant="secondary"
              className="self-start"
              onClick={() => setRefundOpen(true)}
            >
              Refund
            </Button>
          ) : (
            <p className="text-text-muted text-xs">Refunds require an admin account.</p>
          )}
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="text-text text-sm font-semibold">Status timeline</h2>
          <ul className="flex flex-col gap-2">
            {order.statusHistory
              .slice()
              .reverse()
              .map((event, i) => (
                <li key={i} className="border-border flex flex-col gap-0.5 border-l-2 pl-3 text-sm">
                  <span className="text-text font-medium">
                    {ORDER_STATUS_LABELS[event.status as OrderStatus] ?? event.status}
                  </span>
                  <span className="text-text-muted text-xs">
                    {formatDateTime(event.at)} · {event.changedByRole}
                    {event.note && ` — ${event.note}`}
                  </span>
                </li>
              ))}
          </ul>
        </Card>
      </div>

      <Card className="flex flex-col gap-3">
        <h2 className="text-text text-sm font-semibold">Internal notes</h2>
        <p className="text-text-muted text-xs">Never visible to the customer.</p>
        <ul className="divide-border flex flex-col divide-y">
          {order.internalNotes.map((note, i) => (
            <li key={i} className="py-2 text-sm">
              <p className="text-text">{note.note}</p>
              <p className="text-text-muted text-xs">{formatDateTime(note.at)}</p>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Textarea
            label=""
            placeholder="Add a note…"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            maxLength={1000}
            className="flex-1"
          />
        </div>
        <Button
          size="sm"
          className="self-start"
          disabled={!noteText.trim()}
          isLoading={noteSubmitting}
          onClick={() => void handleAddNote()}
        >
          Add note
        </Button>
      </Card>

      {order.customerNote && (
        <Card className="flex flex-col gap-1">
          <h2 className="text-text text-sm font-semibold">Customer note</h2>
          <p className="text-text-muted text-sm italic">&ldquo;{order.customerNote}&rdquo;</p>
        </Card>
      )}

      <ReasonModal
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel order"
        confirmLabel="Cancel order"
        danger
        onConfirm={async (reason) => {
          await cancelOrderAdmin(order!._id, { reason });
          toast.success('Order cancelled');
          load();
        }}
      />

      <ReasonModal
        open={refundOpen}
        onOpenChange={setRefundOpen}
        title="Refund order"
        confirmLabel="Refund"
        danger
        onConfirm={async (reason) => {
          await refundOrderAdmin(order!._id, { reason });
          toast.success('Refund initiated');
          load();
        }}
      />

      {rescheduling && (
        <RescheduleModal
          open={Boolean(rescheduling)}
          onOpenChange={(open) => !open && setRescheduling(null)}
          type={rescheduling}
          pincode={
            rescheduling === 'pickup' ? order.pickupAddress.pincode : order.deliveryAddress.pincode
          }
          onConfirm={async (date, window) => {
            await rescheduleOrderAdmin(order!._id, { type: rescheduling, date, window });
            toast.success('Rescheduled');
            load();
          }}
        />
      )}
    </div>
  );
}
