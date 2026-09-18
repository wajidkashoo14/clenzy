'use client';

import type { OrderPayload, OrderStatus } from '@clenzy/shared';
import { ORDER_STATUSES } from '@clenzy/shared';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { StatusPill } from '@/components/ui/StatusPill';
import { Table, type TableColumn } from '@/components/ui/Table';
import { listMyOrders } from '@/features/orders/api';
import { ApiError } from '@/lib/api-client';
import { formatDateTime, formatRupees } from '@/lib/format';
import { ORDER_STATUS_META } from '@/lib/orderStatus';

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  ...ORDER_STATUSES.map((status) => ({ value: status, label: ORDER_STATUS_META[status].label })),
];

interface LoadedResult {
  requestKey: string;
  orders?: OrderPayload[];
  total?: number;
  error?: string;
}

export function OrderHistoryContent(): ReactNode {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [result, setResult] = useState<LoadedResult | null>(null);

  const requestKey = `${page}|${status}`;

  useEffect(() => {
    listMyOrders({ page, pageSize: PAGE_SIZE, status: status === 'all' ? undefined : status })
      .then((response) => setResult({ requestKey, orders: response.orders, total: response.total }))
      .catch((err: unknown) =>
        setResult({
          requestKey,
          error: err instanceof ApiError ? err.message : 'Could not load your orders.',
        }),
      );
  }, [requestKey, page, status]);

  const isLoading = result === null || result.requestKey !== requestKey;
  const orders = !isLoading ? result.orders : undefined;
  const total = !isLoading ? (result.total ?? 0) : 0;
  const error = !isLoading ? result.error : undefined;

  const columns: TableColumn<OrderPayload>[] = [
    { key: 'orderNumber', header: 'Order', render: (order) => order.orderNumber },
    {
      key: 'createdAt',
      header: 'Placed',
      render: (order) => formatDateTime(order.createdAt),
    },
    {
      key: 'status',
      header: 'Status',
      render: (order) => {
        const meta = ORDER_STATUS_META[order.status as OrderStatus];
        return <StatusPill label={meta.label} color={meta.color} icon={meta.icon} />;
      },
    },
    {
      key: 'grandTotal',
      header: 'Total',
      className: 'text-right',
      render: (order) => formatRupees(order.pricing.grandTotal),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-text text-2xl font-semibold">Your orders</h1>
        <Select
          label="Filter by status"
          options={STATUS_OPTIONS}
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          className="w-56"
        />
      </div>

      <Table
        columns={columns}
        data={orders ?? []}
        getRowKey={(order) => order.orderNumber}
        isLoading={isLoading}
        errorState={
          error ? <ErrorState title="Couldn't load your orders" description={error} /> : undefined
        }
        emptyState={
          <EmptyState
            title="No orders yet"
            description={
              status === 'all'
                ? 'Book your first pickup to see it here.'
                : 'No orders match this filter.'
            }
          />
        }
        onRowClick={(order) => router.push(`/account/orders/${order.orderNumber}`)}
      />

      <Pagination
        currentPage={page}
        totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        onPageChange={setPage}
      />
    </div>
  );
}
