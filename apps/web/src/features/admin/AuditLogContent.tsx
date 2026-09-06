'use client';

import { format } from 'date-fns';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import type { TableColumn } from '@/components/ui/Table';
import { Table } from '@/components/ui/Table';
import { listAuditLogs, type AdminAuditLog } from '@/features/admin/auditLogApi';
import { ApiError } from '@/lib/api-client';

export function AuditLogContent(): ReactNode {
  const [logs, setLogs] = useState<AdminAuditLog[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [entityType, setEntityType] = useState('');

  function load(): void {
    listAuditLogs({ entityType: entityType || undefined })
      .then((r) => {
        setLogs(r.logs);
        setTotal(r.total);
      })
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'Could not load audit logs.'),
      );
  }
  useEffect(load, [entityType]);

  const columns: TableColumn<AdminAuditLog>[] = [
    { key: 'at', header: 'When', render: (l) => format(new Date(l.at), 'd MMM yyyy, h:mm a') },
    {
      key: 'actor',
      header: 'Actor',
      render: (l) =>
        typeof l.actorId === 'object' ? (l.actorId.name ?? l.actorId.email ?? '—') : l.actorRole,
    },
    { key: 'action', header: 'Action', render: (l) => l.action },
    { key: 'entity', header: 'Entity', render: (l) => `${l.entityType} · ${l.entityId}` },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-text text-xl font-semibold">Audit log</h1>
        <div className="w-56">
          <Input
            label=""
            placeholder="Filter by entity type, e.g. Order"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
          />
        </div>
      </div>

      {error && <ErrorState title="Couldn't load audit logs" description={error} />}

      <Table
        columns={columns}
        data={logs ?? []}
        getRowKey={(l) => l._id}
        isLoading={logs === null && !error}
      />
      {logs && <p className="text-text-muted text-sm">{total} total entries.</p>}
    </div>
  );
}
