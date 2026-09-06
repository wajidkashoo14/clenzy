import type { AuditLogQuery } from '@clenzy/shared';
import { AuditLog, type AuditLogDocument } from '../models/AuditLog.js';

export interface AuditLogListResult {
  logs: AuditLogDocument[];
  total: number;
  page: number;
  pageSize: number;
}

/** See docs/API_SPEC.md §10 — `GET /admin/audit-logs` (SUPERADMIN only). */
export async function listAuditLogs(query: AuditLogQuery): Promise<AuditLogListResult> {
  const filter: Record<string, unknown> = {};
  if (query.entityType) filter.entityType = query.entityType;
  if (query.actorId) filter.actorId = query.actorId;
  if (query.from || query.to) {
    filter.at = {
      ...(query.from ? { $gte: new Date(query.from) } : {}),
      ...(query.to ? { $lte: new Date(`${query.to}T23:59:59.999Z`) } : {}),
    };
  }

  const skip = (query.page - 1) * query.pageSize;
  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ at: -1 })
      .skip(skip)
      .limit(query.pageSize)
      .populate<{ actorId: { name?: string; email?: string } | null }>('actorId', 'name email')
      .lean(),
    AuditLog.countDocuments(filter),
  ]);
  return {
    logs: logs as unknown as AuditLogDocument[],
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}
