import { Schema, model, type Types } from 'mongoose';

/**
 * See docs/DATABASE.md "slotCapacity" — the per-day counter, created
 * lazily on first booking. `date` is a plain "YYYY-MM-DD" string rather
 * than a `Date` object — Clenzy serves one timezone (Asia/Kolkata) only,
 * and a string sidesteps the whole UTC/local-midnight class of bugs for
 * a field that's really just a calendar day, never a timestamp.
 */
export interface SlotCapacityDocument {
  date: string;
  window: string;
  type: 'pickup' | 'delivery';
  areaId: Types.ObjectId;
  booked: number;
  capacity: number;
  createdAt: Date;
  updatedAt: Date;
}

const slotCapacitySchema = new Schema<SlotCapacityDocument>(
  {
    date: { type: String, required: true },
    window: { type: String, required: true },
    type: { type: String, enum: ['pickup', 'delivery'], required: true },
    areaId: { type: Schema.Types.ObjectId, ref: 'ServiceArea', required: true },
    booked: { type: Number, default: 0 },
    capacity: { type: Number, required: true },
  },
  { timestamps: true },
);

slotCapacitySchema.index({ date: 1, window: 1, type: 1, areaId: 1 }, { unique: true });

export const SlotCapacity = model<SlotCapacityDocument>('SlotCapacity', slotCapacitySchema);
