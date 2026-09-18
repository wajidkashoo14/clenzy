import { Schema, model, type Types } from 'mongoose';

/**
 * See docs/DATABASE.md "auditLogs" — "non-negotiable for anything touching
 * money": price changes, refunds, status overrides, role changes, coupon
 * creation, settings changes. Append-only; nothing ever updates or deletes
 * a row here.
 */
export interface AuditLogDocument {
  actorId: Types.ObjectId;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
  userAgent?: string;
  at: Date;
}

const auditLogSchema = new Schema<AuditLogDocument>({
  actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  actorRole: { type: String, required: true },
  action: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: { type: String, required: true },
  before: { type: Schema.Types.Mixed },
  after: { type: Schema.Types.Mixed },
  ip: { type: String },
  userAgent: { type: String },
  at: { type: Date, default: Date.now },
});

auditLogSchema.index({ entityType: 1, entityId: 1, at: -1 });
auditLogSchema.index({ actorId: 1, at: -1 });

export const AuditLog = model<AuditLogDocument>('AuditLog', auditLogSchema);
