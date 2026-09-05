import type { OrderStatus, PaymentStatus } from '@clenzy/shared';

/**
 * Shape of an order as returned by the admin endpoints — these return the
 * raw Order document (see apps/api/src/models/Order.ts), not the slimmer
 * customer-facing `OrderPayload` from @clenzy/shared. Kept here rather than
 * in the shared package since nothing else consumes this exact shape yet.
 */
export interface AdminOrderAddress {
  label: string;
  contactName: string;
  contactPhone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
}

export interface AdminOrderSlot {
  date: string;
  window: string;
  label: string;
  estimated?: boolean;
  areaId: string;
}

export interface AdminOrderItem {
  serviceItemId: string;
  categoryId: string;
  name: string;
  categoryName: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  taxRatePercent: number;
  lineTotal: number;
  careNote?: string;
  addedBy: 'customer' | 'admin';
  isAdjusted: boolean;
}

export interface AdminOrderPricing {
  itemsSubtotal: number;
  expressSurcharge: number;
  deliveryFee: number;
  pickupFee: number;
  smallOrderFee: number;
  discountAmount: number;
  taxAmount: number;
  walletApplied: number;
  grandTotal: number;
  amountPaid: number;
  amountRefunded: number;
}

export interface AdminOrderStatusEvent {
  status: string;
  changedBy?: string;
  changedByRole: string;
  note?: string;
  at: string;
}

export interface AdminOrderNote {
  note: string;
  by?: string;
  at: string;
}

export interface AdminOrderCancellation {
  reason: string;
  cancelledByRole: 'customer' | 'staff' | 'admin' | 'system';
  at: string;
  refundEligible: boolean;
}

export interface AdminOrderPriceRevision {
  originalTotal: number;
  revisedTotal: number;
  reason: string;
  requiresApproval: boolean;
  approvedAt?: string;
}

export interface AdminOrder {
  _id: string;
  orderNumber: string;
  userId: string;
  type: 'standard' | 'reclean' | 'b2b';
  parentOrderId?: string;
  status: OrderStatus;
  items: AdminOrderItem[];
  pricing: AdminOrderPricing;
  pickupAddress: AdminOrderAddress;
  deliveryAddress: AdminOrderAddress;
  pickupSlot: AdminOrderSlot;
  deliverySlot: AdminOrderSlot;
  isExpress: boolean;
  paymentMethod: 'online' | 'cod' | 'wallet';
  paymentStatus: PaymentStatus;
  couponCode?: string;
  assignedPickupAgentId?: string;
  assignedDeliveryAgentId?: string;
  statusHistory: AdminOrderStatusEvent[];
  customerNote?: string;
  internalNotes: AdminOrderNote[];
  cancellation?: AdminOrderCancellation;
  priceRevision?: AdminOrderPriceRevision;
  rescheduleCount: number;
  failedPickupAttempts: number;
  failedDeliveryAttempts: number;
  deliveredAt?: string;
  completedAt?: string;
  source: 'web' | 'phone' | 'whatsapp' | 'admin';
  createdAt: string;
  updatedAt: string;
}

/** Only present on GET /admin/orders/:id — the server's own transition map, for the current actor. */
export interface AdminOrderDetail extends AdminOrder {
  availableTransitions: OrderStatus[];
}

export interface AdminOrderListResult {
  orders: AdminOrder[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminOrderListFilters {
  status?: string[];
  paymentStatus?: string[];
  paymentMethod?: string[];
  from?: string;
  to?: string;
  q?: string;
  areaId?: string;
  agentId?: string;
  isExpress?: boolean;
  hasPriceRevision?: boolean;
  needsAttention?: boolean;
  page?: number;
  pageSize?: number;
}
