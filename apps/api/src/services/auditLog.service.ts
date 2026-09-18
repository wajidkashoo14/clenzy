import { Types } from 'mongoose';
import { AuditLog } from '../models/AuditLog.js';

export interface LogAuditParams {
  actorId: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
  userAgent?: string;
}

/**
 * See docs/DATABASE.md "auditLogs" — write on every admin mutation touching
 * money or access: price changes, refunds, status overrides, role changes,
 * coupon creation, settings changes. Awaited (not fire-and-forget like
 * notifications) — an audit trail that silently failed to write would be
 * worse than a request that surfaces the failure.
 */
export async function logAudit(params: LogAuditParams): Promise<void> {
  await AuditLog.create({
    actorId: new Types.ObjectId(params.actorId),
    actorRole: params.actorRole,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    before: params.before,
    after: params.after,
    ip: params.ip,
    userAgent: params.userAgent,
  });
}
