import type { OrderStatus, PaymentStatus } from '@clenzy/shared';
import { ORDER_STATUS_LABELS } from '@clenzy/shared';
import {
  CheckCircle2,
  Clock,
  type LucideIcon,
  Package,
  RotateCcw,
  Sparkles,
  Truck,
  XCircle,
} from 'lucide-react';

export type StatusColor =
  'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'neutral';

interface StatusMeta {
  label: string;
  color: StatusColor;
  icon: LucideIcon;
}

const ORDER_STATUS_VISUALS: Record<OrderStatus, { color: StatusColor; icon: LucideIcon }> = {
  PENDING_PAYMENT: { color: 'warning', icon: Clock },
  PLACED: { color: 'secondary', icon: Package },
  CONFIRMED: { color: 'secondary', icon: Package },
  PICKUP_SCHEDULED: { color: 'secondary', icon: Package },
  PICKED_UP: { color: 'secondary', icon: Package },
  PROCESSING: { color: 'accent', icon: Sparkles },
  QUALITY_CHECK: { color: 'accent', icon: Sparkles },
  READY: { color: 'primary', icon: Truck },
  OUT_FOR_DELIVERY: { color: 'primary', icon: Truck },
  DELIVERED: { color: 'success', icon: CheckCircle2 },
  COMPLETED: { color: 'success', icon: CheckCircle2 },
  CANCELLED: { color: 'error', icon: XCircle },
  PICKUP_FAILED: { color: 'error', icon: XCircle },
  DELIVERY_FAILED: { color: 'error', icon: XCircle },
  REFUND_PENDING: { color: 'neutral', icon: RotateCcw },
  REFUNDED: { color: 'neutral', icon: RotateCcw },
};

/**
 * See docs/DESIGN_SYSTEM.md §2 "Order-status colors" and
 * docs/PAYMENTS_AND_NOTIFICATIONS.md §2. Labels come from
 * `@clenzy/shared`'s `ORDER_STATUS_LABELS` — the API's order-tracking
 * endpoint uses the exact same strings for `statusLabel`.
 */
export const ORDER_STATUS_META: Record<OrderStatus, StatusMeta> = Object.fromEntries(
  Object.entries(ORDER_STATUS_VISUALS).map(([status, visuals]) => [
    status,
    { label: ORDER_STATUS_LABELS[status as OrderStatus], ...visuals },
  ]),
) as Record<OrderStatus, StatusMeta>;

export const PAYMENT_STATUS_META: Record<PaymentStatus, StatusMeta> = {
  pending: { label: 'Payment pending', color: 'warning', icon: Clock },
  paid: { label: 'Paid', color: 'success', icon: CheckCircle2 },
  failed: { label: 'Payment failed', color: 'error', icon: XCircle },
  refund_pending: { label: 'Refund pending', color: 'neutral', icon: RotateCcw },
  partially_refunded: { label: 'Partially refunded', color: 'neutral', icon: RotateCcw },
  refunded: { label: 'Refunded', color: 'neutral', icon: RotateCcw },
};
