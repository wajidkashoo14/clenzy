import { Schema, model } from 'mongoose';

/** See docs/DATABASE.md "serviceCategories". */
export interface ServiceCategoryDocument {
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  /** Lucide icon export name (e.g. "Shirt") — resolved to a component on the frontend. */
  icon: string;
  image?: { url: string; publicId: string; alt: string };
  turnaroundHours: number;
  expressAvailable: boolean;
  sortOrder: number;
  isActive: boolean;
  seo?: { title?: string; description?: string; keywords?: string[] };
  createdAt: Date;
  updatedAt: Date;
}

const serviceCategorySchema = new Schema<ServiceCategoryDocument>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, required: true },
    shortDescription: { type: String, required: true },
    icon: { type: String, required: true },
    image: {
      url: { type: String },
      publicId: { type: String },
      alt: { type: String },
    },
    turnaroundHours: { type: Number, required: true },
    expressAvailable: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    seo: {
      title: { type: String },
      description: { type: String },
      keywords: [{ type: String }],
    },
  },
  { timestamps: true },
);

serviceCategorySchema.index({ slug: 1 }, { unique: true });
serviceCategorySchema.index({ isActive: 1, sortOrder: 1 });

export const ServiceCategory = model<ServiceCategoryDocument>(
  'ServiceCategory',
  serviceCategorySchema,
);
