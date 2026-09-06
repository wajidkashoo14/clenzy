'use client';

import { format, subDays } from 'date-fns';
import { Download } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DatePicker } from '@/components/ui/DatePicker';
import { ErrorState } from '@/components/ui/ErrorState';
import { Spinner } from '@/components/ui/Spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import type { TableColumn } from '@/components/ui/Table';
import { Table } from '@/components/ui/Table';
import {
  downloadReportCsv,
  getCouponsReport,
  getCustomersReport,
  getOperationsReport,
  getOrdersReport,
  getRevenueReport,
  type CouponsReport,
  type CustomersReport,
  type DateRange,
  type OperationsReport,
  type OrdersReport,
  type ReportName,
  type RevenueReport,
} from '@/features/admin/reportsApi';
import { ApiError } from '@/lib/api-client';
import { formatRupees } from '@/lib/format';
import { toast } from '@/lib/toast';

function Stat({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <div>
      <div className="text-text-muted text-xs">{label}</div>
      <div className="text-text text-lg font-semibold">{value}</div>
    </div>
  );
}

function ReportShell({
  name,
  range,
  isLoading,
  error,
  children,
}: {
  name: ReportName;
  range: DateRange;
  isLoading: boolean;
  error: string | null;
  children: ReactNode;
}): ReactNode {
  async function download(): Promise<void> {
    try {
      await downloadReportCsv(name, range);
    } catch {
      toast.error('Could not download the CSV.');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" variant="secondary" onClick={() => void download()}>
          <Download className="size-4" aria-hidden="true" />
          Export CSV
        </Button>
      </div>
      {error && <ErrorState title="Couldn't load report" description={error} />}
      {isLoading && !error && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}
      {!isLoading && !error && children}
    </div>
  );
}

function RevenueTab({ range }: { range: DateRange }): ReactNode {
  const [report, setReport] = useState<RevenueReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRevenueReport(range)
      .then(({ report: r }) => setReport(r))
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'Could not load report.'),
      );
  }, [range]);

  const categoryColumns: TableColumn<{ category: string; revenue: number }>[] = [
    { key: 'category', header: 'Category', render: (r) => r.category },
    { key: 'revenue', header: 'Revenue', render: (r) => formatRupees(r.revenue) },
  ];
  const areaColumns: TableColumn<{ area: string; revenue: number }>[] = [
    { key: 'area', header: 'Area', render: (r) => r.area },
    { key: 'revenue', header: 'Revenue', render: (r) => formatRupees(r.revenue) },
  ];

  return (
    <ReportShell name="revenue" range={range} isLoading={!report} error={error}>
      {report && (
        <>
          <Card>
            <div className="grid grid-cols-4 gap-4">
              <Stat label="Gross" value={formatRupees(report.gross)} />
              <Stat label="Discounts" value={formatRupees(report.discounts)} />
              <Stat label="Refunds" value={formatRupees(report.refunds)} />
              <Stat label="Net" value={formatRupees(report.net)} />
            </div>
          </Card>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <h3 className="text-text mb-2 text-sm font-semibold">By category</h3>
              <Table
                columns={categoryColumns}
                data={report.byCategory}
                getRowKey={(r) => r.category}
              />
            </Card>
            <Card>
              <h3 className="text-text mb-2 text-sm font-semibold">By area</h3>
              <Table columns={areaColumns} data={report.byArea} getRowKey={(r) => r.area} />
            </Card>
          </div>
        </>
      )}
    </ReportShell>
  );
}

