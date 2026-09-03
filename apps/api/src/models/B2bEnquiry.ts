import { Schema, model } from 'mongoose';

/** Commercial/B2B enquiry submissions — see docs/DATABASE.md "b2bEnquiries". */
export interface B2bEnquiryDocument {
  name: string;
  businessName: string;
  businessType?: 'hotel' | 'houseboat' | 'guesthouse' | 'restaurant' | 'other';
  phone: string;
  email: string;
  message?: string;
  source: string;
  status: 'new' | 'contacted' | 'converted' | 'lost';
  notes: { note: string; by?: Schema.Types.ObjectId; at: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

const b2bEnquirySchema = new Schema<B2bEnquiryDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    businessName: { type: String, required: true, trim: true, maxlength: 150 },
    businessType: {
      type: String,
      enum: ['hotel', 'houseboat', 'guesthouse', 'restaurant', 'other'],
    },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    message: { type: String, trim: true, maxlength: 1000 },
    source: { type: String, default: 'web' },
    status: { type: String, enum: ['new', 'contacted', 'converted', 'lost'], default: 'new' },
    notes: [
      {
        note: { type: String, required: true },
        by: { type: Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

b2bEnquirySchema.index({ status: 1, createdAt: -1 });

export const B2bEnquiry = model<B2bEnquiryDocument>('B2bEnquiry', b2bEnquirySchema);
