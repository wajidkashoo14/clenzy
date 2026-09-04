import { Schema, model } from 'mongoose';

/**
 * See docs/DATABASE.md "webhookEvents (raw log)" — stores every inbound
 * webhook before processing, so a redelivered event is provably a duplicate
 * rather than something we have to trust the payload's own claims about.
 * `eventId` is a sha256 of the raw request body (Razorpay doesn't send a
 * dedicated delivery id) — identical redeliveries produce identical bodies,
 * so this is a reliable dedupe key regardless of payload shape.
 */
export interface WebhookEventDocument {
  provider: 'razorpay';
  eventId: string;
  eventType: string;
  signatureValid: boolean;
  payload: unknown;
  processedAt?: Date;
  processingError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const webhookEventSchema = new Schema<WebhookEventDocument>(
  {
    provider: { type: String, enum: ['razorpay'], required: true },
    eventId: { type: String, required: true },
    eventType: { type: String, required: true },
    signatureValid: { type: Boolean, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    processedAt: { type: Date },
    processingError: { type: String },
  },
  { timestamps: true },
);

webhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

export const WebhookEvent = model<WebhookEventDocument>('WebhookEvent', webhookEventSchema);
