import { Schema, model } from 'mongoose';

/** General contact form submissions — see docs/DATABASE.md "contactSubmissions". */
export interface ContactSubmissionDocument {
  name: string;
  phone: string;
  email?: string;
  message: string;
  source: string;
  status: 'new' | 'contacted' | 'converted' | 'lost';
  notes: { note: string; by?: Schema.Types.ObjectId; at: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

const contactSubmissionSchema = new Schema<ContactSubmissionDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
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

contactSubmissionSchema.index({ status: 1, createdAt: -1 });

export const ContactSubmission = model<ContactSubmissionDocument>(
  'ContactSubmission',
  contactSubmissionSchema,
);
