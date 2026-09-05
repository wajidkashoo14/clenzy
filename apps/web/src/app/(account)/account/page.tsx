'use client';

import type { OrderPayload, OrderStatus } from '@clenzy/shared';
import { TERMINAL_ORDER_STATUSES } from '@clenzy/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { StatusPill } from '@/components/ui/StatusPill';
import { logout } from '@/features/auth/api';
import { listMyOrders } from '@/features/orders/api';
import { formatRupees, formatSlotDate, formatSlotWindow } from '@/lib/format';
import { ORDER_STATUS_META } from '@/lib/orderStatus';
import { useAuthStore } from '@/stores/authStore';

export default function AccountPage() {
  const router = useRouter();
  const { user, status, clear } = useAuthStore();
  const [activeOrder, setActiveOrder] = useState<OrderPayload | null | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    listMyOrders({ pageSize: 10 })
      .then((result) => {
        const active = result.orders.find(
          (order) => !TERMINAL_ORDER_STATUSES.includes(order.status as OrderStatus),
        );
        setActiveOrder(active ?? null);
      })
      .catch(() => setActiveOrder(null));
  }, [user]);

  async function handleLogout(): Promise<void> {
    try {
      await logout();
    } finally {
      // Clear local state regardless of whether the server-side revoke
      // succeeded (e.g. an already-expired access token) — the user should
      // never feel stuck logged in when they clicked "Log out".
      clear();
      router.push('/');
    }
  }

  if (status === 'loading') {
    return <p className="text-text-muted">Loading…</p>;
  }

  if (!user) {
    return <p className="text-text-muted">Your session has expired. Please log in again.</p>;
  }

  const statusMeta = activeOrder ? ORDER_STATUS_META[activeOrder.status as OrderStatus] : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-text text-2xl font-semibold">
          {user.name ? `Hi, ${user.name}` : 'Your account'}
        </h1>
        <p className="text-text-muted mt-1 text-sm">
          {user.phone} · {user.role}
        </p>
      </div>

      {activeOrder === undefined && (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}

      {activeOrder === null && (
        <Card className="flex flex-col items-start gap-3">
          <p className="text-text text-sm font-medium">No active orders right now.</p>
          <Button asChild size="sm">
            <Link href="/book">Book a pickup</Link>
          </Button>
        </Card>
      )}

      {activeOrder && statusMeta && (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-text-muted text-[13px]">Active order</p>
              <p className="text-text text-base font-semibold">{activeOrder.orderNumber}</p>
            </div>
            <StatusPill label={statusMeta.label} color={statusMeta.color} icon={statusMeta.icon} />
          </div>
          <p className="text-text-muted mt-2 text-sm">
            Pickup {formatSlotDate(activeOrder.pickupSlot.date)},{' '}
            {formatSlotWindow(activeOrder.pickupSlot.window)}
            {' · '}
            {formatRupees(activeOrder.pricing.grandTotal)}
          </p>
          <Button asChild size="sm" className="mt-3">
            <Link href={`/account/orders/${activeOrder.orderNumber}`}>Track order</Link>
          </Button>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="secondary" size="sm">
          <Link href="/account/orders">View all orders</Link>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link href="/account/addresses">Manage addresses</Link>
        </Button>
      </div>

      <Button variant="secondary" className="self-start" onClick={() => void handleLogout()}>
        Log out
      </Button>
    </div>
  );
}
