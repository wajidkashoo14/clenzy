import { Schema, model } from 'mongoose';

/**
 * See docs/DATABASE.md "priceHistory". Nothing writes to this yet — the
 * admin repricing flow lands in Phase 12 — but the model is a named Phase 5
 * deliverable so the shape exists ahead of that.
 */
export interface PriceHistoryDocument {
  serviceItemId: Schema.Types.ObjectId;
  oldPrice: number;
  newPrice: number;
  changedBy: Schema.Types.ObjectId;
  reason?: string;
  createdAt: Date;
}

const priceHistorySchema = new Schema<PriceHistoryDocument>(
  {
    serviceItemId: { type: Schema.Types.ObjectId, ref: 'ServiceItem', required: true },
    oldPrice: { type: Number, required: true },
    newPrice: { type: Number, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

priceHistorySchema.index({ serviceItemId: 1, createdAt: -1 });

export const PriceHistory = model<PriceHistoryDocument>('PriceHistory', priceHistorySchema);
