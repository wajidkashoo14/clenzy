import { Schema, model } from 'mongoose';

/** See docs/DATABASE.md "Content collections" — `banners`. */
export interface BannerDocument {
  title: string;
  subtitle?: string;
  image: string;
  mobileImage?: string;
  ctaText?: string;
  ctaLink?: string;
  placement: 'home_hero' | 'home_strip' | 'offers';
  startsAt?: Date;
  endsAt?: Date;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const bannerSchema = new Schema<BannerDocument>(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    subtitle: { type: String, trim: true, maxlength: 300 },
    image: { type: String, required: true, trim: true },
    mobileImage: { type: String, trim: true },
    ctaText: { type: String, trim: true, maxlength: 50 },
    ctaLink: { type: String, trim: true, maxlength: 300 },
    placement: { type: String, enum: ['home_hero', 'home_strip', 'offers'], required: true },
    startsAt: { type: Date },
    endsAt: { type: Date },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

bannerSchema.index({ placement: 1, isActive: 1, sortOrder: 1 });

export const Banner = model<BannerDocument>('Banner', bannerSchema);
