'use client';

import type { DashboardQuery, DashboardResult } from '@clenzy/shared';
import { AlertTriangle, ArrowDown, ArrowUp, Package, Truck, Users, Wrench } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { getDashboard } from '@/features/admin/api';
import { ApiError } from '@/lib/api-client';
import { formatRupees } from '@/lib/format';

const RANGE_OPTIONS: { value: DashboardQuery['range']; label: string }[] = [
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
];

const DONUT_COLORS = [
  'var(--color-primary)',
  'var(--color-secondary)',
  'var(--color-accent)',
  'var(--color-success)',
  'var(--color-warning)',
  'var(--color-error)',
  'var(--color-info)',
];

function Delta({ current, previous }: { current: number; previous: number }): ReactNode {
  if (previous === 0 && current === 0) return null;
  const pct = previous === 0 ? 100 : Math.round(((current - previous) / previous) * 100);
  const isUp = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold ${isUp ? 'text-success' : 'text-error'}`}
    >
      {isUp ? (
        <ArrowUp className="size-3" aria-hidden="true" />
      ) : (
        <ArrowDown className="size-3" aria-hidden="true" />
      )}
      {Math.abs(pct)}%
    </span>
  );
}

function StatCard({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta?: { current: number; previous: number };
}): ReactNode {
  return (
    <Card padding="sm" className="flex flex-col gap-1">
      <span className="text-text-muted text-xs font-medium tracking-wide uppercase">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-text text-2xl font-semibold tabular-nums">{value}</span>
        {delta && <Delta current={delta.current} previous={delta.previous} />}
      </div>
    </Card>
  );
}

interface LoadedResult {
  requestKey: DashboardQuery['range'];
  data?: DashboardResult;
  error?: string;
}

export function DashboardContent(): ReactNode {
  const [range, setRange] = useState<DashboardQuery['range']>('week');
  const [result, setResult] = useState<LoadedResult | null>(null);

  useEffect(() => {
    getDashboard(range)
      .then((data) => setResult({ requestKey: range, data }))
      .catch((err: unknown) =>
        setResult({
          requestKey: range,
          error: err instanceof ApiError ? err.message : 'Could not load the dashboard.',
        }),
      );
  }, [range]);

  const isLoading = result === null || result.requestKey !== range;
  const data = !isLoading ? result.data : undefined;
  const error = !isLoading ? result.error : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-text text-xl font-semibold">Dashboard</h1>
        <Tabs value={range} onValueChange={(v) => setRange(v as DashboardQuery['range'])}>
          <TabsList>
            {RANGE_OPTIONS.map((opt) => (
              <TabsTrigger key={opt.value} value={opt.value}>
                {opt.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {error && <ErrorState title="Couldn't load the dashboard" description={error} />}

      {isLoading && !error && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <StatCard
              label="Revenue"
              value={formatRupees(data.stats.revenue.current)}
              delta={data.stats.revenue}
            />
            <StatCard
              label="Orders placed"
              value={String(data.stats.ordersPlaced.current)}
              delta={data.stats.ordersPlaced}
            />
            <StatCard
              label="New customers"
              value={String(data.stats.newCustomers.current)}
              delta={data.stats.newCustomers}
            />
            <StatCard
              label="Avg. order value"
              value={formatRupees(data.stats.averageOrderValue.current)}
              delta={data.stats.averageOrderValue}
            />
            <StatCard label="Pending payments" value={String(data.stats.pendingPayments)} />
            <StatCard label="Needs attention" value={String(data.stats.ordersNeedingAttention)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="flex flex-col gap-3 lg:col-span-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-warning size-4" aria-hidden="true" />
                <h2 className="text-text text-sm font-semibold">Needs attention</h2>
              </div>
              {data.needsAttention.length === 0 ? (
                <p className="text-text-muted py-6 text-center text-sm">
                  Nothing needs attention right now.
                </p>
              ) : (
                <ul className="divide-border flex flex-col divide-y">
                  {data.needsAttention.map((item) => (
                    <li key={item.key} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="text-text text-sm">{item.label}</span>
                      <Link
                        href={
                          item.key === 'unmoderated_reviews'
                            ? '/admin/orders'
                            : `/admin/orders?needsAttention=true`
                        }
                        className="bg-warning-soft text-warning shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      >
                        {item.count}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="flex flex-col gap-3">
              <h2 className="text-text text-sm font-semibold">Today at a glance</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Package className="text-secondary size-4 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-text text-lg font-semibold tabular-nums">
                      {data.today.pickupsDue}
                    </p>
                    <p className="text-text-muted text-xs">Pickups due</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="text-primary size-4 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-text text-lg font-semibold tabular-nums">
                      {data.today.deliveriesDue}
                    </p>
                    <p className="text-text-muted text-xs">Deliveries due</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Wrench className="text-accent size-4 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-text text-lg font-semibold tabular-nums">
                      {data.today.inFacility}
                    </p>
                    <p className="text-text-muted text-xs">In facility</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="text-success size-4 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-text text-lg font-semibold tabular-nums">
                      {data.today.agentsOnShift}
                    </p>
                    <p className="text-text-muted text-xs">Agents on shift</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="flex flex-col gap-3 lg:col-span-2">
              <h2 className="text-text text-sm font-semibold">Revenue over time</h2>
              {data.charts.revenueOverTime.length === 0 ? (
                <EmptyState
                  title="No revenue yet"
                  description="Revenue will chart here once orders come in."
                />
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.charts.revenueOverTime}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                        tickFormatter={(v: number) => formatRupees(v)}
                        width={70}
                      />
                      <Tooltip formatter={(v) => formatRupees(Number(v))} />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="var(--color-primary)"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card className="flex flex-col gap-3">
              <h2 className="text-text text-sm font-semibold">Orders by status</h2>
              {data.charts.ordersByStatus.length === 0 ? (
                <EmptyState title="No orders yet" description="" />
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.charts.ordersByStatus}
                        dataKey="count"
                        nameKey="status"
                        innerRadius="55%"
                        outerRadius="80%"
                      >
                        {data.charts.ordersByStatus.map((entry, i) => (
                          <Cell key={entry.status} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>

          <Card className="flex flex-col gap-3">
            <h2 className="text-text text-sm font-semibold">Popular services (by revenue)</h2>
            {data.charts.popularServices.length === 0 ? (
              <EmptyState title="No items sold yet" description="" />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.charts.popularServices}
                    layout="vertical"
                    margin={{ left: 24 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border)"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tickFormatter={(v: number) => formatRupees(v)}
                      tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                    />
                    <Tooltip formatter={(v) => formatRupees(Number(v))} />
                    <Bar dataKey="revenue" fill="var(--color-secondary)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
