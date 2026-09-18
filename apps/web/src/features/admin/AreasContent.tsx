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
import { AreaModal } from '@/features/admin/AreaModal';
import { listAreas, setAreaAvailability, type AdminArea } from '@/features/admin/areasApi';
import { ApiError } from '@/lib/api-client';
import { formatRupees } from '@/lib/format';
import { toast } from '@/lib/toast';

export function AreasContent(): ReactNode {
  const [areas, setAreas] = useState<AdminArea[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminArea | null>(null);

  function load(): void {
    listAreas()
      .then(({ areas: a }) => setAreas(a))
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'Could not load areas.'),
      );
  }
  useEffect(load, []);

  async function toggle(
    area: AdminArea,
    field: 'pickupAvailable' | 'deliveryAvailable',
  ): Promise<void> {
    try {
      await setAreaAvailability(area._id, { [field]: !area[field] });
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update area.');
    }
  }

  const columns: TableColumn<AdminArea>[] = [
    { key: 'area', header: 'Area', render: (a) => <span className="font-medium">{a.area}</span> },
    { key: 'city', header: 'City', render: (a) => a.city },
    { key: 'pincodes', header: 'Pincodes', render: (a) => a.pincodes.join(', ') },
    {
      key: 'pickup',
      header: 'Pickup',
      render: (a) => (
        <Switch
          label=""
          checked={a.pickupAvailable}
          onCheckedChange={() => void toggle(a, 'pickupAvailable')}
        />
      ),
    },
    {
      key: 'delivery',
      header: 'Delivery',
      render: (a) => (
        <Switch
          label=""
          checked={a.deliveryAvailable}
          onCheckedChange={() => void toggle(a, 'deliveryAvailable')}
        />
      ),
    },
    {
      key: 'express',
      header: 'Express',
      render: (a) =>
        a.expressAvailable ? (
          <Badge color="accent">Yes</Badge>
        ) : (
          <span className="text-text-muted">No</span>
        ),
    },
    {
      key: 'deliveryFee',
      header: 'Delivery fee',
      render: (a) =>
        a.deliveryFee != null ? (
          formatRupees(a.deliveryFee)
        ) : (
          <span className="text-text-muted">Default</span>
        ),
    },
    {
      key: 'status',
      header: 'Paused',
      render: (a) =>
        !a.pickupAvailable || !a.deliveryAvailable ? (
          <Badge color="warning">Paused</Badge>
        ) : (
          <span className="text-text-muted">—</span>
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
        <h1 className="text-text text-xl font-semibold">Service Areas</h1>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus className="size-4" aria-hidden="true" />
          New area
        </Button>
      </div>

      <p className="text-text-muted text-sm">
        Toggle Pickup/Delivery off to pause an area in seconds — e.g. for a snow closure. Orders
        already placed aren&apos;t affected; new orders from that area are blocked immediately.
      </p>

      {error && <ErrorState title="Couldn't load areas" description={error} />}

      <Table
        columns={columns}
        data={areas ?? []}
        getRowKey={(a) => a._id}
        isLoading={areas === null && !error}
        emptyState={
          <EmptyState
            title="No service areas yet"
            description="Create one to start accepting orders."
          />
        }
      />

      <AreaModal open={modalOpen} onOpenChange={setModalOpen} area={editing} onSaved={load} />
    </div>
  );
}
