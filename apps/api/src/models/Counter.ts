import { Schema, model } from 'mongoose';

/**
 * Generic atomic counter, keyed by name (e.g. "orderNumber:260904" for a
 * per-day order sequence). Incremented via `findOneAndUpdate` + `$inc` +
 * upsert, which Mongo guarantees is atomic even under concurrent writers.
 */
export interface CounterDocument {
  _id: string;
  seq: number;
}

const counterSchema = new Schema<CounterDocument>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export const Counter = model<CounterDocument>('Counter', counterSchema);
