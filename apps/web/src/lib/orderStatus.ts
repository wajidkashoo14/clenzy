import type { OrderStatus, PaymentStatus } from '@clenzy/shared';
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

/** See docs/DESIGN_SYSTEM.md §2 "Order-status colors" and docs/PAYMENTS_AND_NOTIFICATIONS.md §2. */
export const ORDER_STATUS_META: Record<OrderStatus, StatusMeta> = {
  PENDING_PAYMENT: { label: 'Payment pending', color: 'warning', icon: Clock },
  PLACED: { label: 'Placed', color: 'secondary', icon: Package },
  CONFIRMED: { label: 'Confirmed', color: 'secondary', icon: Package },
  PICKUP_SCHEDULED: { label: 'Pickup scheduled', color: 'secondary', icon: Package },
  PICKED_UP: { label: 'Picked up', color: 'secondary', icon: Package },
  PROCESSING: { label: 'Processing', color: 'accent', icon: Sparkles },
  QUALITY_CHECK: { label: 'Quality check', color: 'accent', icon: Sparkles },
  READY: { label: 'Ready', color: 'primary', icon: Truck },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', color: 'primary', icon: Truck },
  DELIVERED: { label: 'Delivered', color: 'success', icon: CheckCircle2 },
  COMPLETED: { label: 'Completed', color: 'success', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', color: 'error', icon: XCircle },
  PICKUP_FAILED: { label: 'Pickup failed', color: 'error', icon: XCircle },
  DELIVERY_FAILED: { label: 'Delivery failed', color: 'error', icon: XCircle },
  REFUND_PENDING: { label: 'Refund pending', color: 'neutral', icon: RotateCcw },
  REFUNDED: { label: 'Refunded', color: 'neutral', icon: RotateCcw },
};

export const PAYMENT_STATUS_META: Record<PaymentStatus, StatusMeta> = {
  pending: { label: 'Payment pending', color: 'warning', icon: Clock },
  paid: { label: 'Paid', color: 'success', icon: CheckCircle2 },
  failed: { label: 'Payment failed', color: 'error', icon: XCircle },
  refund_pending: { label: 'Refund pending', color: 'neutral', icon: RotateCcw },
  partially_refunded: { label: 'Partially refunded', color: 'neutral', icon: RotateCcw },
  refunded: { label: 'Refunded', color: 'neutral', icon: RotateCcw },
};
