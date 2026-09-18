import { Schema, model, type Types } from 'mongoose';

/** See docs/DATABASE.md "Content collections" — `testimonials`. */
export interface TestimonialDocument {
  name: string;
  area?: string;
  rating: number;
  text: string;
  image?: string;
  isFeatured: boolean;
  isActive: boolean;
  /** Set when an admin promotes an approved customer review to a homepage testimonial. */
  sourceReviewId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const testimonialSchema = new Schema<TestimonialDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    area: { type: String, trim: true, maxlength: 100 },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    image: { type: String, trim: true },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    sourceReviewId: { type: Schema.Types.ObjectId, ref: 'Review' },
  },
  { timestamps: true },
);

testimonialSchema.index({ isActive: 1, isFeatured: 1 });

export const Testimonial = model<TestimonialDocument>('Testimonial', testimonialSchema);
