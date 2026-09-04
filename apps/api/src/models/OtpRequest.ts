import { Schema, model } from 'mongoose';

/** See docs/DATABASE.md "otpRequests" and docs/SECURITY.md §1 "Phone OTP". */
export interface OtpRequestDocument {
  phone: string;
  codeHash: string;
  purpose: 'login' | 'verify_phone' | 'order_confirm';
  attempts: number;
  expiresAt: Date;
  consumedAt?: Date;
  createdAt: Date;
}

const otpRequestSchema = new Schema<OtpRequestDocument>(
  {
    phone: { type: String, required: true, trim: true },
    codeHash: { type: String, required: true },
    purpose: { type: String, enum: ['login', 'verify_phone', 'order_confirm'], required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

otpRequestSchema.index({ phone: 1, createdAt: -1 });
otpRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpRequest = model<OtpRequestDocument>('OtpRequest', otpRequestSchema);