function OrdersTab({ range }: { range: DateRange }): ReactNode {
  const [report, setReport] = useState<OrdersReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOrdersReport(range)
      .then(({ report: r }) => setReport(r))
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'Could not load report.'),
      );
  }, [range]);

  const statusColumns: TableColumn<{ status: string; count: number }>[] = [
    { key: 'status', header: 'Status', render: (r) => r.status },
    { key: 'count', header: 'Orders', render: (r) => String(r.count) },
  ];

  return (
    <ReportShell name="orders" range={range} isLoading={!report} error={error}>
      {report && (
        <>
          <Card>
            <div className="grid grid-cols-3 gap-4">
              <Stat label="Total orders" value={String(report.totalOrders)} />
              <Stat label="Cancellation rate" value={`${report.cancellationRatePercent}%`} />
              <Stat
                label="Turnaround (actual vs. promised)"
                value={`${report.avgTurnaroundHoursActual ?? '—'}h / ${report.avgTurnaroundHoursPromised}h`}
              />
              <Stat label="Failed pickup rate" value={`${report.failedPickupRatePercent}%`} />
              <Stat label="Failed delivery rate" value={`${report.failedDeliveryRatePercent}%`} />
            </div>
          </Card>
          <Card>
            <h3 className="text-text mb-2 text-sm font-semibold">By status</h3>
            <Table columns={statusColumns} data={report.byStatus} getRowKey={(r) => r.status} />
          </Card>
        </>
      )}
    </ReportShell>
  );
}

function CustomersTab({ range }: { range: DateRange }): ReactNode {
  const [report, setReport] = useState<CustomersReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCustomersReport(range)
      .then(({ report: r }) => setReport(r))
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'Could not load report.'),
      );
  }, [range]);

  const topColumns: TableColumn<CustomersReport['topCustomers'][number]>[] = [
    { key: 'name', header: 'Customer', render: (c) => `${c.name} (${c.phone})` },
    { key: 'orders', header: 'Orders', render: (c) => String(c.orders) },
    { key: 'totalSpent', header: 'Total spent', render: (c) => formatRupees(c.totalSpent) },
  ];
  const churnedColumns: TableColumn<CustomersReport['churnedCustomers'][number]>[] = [
    { key: 'name', header: 'Customer', render: (c) => `${c.name} (${c.phone})` },
    {
      key: 'lastOrderAt',
      header: 'Last order',
      render: (c) => format(new Date(c.lastOrderAt), 'd MMM yyyy'),
    },
  ];

  return (
    <ReportShell name="customers" range={range} isLoading={!report} error={error}>
      {report && (
        <>
          <Card>
            <div className="grid grid-cols-3 gap-4">
              <Stat label="New customers" value={String(report.newCustomers)} />
              <Stat label="Returning customers" value={String(report.returningCustomers)} />
              <Stat label="Repeat rate" value={`${report.repeatRatePercent}%`} />
            </div>
          </Card>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <h3 className="text-text mb-2 text-sm font-semibold">Top customers</h3>
              <Table
                columns={topColumns}
                data={report.topCustomers}
                getRowKey={(c) => c.userId}
                emptyState={<p className="text-text-muted text-sm">No orders in this range.</p>}
              />
            </Card>
            <Card>
              <h3 className="text-text mb-2 text-sm font-semibold">Churn risk (60d+ no order)</h3>
              <Table
                columns={churnedColumns}
                data={report.churnedCustomers}
                getRowKey={(c) => c.userId}
                emptyState={<p className="text-text-muted text-sm">No churn risk right now.</p>}
              />
            </Card>
          </div>
        </>
      )}
    </ReportShell>
  );
}

