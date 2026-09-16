'use client';

import { MapPin, Phone, Printer } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { bulkAssignRoster, getRoster, listAgents } from '@/features/admin/api';
import type { AdminOrder } from '@/features/admin/types';
import { ApiError } from '@/lib/api-client';
import { formatRupees, formatSlotDate, formatSlotWindow } from '@/lib/format';
import { toast } from '@/lib/toast';
import { todayInKolkata } from '@/lib/date';

interface LoadedResult {
  requestKey: string;
  orders?: AdminOrder[];
  error?: string;
}

export function RosterContent(): ReactNode {
  const [date, setDate] = useState(todayInKolkata());
  const [type, setType] = useState<'pickup' | 'delivery'>('pickup');
  const [result, setResult] = useState<LoadedResult | null>(null);
  const [agents, setAgents] = useState<{ id: string; name?: string; phone?: string }[]>([]);
  const [assigningWindow, setAssigningWindow] = useState<string | null>(null);

  const requestKey = `${date}|${type}`;

  useEffect(() => {
    getRoster(date, type)
      .then(({ orders }) => setResult({ requestKey, orders }))
      .catch((err: unknown) =>
        setResult({
          requestKey,
          error: err instanceof ApiError ? err.message : 'Could not load the roster.',
        }),
      );
  }, [date, type, requestKey]);

  useEffect(() => {
    listAgents()
      .then(({ agents: a }) => setAgents(a))
      .catch(() => setAgents([]));
  }, []);

  const isLoading = result === null || result.requestKey !== requestKey;
  const orders = !isLoading ? result.orders : undefined;
  const error = !isLoading ? result.error : undefined;

  const grouped = useMemo(() => {
    if (!orders) return [];
    const byWindow = new Map<string, AdminOrder[]>();
    for (const order of orders) {
      const slotWindow = type === 'pickup' ? order.pickupSlot.window : order.deliverySlot.window;
      byWindow.set(slotWindow, [...(byWindow.get(slotWindow) ?? []), order]);
    }
    return [...byWindow.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [orders, type]);

  async function handleBulkAssign(slotWindow: string, agentId: string): Promise<void> {
    setAssigningWindow(slotWindow);
    try {
      await bulkAssignRoster({ date, type, window: slotWindow, agentId });
      toast.success('Agent assigned to the whole window');
      setResult({ requestKey, orders: (await getRoster(date, type)).orders });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not bulk-assign this window.');
    } finally {
      setAssigningWindow(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h1 className="text-text text-xl font-semibold">Today&apos;s Roster</h1>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border-border-strong bg-surface-alt text-text h-9 rounded-md border px-3 text-sm"
            aria-label="Roster date"
          />
          <div className="bg-surface-alt flex rounded-md p-1">
            {(['pickup', 'delivery'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded px-3 py-1 text-sm font-medium capitalize ${
                  type === t ? 'bg-primary text-text-inverse' : 'text-text-muted'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden="true" />
            Print
          </Button>
        </div>
      </div>

      {error && <ErrorState title="Couldn't load the roster" description={error} />}

      {isLoading && !error && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {!isLoading && !error && grouped.length === 0 && (
        <EmptyState
          title={`No ${type === 'pickup' ? 'pickups' : 'deliveries'} scheduled`}
          description={`Nothing found for ${formatSlotDate(date)}.`}
        />
      )}

      {grouped.map(([slotWindow, windowOrders]) => (
        <Card key={slotWindow} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <h2 className="text-text text-sm font-semibold">
              {formatSlotWindow(slotWindow)} · {windowOrders.length} order
              {windowOrders.length === 1 ? '' : 's'}
            </h2>
            <div className="flex items-center gap-2">
              <Select
                label=""
                placeholder={assigningWindow === slotWindow ? 'Assigning…' : 'Assign whole window…'}
                options={agents.map((a) => ({ value: a.id, label: a.name ?? a.phone ?? 'Agent' }))}
                disabled={assigningWindow === slotWindow}
                onValueChange={(agentId) => void handleBulkAssign(slotWindow, agentId)}
                className="w-44"
              />
            </div>
          </div>

          <ul className="divide-border flex flex-col divide-y">
            {windowOrders.map((order) => {
              const address = type === 'pickup' ? order.pickupAddress : order.deliveryAddress;
              return (
                <li
                  key={order._id}
                  className="flex flex-wrap items-start justify-between gap-3 py-2.5 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-text font-medium">
                      {address.contactName} ·{' '}
                      <span className="font-normal">{order.orderNumber}</span>
                    </p>
                    <a
                      href={`tel:${address.contactPhone}`}
                      className="text-primary inline-flex items-center gap-1 text-xs"
                    >
                      <Phone className="size-3" aria-hidden="true" />
                      {address.contactPhone}
                    </a>
                    <div className="text-text-muted mt-0.5 flex items-start gap-1 text-xs">
                      <MapPin className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                      <span>
                        {address.line1}
                        {address.landmark && `, near ${address.landmark}`}, {address.area}
                      </span>
                    </div>
                  </div>
                  <div className="text-text-muted flex flex-col items-end gap-0.5 text-xs">
                    <span>
                      {order.items.length} item{order.items.length === 1 ? '' : 's'}
                    </span>
                    {order.paymentMethod === 'cod' && order.paymentStatus !== 'paid' && (
                      <span className="text-warning font-semibold">
                        COD due {formatRupees(order.pricing.grandTotal)}
                      </span>
                    )}
                    <span>
                      {type === 'pickup'
                        ? (agents.find((a) => a.id === order.assignedPickupAgentId)?.name ??
                          'Unassigned')
                        : (agents.find((a) => a.id === order.assignedDeliveryAgentId)?.name ??
                          'Unassigned')}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      ))}
    </div>
  );
}
