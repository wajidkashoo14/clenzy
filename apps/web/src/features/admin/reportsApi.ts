import { apiGet } from '@/lib/api-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

export interface DateRange {
  from: string;
  to: string;
}

export interface RevenueReport {
  gross: number;
  discounts: number;
  refunds: number;
  net: number;
  byPaymentMethod: { method: string; revenue: number; orders: number }[];
  byCategory: { category: string; revenue: number }[];
  byArea: { area: string; revenue: number }[];
}

export interface OrdersReport {
  totalOrders: number;
  byStatus: { status: string; count: number }[];
  cancellationRatePercent: number;
  cancellationReasons: { reason: string; count: number }[];
  avgTurnaroundHoursActual: number | null;
  avgTurnaroundHoursPromised: number;
  failedPickupRatePercent: number;
  failedDeliveryRatePercent: number;
}

export interface CustomersReport {
  newCustomers: number;
  returningCustomers: number;
  repeatRatePercent: number;
  topCustomers: {
    userId: string;
    name: string;
    phone: string;
    orders: number;
    totalSpent: number;
  }[];
  churnedCustomers: { userId: string; name: string; phone: string; lastOrderAt: string }[];
}

export interface OperationsReport {
  slotUtilization: {
    type: string;
    window: string;
    booked: number;
    capacity: number;
    utilizationPercent: number;
  }[];
  agentPerformance: {
    agentId: string;
    name: string;
    tasksCompleted: number;
    tasksFailed: number;
  }[];
  itemsByCategory: { category: string; quantity: number; revenue: number }[];
}

export interface CouponsReport {
  coupons: { code: string; redemptions: number; discountCost: number; revenueAttributed: number }[];
}

function query(range: DateRange): string {
  return `?from=${range.from}&to=${range.to}`;
}

export function getRevenueReport(range: DateRange): Promise<{ report: RevenueReport }> {
  return apiGet(`/api/v1/admin/reports/revenue${query(range)}`);
}
export function getOrdersReport(range: DateRange): Promise<{ report: OrdersReport }> {
  return apiGet(`/api/v1/admin/reports/orders${query(range)}`);
}
export function getCustomersReport(range: DateRange): Promise<{ report: CustomersReport }> {
  return apiGet(`/api/v1/admin/reports/customers${query(range)}`);
}
export function getOperationsReport(range: DateRange): Promise<{ report: OperationsReport }> {
  return apiGet(`/api/v1/admin/reports/operations${query(range)}`);
}
export function getCouponsReport(range: DateRange): Promise<{ report: CouponsReport }> {
  return apiGet(`/api/v1/admin/reports/coupons${query(range)}`);
}

async function downloadCsv(path: string, filename: string): Promise<void> {
  const response = await fetch(`${API_URL}${path}`, { credentials: 'include' });
  if (!response.ok) throw new Error('Could not download the report CSV.');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const REPORT_NAMES = ['revenue', 'orders', 'customers', 'operations', 'coupons'] as const;
export type ReportName = (typeof REPORT_NAMES)[number];

export function downloadReportCsv(name: ReportName, range: DateRange): Promise<void> {
  return downloadCsv(`/api/v1/admin/reports/${name}.csv${query(range)}`, `${name}-report.csv`);
}
