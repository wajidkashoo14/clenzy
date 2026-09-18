import { Schema, model, type Types } from 'mongoose';

/** See docs/DATABASE.md "serviceItems — this is your pricing table". */
export interface ServiceItemDocument {
  /** `Types.ObjectId` (not `Schema.Types.ObjectId`, which describes the schema definition, not the runtime field type). */
  categoryId: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  careNote?: string;
  unit: 'piece' | 'kg' | 'sqft' | 'set' | 'pair';
  /** Paise — the single source of pricing truth. Money is always paise integers, per docs/API_SPEC.md §0. */
  price: number;
  mrp?: number;
  expressPrice?: number;
  taxRatePercent: number;
  hsnCode?: string;
  minQuantity: number;
  maxQuantity: number;
  turnaroundHours?: number;
  tieredPricing?: { minQty: number; unitPrice: number }[];
  image?: { url: string; publicId: string; alt: string };
  sortOrder: number;
  isActive: boolean;
  isPopular: boolean;
  availableInAreas: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const serviceItemSchema = new Schema<ServiceItemDocument>(
  {
    categoryId: { type: Schema.Types.ObjectId, ref: 'ServiceCategory', required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String },
    careNote: { type: String },
    unit: { type: String, enum: ['piece', 'kg', 'sqft', 'set', 'pair'], required: true },
    price: { type: Number, required: true, min: 0 },
    mrp: { type: Number, min: 0 },
    expressPrice: { type: Number, min: 0 },
    taxRatePercent: { type: Number, default: 0 },
    hsnCode: { type: String },
    minQuantity: { type: Number, default: 1 },
    maxQuantity: { type: Number, default: 99 },
    turnaroundHours: { type: Number },
    tieredPricing: [
      {
        minQty: { type: Number, required: true },
        unitPrice: { type: Number, required: true },
      },
    ],
    image: {
      url: { type: String },
      publicId: { type: String },
      alt: { type: String },
    },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isPopular: { type: Boolean, default: false },
    availableInAreas: [{ type: Schema.Types.ObjectId, ref: 'ServiceArea' }],
  },
  { timestamps: true },
);

serviceItemSchema.index({ categoryId: 1, isActive: 1, sortOrder: 1 });
serviceItemSchema.index({ slug: 1, categoryId: 1 }, { unique: true });
serviceItemSchema.index({ name: 'text' });
serviceItemSchema.index({ isPopular: 1, isActive: 1 });

export const ServiceItem = model<ServiceItemDocument>('ServiceItem', serviceItemSchema);
