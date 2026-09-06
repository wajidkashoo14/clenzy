import { apiGet } from '@/lib/api-client';

export interface AdminAuditLog {
  _id: string;
  actorId: { name?: string; email?: string } | string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  at: string;
}

export interface AuditLogListResult {
  logs: AdminAuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

export function listAuditLogs(
  params: {
    entityType?: string;
    actorId?: string;
    from?: string;
    to?: string;
    page?: number;
  } = {},
): Promise<AuditLogListResult> {
  const query = new URLSearchParams();
  if (params.entityType) query.set('entityType', params.entityType);
  if (params.actorId) query.set('actorId', params.actorId);
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  if (params.page) query.set('page', String(params.page));
  const qs = query.toString();
  return apiGet(`/api/v1/admin/audit-logs${qs ? `?${qs}` : ''}`);
}
