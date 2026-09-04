import type { OrderStatus, PaymentStatus } from '@clenzy/shared';
import { Schema, model, type Types } from 'mongoose';

export interface OrderItemSnapshot {
  serviceItemId: Types.ObjectId;
  categoryId: Types.ObjectId;
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

export interface OrderPricing {
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

export interface OrderAddressSnapshot {
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

export interface OrderSlot {
  date: string;
  window: string;
  label: string;
  estimated?: boolean;
  /** The `serviceAreaId` `SlotCapacity` was reserved against — not customer-facing; needed to release capacity on cancellation/expiry. */
  areaId: Types.ObjectId;
}

/** See docs/DATABASE.md "orders — the core collection". */
export interface OrderDocument {
  orderNumber: string;
  userId: Types.ObjectId;
  type: 'standard' | 'reclean' | 'b2b';
  parentOrderId?: Types.ObjectId;
  status: OrderStatus;
  items: OrderItemSnapshot[];
  pricing: OrderPricing;
  pickupAddress: OrderAddressSnapshot;
  deliveryAddress: OrderAddressSnapshot;
  pickupSlot: OrderSlot;
  deliverySlot: OrderSlot;
  isExpress: boolean;
  paymentMethod: 'online' | 'cod' | 'wallet';
  paymentStatus: PaymentStatus;
  couponCode?: string;
  couponId?: Types.ObjectId;
  assignedPickupAgentId?: Types.ObjectId;
  assignedDeliveryAgentId?: Types.ObjectId;
  statusHistory: {
    status: OrderStatus;
    changedBy?: Types.ObjectId;
    changedByRole: string;
    note?: string;
    at: Date;
  }[];
  customerNote?: string;
  internalNotes: { note: string; by?: Types.ObjectId; at: Date }[];
  idempotencyKey?: string;
  cancellation?: {
    reason: string;
    cancelledBy?: Types.ObjectId;
    cancelledByRole: 'customer' | 'staff' | 'admin' | 'system';
    at: Date;
    refundEligible: boolean;
  };
  priceRevision?: {
    originalTotal: number;
    revisedTotal: number;
    reason: string;
    requiresApproval: boolean;
    approvedAt?: Date;
    approvedBy?: Types.ObjectId;
  };
  rescheduleCount: number;
  failedPickupAttempts: number;
  failedDeliveryAttempts: number;
  deliveredAt?: Date;
  completedAt?: Date;
  source: 'web' | 'phone' | 'whatsapp' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

const addressSnapshotSchema = new Schema<OrderAddressSnapshot>(
  {
    label: { type: String, required: true },
    contactName: { type: String, required: true },
    contactPhone: { type: String, required: true },
    line1: { type: String, required: true },
    line2: { type: String },
    landmark: { type: String },
    area: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
  },
  { _id: false },
);

const slotSchema = new Schema<OrderSlot>(
  {
    date: { type: String, required: true },
    window: { type: String, required: true },
    label: { type: String, required: true },
    estimated: { type: Boolean },
    areaId: { type: Schema.Types.ObjectId, ref: 'ServiceArea', required: true },
  },
  { _id: false },
);

const orderSchema = new Schema<OrderDocument>(
  {
    orderNumber: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['standard', 'reclean', 'b2b'], default: 'standard' },
    parentOrderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    status: { type: String, required: true },
    items: [
      {
        serviceItemId: { type: Schema.Types.ObjectId, ref: 'ServiceItem', required: true },
        categoryId: { type: Schema.Types.ObjectId, ref: 'ServiceCategory', required: true },
        name: { type: String, required: true },
        categoryName: { type: String, required: true },
        unit: { type: String, required: true },
        unitPrice: { type: Number, required: true },
        quantity: { type: Number, required: true },
        taxRatePercent: { type: Number, default: 0 },
        lineTotal: { type: Number, required: true },
        careNote: { type: String },
        addedBy: { type: String, enum: ['customer', 'admin'], default: 'customer' },
        isAdjusted: { type: Boolean, default: false },
      },
    ],
    pricing: {
      itemsSubtotal: { type: Number, required: true },
      expressSurcharge: { type: Number, default: 0 },
      deliveryFee: { type: Number, default: 0 },
      pickupFee: { type: Number, default: 0 },
      smallOrderFee: { type: Number, default: 0 },
      discountAmount: { type: Number, default: 0 },
      taxAmount: { type: Number, default: 0 },
      walletApplied: { type: Number, default: 0 },
      grandTotal: { type: Number, required: true },
      amountPaid: { type: Number, default: 0 },
      amountRefunded: { type: Number, default: 0 },
    },
    pickupAddress: { type: addressSnapshotSchema, required: true },
    deliveryAddress: { type: addressSnapshotSchema, required: true },
    pickupSlot: { type: slotSchema, required: true },
    deliverySlot: { type: slotSchema, required: true },
    isExpress: { type: Boolean, default: false },
    paymentMethod: { type: String, enum: ['online', 'cod', 'wallet'], required: true },
    paymentStatus: { type: String, required: true },
    couponCode: { type: String },
    couponId: { type: Schema.Types.ObjectId, ref: 'Coupon' },
    assignedPickupAgentId: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedDeliveryAgentId: { type: Schema.Types.ObjectId, ref: 'User' },
    statusHistory: [
      {
        status: { type: String, required: true },
        changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        changedByRole: { type: String, required: true },
        note: { type: String },
        at: { type: Date, default: Date.now },
      },
    ],
    customerNote: { type: String, maxlength: 500 },
    internalNotes: [
      {
        note: { type: String, required: true },
        by: { type: Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now },
      },
    ],
    idempotencyKey: { type: String },
    cancellation: {
      reason: { type: String },
      cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
      cancelledByRole: { type: String, enum: ['customer', 'staff', 'admin', 'system'] },
      at: { type: Date },
      refundEligible: { type: Boolean },
    },
    priceRevision: {
      originalTotal: { type: Number },
      revisedTotal: { type: Number },
      reason: { type: String },
      requiresApproval: { type: Boolean },
      approvedAt: { type: Date },
      approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    rescheduleCount: { type: Number, default: 0 },
    failedPickupAttempts: { type: Number, default: 0 },
    failedDeliveryAttempts: { type: Number, default: 0 },
    deliveredAt: { type: Date },
    completedAt: { type: Date },
    source: { type: String, enum: ['web', 'phone', 'whatsapp', 'admin'], default: 'web' },
  },
  { timestamps: true },
);

// orderNumber's unique index comes from `unique: true` on the field itself, above.
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'pickupSlot.date': 1, status: 1 });
orderSchema.index({ 'deliverySlot.date': 1, status: 1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });
// Unique so a race between two identical replayed requests can't ever create two orders —
// the loser's insert throws E11000, which orders.service.ts catches and treats as a replay.
orderSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

export const Order = model<OrderDocument>('Order', orderSchema);
