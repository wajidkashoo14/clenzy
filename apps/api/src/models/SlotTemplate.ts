import { Schema, model, type Types } from 'mongoose';

/** See docs/DATABASE.md "slotTemplates" — the admin-configurable definition of what slots exist. */
export interface SlotTemplateDocument {
  type: 'pickup' | 'delivery';
  /** 0 = Sunday, per JS Date convention. */
  dayOfWeek: number;
  /** "09:00-11:00" */
  window: string;
  label: string;
  capacity: number;
  cutoffMinutesBefore: number;
  isActive: boolean;
  /** Empty = every area. */
  areaIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const slotTemplateSchema = new Schema<SlotTemplateDocument>(
  {
    type: { type: String, enum: ['pickup', 'delivery'], required: true },
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    window: { type: String, required: true },
    label: { type: String, required: true },
    capacity: { type: Number, required: true, default: 15 },
    cutoffMinutesBefore: { type: Number, required: true, default: 0 },
    isActive: { type: Boolean, default: true },
    areaIds: [{ type: Schema.Types.ObjectId, ref: 'ServiceArea' }],
  },
  { timestamps: true },
);

slotTemplateSchema.index({ type: 1, dayOfWeek: 1, isActive: 1 });

export const SlotTemplate = model<SlotTemplateDocument>('SlotTemplate', slotTemplateSchema);
