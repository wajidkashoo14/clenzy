'use client';

import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Switch } from '@/components/ui/Switch';
import type { TableColumn } from '@/components/ui/Table';
import { Table } from '@/components/ui/Table';
import { AgentModal } from '@/features/admin/AgentModal';
import { listAreas, type AdminArea } from '@/features/admin/areasApi';
import { listAgents, updateAgent, type AdminAgent } from '@/features/admin/staffApi';
import { ApiError } from '@/lib/api-client';
import { toast } from '@/lib/toast';

export function StaffContent(): ReactNode {
  const [agents, setAgents] = useState<AdminAgent[] | null>(null);
  const [areas, setAreas] = useState<AdminArea[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminAgent | null>(null);

  function load(): void {
    listAgents()
      .then(({ agents: a }) => setAgents(a))
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'Could not load staff.'),
      );
  }
  useEffect(load, []);
  useEffect(() => {
    listAreas()
      .then(({ areas: a }) => setAreas(a))
      .catch(() => setAreas([]));
  }, []);

  async function toggleAvailable(agent: AdminAgent): Promise<void> {
    try {
      await updateAgent(agent._id, { isAvailable: !agent.staffProfile?.isAvailable });
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update agent.');
    }
  }

  const columns: TableColumn<AdminAgent>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (a) => <span className="font-medium">{a.name ?? '—'}</span>,
    },
    { key: 'phone', header: 'Phone', render: (a) => a.phone },
    { key: 'employeeId', header: 'Employee ID', render: (a) => a.staffProfile?.employeeId ?? '—' },
    {
      key: 'areas',
      header: 'Areas',
      render: (a) =>
        a.staffProfile?.assignedAreas.length ? String(a.staffProfile.assignedAreas.length) : 'All',
    },
    {
      key: 'shift',
      header: 'Shift',
      render: (a) =>
        a.staffProfile?.shiftStart && a.staffProfile.shiftEnd
          ? `${a.staffProfile.shiftStart}–${a.staffProfile.shiftEnd}`
          : '—',
    },
    {
      key: 'today',
      header: "Today's tasks",
      render: (a) => (
        <div className="flex gap-1.5">
          <Badge color="neutral">{a.workload.tasksToday} total</Badge>
          {a.workload.completedToday > 0 && (
            <Badge color="success">{a.workload.completedToday} done</Badge>
          )}
          {a.workload.failedToday > 0 && (
            <Badge color="error">{a.workload.failedToday} failed</Badge>
          )}
        </div>
      ),
    },
    { key: 'avg', header: 'Avg/day (30d)', render: (a) => a.workload.avgPerDay.toFixed(1) },
    {
      key: 'available',
      header: 'Available',
      render: (a) => (
        <Switch
          label=""
          checked={a.staffProfile?.isAvailable ?? true}
          onCheckedChange={() => void toggleAvailable(a)}
        />
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (a) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setEditing(a);
            setModalOpen(true);
          }}
        >
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-text text-xl font-semibold">Staff</h1>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus className="size-4" aria-hidden="true" />
          New agent
        </Button>
      </div>

      {error && <ErrorState title="Couldn't load staff" description={error} />}

      <Table
        columns={columns}
        data={agents ?? []}
        getRowKey={(a) => a._id}
        isLoading={agents === null && !error}
        emptyState={
          <EmptyState
            title="No agents yet"
            description="Create one to start assigning pickups and deliveries."
          />
        }
      />

      <AgentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        agent={editing}
        areas={areas}
        onSaved={load}
      />
    </div>
  );
}
