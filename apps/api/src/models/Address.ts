import { Schema, model, type Types } from 'mongoose';

/** See docs/DATABASE.md "addresses". */
export interface AddressDocument {
  userId: Types.ObjectId;
  label: 'home' | 'work' | 'other';
  contactName: string;
  contactPhone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  /**
   * No Google Maps API key is provisioned yet (docs/INTEGRATIONS.md §2.5) —
   * this stays optional/unset until Places Autocomplete + a map picker
   * exist. Serviceability resolves via `pincode` → `serviceAreaId` instead,
   * same lookup as `/areas/check`.
   */
  geo?: { type: 'Point'; coordinates: [number, number] };
  serviceAreaId?: Types.ObjectId;
  isDefault: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<AddressDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    label: { type: String, enum: ['home', 'work', 'other'], default: 'home' },
    contactName: { type: String, required: true, trim: true, maxlength: 100 },
    contactPhone: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true, maxlength: 200 },
    line2: { type: String, trim: true, maxlength: 200 },
    landmark: { type: String, trim: true, maxlength: 200 },
    area: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true, default: 'Srinagar' },
    state: { type: String, required: true, trim: true, default: 'Jammu and Kashmir' },
    pincode: { type: String, required: true, trim: true },
    geo: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number] },
    },
    serviceAreaId: { type: Schema.Types.ObjectId, ref: 'ServiceArea' },
    isDefault: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

addressSchema.index({ userId: 1, deletedAt: 1 });
addressSchema.index({ pincode: 1 });
addressSchema.index({ geo: '2dsphere' });

export const Address = model<AddressDocument>('Address', addressSchema);
