import { Schema, model, type Types } from 'mongoose';

/**
 * See docs/DATABASE.md "reviews". Public display (testimonials) and admin
 * moderation are a later phase — this phase only builds customer
 * submission, so every review starts `pending` and stays invisible until
 * moderated.
 */
export interface ReviewDocument {
  orderId: Types.ObjectId;
  userId: Types.ObjectId;
  rating: number;
  comment?: string;
  serviceQuality?: number;
  timeliness?: number;
  staffBehaviour?: number;
  images: string[];
  status: 'pending' | 'approved' | 'rejected';
  moderatedBy?: Types.ObjectId;
  moderatedAt?: Date;
  adminReply?: string;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<ReviewDocument>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000 },
    serviceQuality: { type: Number, min: 1, max: 5 },
    timeliness: { type: Number, min: 1, max: 5 },
    staffBehaviour: { type: Number, min: 1, max: 5 },
    images: { type: [String], default: [] },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    moderatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    moderatedAt: { type: Date },
    adminReply: { type: String, trim: true, maxlength: 1000 },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true },
);

reviewSchema.index({ status: 1, createdAt: -1 });
reviewSchema.index({ rating: -1, isFeatured: 1 });

export const Review = model<ReviewDocument>('Review', reviewSchema);
