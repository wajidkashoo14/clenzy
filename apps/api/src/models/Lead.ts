import { Schema, model, type Types } from 'mongoose';

/** Fast-path "Book a pickup" form submissions — see docs/DATABASE.md "leads". */
export interface LeadDocument {
  name: string;
  phone: string;
  email?: string;
  area?: string;
  pincode?: string;
  serviceInterest?: string;
  preferredDate?: string;
  preferredWindow?: string;
  message?: string;
  source: string;
  status: 'new' | 'contacted' | 'converted' | 'lost';
  assignedTo?: Types.ObjectId;
  convertedOrderId?: Types.ObjectId;
  notes: { note: string; by?: Types.ObjectId; at: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

const leadSchema = new Schema<LeadDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    area: { type: String, trim: true },
    pincode: { type: String, trim: true },
    serviceInterest: { type: String, trim: true },
    preferredDate: { type: String, trim: true },
    preferredWindow: { type: String, trim: true },
    message: { type: String, trim: true, maxlength: 1000 },
    source: { type: String, default: 'web' },
    status: { type: String, enum: ['new', 'contacted', 'converted', 'lost'], default: 'new' },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    convertedOrderId: { type: Schema.Types.ObjectId, ref: 'Order' },
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

leadSchema.index({ status: 1, createdAt: -1 });
leadSchema.index({ phone: 1 });

export const Lead = model<LeadDocument>('Lead', leadSchema);
