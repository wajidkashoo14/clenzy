import { Schema, model } from 'mongoose';

/** See docs/DATABASE.md "Content collections" — `faqs`. */
export interface FaqDocument {
  question: string;
  /** Sanitized HTML from the admin Tiptap editor. */
  answer: string;
  category: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const faqSchema = new Schema<FaqDocument>(
  {
    question: { type: String, required: true, trim: true, maxlength: 300 },
    answer: { type: String, required: true },
    category: { type: String, required: true, trim: true, maxlength: 100 },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

faqSchema.index({ isActive: 1, category: 1, sortOrder: 1 });

export const Faq = model<FaqDocument>('Faq', faqSchema);
