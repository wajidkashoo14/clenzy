import { Schema, model, type Types } from 'mongoose';

/** See docs/DATABASE.md "payments". */
export interface PaymentDocument {
  orderId: Types.ObjectId;
  userId: Types.ObjectId;
  gateway: 'razorpay' | 'cod' | 'wallet';
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  gatewaySignature?: string;
  amount: number;
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'failed' | 'refunded' | 'partially_refunded';
  method?: string;
  failureReason?: string;
  idempotencyKey?: string;
  webhookEvents: { event: string; payload: unknown; receivedAt: Date }[];
  refunds: {
    refundId: string;
    amount: number;
    reason: string;
    status: string;
    initiatedBy?: Types.ObjectId;
    at: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<PaymentDocument>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    gateway: { type: String, enum: ['razorpay', 'cod', 'wallet'], required: true },
    gatewayOrderId: { type: String },
    gatewayPaymentId: { type: String },
    gatewaySignature: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['created', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded'],
      required: true,
    },
    method: { type: String },
    failureReason: { type: String },
    idempotencyKey: { type: String },
    webhookEvents: [
      {
        event: { type: String, required: true },
        payload: { type: Schema.Types.Mixed },
        receivedAt: { type: Date, default: Date.now },
      },
    ],
    refunds: [
      {
        refundId: { type: String, required: true },
        amount: { type: Number, required: true },
        reason: { type: String, required: true },
        status: { type: String, required: true },
        initiatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

paymentSchema.index({ orderId: 1 });
paymentSchema.index({ gatewayPaymentId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ gatewayOrderId: 1 });
paymentSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
paymentSchema.index({ status: 1, createdAt: -1 });

export const Payment = model<PaymentDocument>('Payment', paymentSchema);