function OperationsTab({ range }: { range: DateRange }): ReactNode {
  const [report, setReport] = useState<OperationsReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOperationsReport(range)
      .then(({ report: r }) => setReport(r))
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'Could not load report.'),
      );
  }, [range]);

  const slotColumns: TableColumn<OperationsReport['slotUtilization'][number]>[] = [
    { key: 'window', header: 'Window', render: (r) => `${r.type} ${r.window}` },
    { key: 'booked', header: 'Booked/Capacity', render: (r) => `${r.booked}/${r.capacity}` },
    { key: 'utilization', header: 'Utilization', render: (r) => `${r.utilizationPercent}%` },
  ];
  const agentColumns: TableColumn<OperationsReport['agentPerformance'][number]>[] = [
    { key: 'name', header: 'Agent', render: (r) => r.name },
    { key: 'completed', header: 'Completed', render: (r) => String(r.tasksCompleted) },
    { key: 'failed', header: 'Failed', render: (r) => String(r.tasksFailed) },
  ];
  const itemColumns: TableColumn<OperationsReport['itemsByCategory'][number]>[] = [
    { key: 'category', header: 'Category', render: (r) => r.category },
    { key: 'quantity', header: 'Quantity', render: (r) => String(r.quantity) },
    { key: 'revenue', header: 'Revenue', render: (r) => formatRupees(r.revenue) },
  ];

  return (
    <ReportShell name="operations" range={range} isLoading={!report} error={error}>
      {report && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <h3 className="text-text mb-2 text-sm font-semibold">Slot utilization</h3>
            <Table
              columns={slotColumns}
              data={report.slotUtilization}
              getRowKey={(r) => `${r.type}-${r.window}`}
            />
          </Card>
          <Card>
            <h3 className="text-text mb-2 text-sm font-semibold">Agent performance</h3>
            <Table
              columns={agentColumns}
              data={report.agentPerformance}
              getRowKey={(r) => r.agentId}
            />
          </Card>
          <Card className="col-span-2">
            <h3 className="text-text mb-2 text-sm font-semibold">Items processed by category</h3>
            <Table
              columns={itemColumns}
              data={report.itemsByCategory}
              getRowKey={(r) => r.category}
            />
          </Card>
        </div>
      )}
    </ReportShell>
  );
}

function CouponsTab({ range }: { range: DateRange }): ReactNode {
  const [report, setReport] = useState<CouponsReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCouponsReport(range)
      .then(({ report: r }) => setReport(r))
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'Could not load report.'),
      );
  }, [range]);

  const columns: TableColumn<CouponsReport['coupons'][number]>[] = [
    { key: 'code', header: 'Code', render: (c) => c.code },
    { key: 'redemptions', header: 'Redemptions', render: (c) => String(c.redemptions) },
    { key: 'discountCost', header: 'Discount cost', render: (c) => formatRupees(c.discountCost) },
    {
      key: 'revenue',
      header: 'Revenue attributed',
      render: (c) => formatRupees(c.revenueAttributed),
    },
  ];

  return (
    <ReportShell name="coupons" range={range} isLoading={!report} error={error}>
      {report && (
        <Card>
          <Table
            columns={columns}
            data={report.coupons}
            getRowKey={(c) => c.code}
            emptyState={
              <p className="text-text-muted text-sm">No coupon redemptions in this range.</p>
            }
          />
        </Card>
      )}
    </ReportShell>
  );
}

export function ReportsContent(): ReactNode {
  const [from, setFrom] = useState<Date>(subDays(new Date(), 30));
  const [to, setTo] = useState<Date>(new Date());
  const range: DateRange = { from: format(from, 'yyyy-MM-dd'), to: format(to, 'yyyy-MM-dd') };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-text text-xl font-semibold">Reports</h1>
        <div className="flex gap-3">
          <DatePicker label="From" value={from} onChange={(d) => d && setFrom(d)} maxDate={to} />
          <DatePicker
            label="To"
            value={to}
            onChange={(d) => d && setTo(d)}
            minDate={from}
            maxDate={new Date()}
          />
        </div>
      </div>

      <Tabs defaultValue="revenue">
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="coupons">Coupons</TabsTrigger>
        </TabsList>
        <TabsContent value="revenue">
          <RevenueTab range={range} />
        </TabsContent>
        <TabsContent value="orders">
          <OrdersTab range={range} />
        </TabsContent>
        <TabsContent value="customers">
          <CustomersTab range={range} />
        </TabsContent>
        <TabsContent value="operations">
          <OperationsTab range={range} />
        </TabsContent>
        <TabsContent value="coupons">
          <CouponsTab range={range} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
