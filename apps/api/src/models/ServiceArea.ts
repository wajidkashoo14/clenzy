import { Schema, model } from 'mongoose';

/** See docs/DATABASE.md "serviceAreas". */
export interface ServiceAreaDocument {
  city: string;
  state: string;
  area: string;
  slug: string;
  pincodes: string[];
  pickupAvailable: boolean;
  deliveryAvailable: boolean;
  expressAvailable: boolean;
  /** Paise. Overrides the global default delivery fee. */
  deliveryFee?: number;
  /** Paise. Optional area override of the global minimum order value. */
  minOrderValue?: number;
  serviceableCategories: Schema.Types.ObjectId[];
  isActive: boolean;
  seo?: { title?: string; description?: string };
  createdAt: Date;
  updatedAt: Date;
}

const serviceAreaSchema = new Schema<ServiceAreaDocument>(
  {
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    area: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    pincodes: [{ type: String, trim: true }],
    pickupAvailable: { type: Boolean, default: true },
    deliveryAvailable: { type: Boolean, default: true },
    expressAvailable: { type: Boolean, default: false },
    deliveryFee: { type: Number, min: 0 },
    minOrderValue: { type: Number, min: 0 },
    serviceableCategories: [{ type: Schema.Types.ObjectId, ref: 'ServiceCategory' }],
    isActive: { type: Boolean, default: true },
    seo: {
      title: { type: String },
      description: { type: String },
    },
  },
  { timestamps: true },
);

serviceAreaSchema.index({ pincodes: 1 });
serviceAreaSchema.index({ slug: 1 }, { unique: true });
serviceAreaSchema.index({ isActive: 1, city: 1 });

export const ServiceArea = model<ServiceAreaDocument>('ServiceArea', serviceAreaSchema);
