'use client';

import {
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
  type OrderStatus,
  type PaymentStatus,
} from '@clenzy/shared';
import { Phone, Plus } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { StatusPill } from '@/components/ui/StatusPill';
import type { TableColumn } from '@/components/ui/Table';
import { Table } from '@/components/ui/Table';
import { listOrdersAdmin } from '@/features/admin/api';
import { ManualOrderModal } from '@/features/admin/ManualOrderModal';
import type { AdminOrder, AdminOrderListFilters } from '@/features/admin/types';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { formatDateTime, formatRupees, formatSlotDate, formatSlotWindow } from '@/lib/format';
import { ORDER_STATUS_META, PAYMENT_STATUS_META } from '@/lib/orderStatus';

const PAYMENT_STATUS_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'refund_pending', label: 'Refund pending' },
  { value: 'partially_refunded', label: 'Partially refunded' },
  { value: 'refunded', label: 'Refunded' },
];

function filtersFromSearchParams(params: URLSearchParams): AdminOrderListFilters {
  return {
    status: params.get('status')?.split(',').filter(Boolean),
    paymentStatus: params.get('paymentStatus')?.split(',').filter(Boolean),
    q: params.get('q') ?? undefined,
    isExpress: params.get('isExpress') === 'true',
    hasPriceRevision: params.get('hasPriceRevision') === 'true',
    needsAttention: params.get('needsAttention') === 'true',
    page: Number(params.get('page') ?? '1'),
    pageSize: 20,
  };
}

interface LoadedResult {
  requestKey: string;
  orders?: AdminOrder[];
  total?: number;
  error?: string;
}

export function OrdersListContent(): ReactNode {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<AdminOrderListFilters>(() =>
    filtersFromSearchParams(searchParams),
  );
  const [searchInput, setSearchInput] = useState(filters.q ?? '');
  const [result, setResult] = useState<LoadedResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const requestKey = `${JSON.stringify(filters)}|${refreshTick}`;

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.status?.length) params.set('status', filters.status.join(','));
    if (filters.paymentStatus?.length) params.set('paymentStatus', filters.paymentStatus.join(','));
    if (filters.q) params.set('q', filters.q);
    if (filters.isExpress) params.set('isExpress', 'true');
    if (filters.hasPriceRevision) params.set('hasPriceRevision', 'true');
    if (filters.needsAttention) params.set('needsAttention', 'true');
    if (filters.page && filters.page > 1) params.set('page', String(filters.page));
    router.replace(`/admin/orders${params.toString() ? `?${params.toString()}` : ''}`, {
      scroll: false,
    });

    listOrdersAdmin(filters)
      .then(({ orders, total }) => setResult({ requestKey, orders, total }))
      .catch((err: unknown) =>
        setResult({
          requestKey,
          error: err instanceof ApiError ? err.message : 'Could not load orders.',
        }),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  function updateFilters(patch: Partial<AdminOrderListFilters>): void {
    setFilters((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));
  }

  function toggleStatus(status: OrderStatus): void {
    const current = filters.status ?? [];
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    updateFilters({ status: next });
  }

  const isLoading = result === null || result.requestKey !== requestKey;
  const orders = !isLoading ? result.orders : undefined;
  const error = !isLoading ? result.error : undefined;
  const total = !isLoading ? (result.total ?? 0) : 0;
  const pageSize = filters.pageSize ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const columns: TableColumn<AdminOrder>[] = [
    {
      key: 'orderNumber',
      header: 'Order',
      render: (o) => <span className="font-medium">{o.orderNumber}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (o) => (
        <div className="flex flex-col">
          <span>{o.pickupAddress.contactName}</span>
          <a
            href={`tel:${o.pickupAddress.contactPhone}`}
            onClick={(e) => e.stopPropagation()}
            className="text-primary inline-flex items-center gap-1 text-xs"
          >
            <Phone className="size-3" aria-hidden="true" />
            {o.pickupAddress.contactPhone}
          </a>
        </div>
      ),
    },
    { key: 'items', header: 'Items', mobileLabel: 'Items', render: (o) => String(o.items.length) },
    { key: 'total', header: 'Total', render: (o) => formatRupees(o.pricing.grandTotal) },
    {
      key: 'paymentStatus',
      header: 'Payment',
      render: (o) => {
        const meta = PAYMENT_STATUS_META[o.paymentStatus];
        return <StatusPill label={meta.label} color={meta.color} icon={meta.icon} />;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (o) => {
        const meta = ORDER_STATUS_META[o.status];
        return <StatusPill label={meta.label} color={meta.color} icon={meta.icon} />;
      },
    },
    {
      key: 'pickupSlot',
      header: 'Pickup',
      render: (o) =>
        `${formatSlotDate(o.pickupSlot.date)}, ${formatSlotWindow(o.pickupSlot.window)}`,
    },
    {
      key: 'deliverySlot',
      header: 'Delivery',
      render: (o) =>
        `${formatSlotDate(o.deliverySlot.date)}, ${formatSlotWindow(o.deliverySlot.window)}`,
    },
    { key: 'created', header: 'Created', render: (o) => formatDateTime(o.createdAt) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-text text-xl font-semibold">Orders</h1>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="size-4" aria-hidden="true" />
          Create manual order
        </Button>
      </div>

      <Card padding="sm" className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateFilters({ q: searchInput.trim() || undefined });
            }}
            className="min-w-56 flex-1"
          >
            <Input
              label="Search"
              placeholder="Order number, phone, or name"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </form>
          <div className="min-w-40">
            <Select
              label="Payment status"
              placeholder="All"
              options={PAYMENT_STATUS_OPTIONS}
              value={filters.paymentStatus?.[0] ?? ''}
              onValueChange={(v) => updateFilters({ paymentStatus: v ? [v] : undefined })}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {ORDER_STATUSES.map((status) => {
            const active = filters.status?.includes(status);
            return (
              <button
                key={status}
                type="button"
                onClick={() => toggleStatus(status)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary-soft text-primary'
                    : 'border-border-strong text-text-muted hover:bg-surface-alt',
                )}
              >
                {ORDER_STATUS_LABELS[status]}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-4">
          <Checkbox
            label="Express only"
            checked={filters.isExpress ?? false}
            onCheckedChange={(c) => updateFilters({ isExpress: c === true })}
          />
          <Checkbox
            label="Has price revision"
            checked={filters.hasPriceRevision ?? false}
            onCheckedChange={(c) => updateFilters({ hasPriceRevision: c === true })}
          />
          <Checkbox
            label="Needs attention"
            checked={filters.needsAttention ?? false}
            onCheckedChange={(c) => updateFilters({ needsAttention: c === true })}
          />
        </div>
      </Card>

      <Table
        columns={columns}
        data={orders ?? []}
        getRowKey={(o) => o._id}
        isLoading={isLoading}
        onRowClick={(o) => router.push(`/admin/orders/${o._id}`)}
        errorState={
          error ? <ErrorState title="Couldn't load orders" description={error} /> : undefined
        }
        emptyState={
          <EmptyState
            title="No orders match these filters"
            description="Try widening your search."
          />
        }
      />

      <div className="flex justify-center">
        <Pagination
          currentPage={filters.page ?? 1}
          totalPages={totalPages}
          onPageChange={(page) => updateFilters({ page })}
        />
      </div>

      <ManualOrderModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onCreated={() => setRefreshTick((t) => t + 1)}
      />
    </div>
  );
}
