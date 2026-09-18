'use client';

import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import type { TableColumn } from '@/components/ui/Table';
import { Table } from '@/components/ui/Table';
import { listAreas, type AdminArea } from '@/features/admin/areasApi';
import {
  deactivateSlotTemplate,
  getSlotCapacity,
  listSlotTemplates,
  overrideSlotCapacity,
  type AdminSlotTemplate,
} from '@/features/admin/slotsApi';
import { SlotTemplateModal } from '@/features/admin/SlotTemplateModal';
import { ApiError } from '@/lib/api-client';
import { formatSlotDate, formatSlotWindow } from '@/lib/format';
import { toast } from '@/lib/toast';
import { todayInKolkata } from '@/lib/date';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function TemplatesSection(): ReactNode {
  const [templates, setTemplates] = useState<AdminSlotTemplate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminSlotTemplate | null>(null);

  function load(): void {
    listSlotTemplates()
      .then(({ templates: t }) => setTemplates(t))
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'Could not load templates.'),
      );
  }
  useEffect(load, []);

  async function handleDeactivate(template: AdminSlotTemplate): Promise<void> {
    try {
      await deactivateSlotTemplate(template._id);
      toast.success('Template deactivated');
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not deactivate template.');
    }
  }

  const columns: TableColumn<AdminSlotTemplate>[] = [
    { key: 'type', header: 'Type', render: (t) => <span className="capitalize">{t.type}</span> },
    { key: 'day', header: 'Day', render: (t) => DAY_NAMES[t.dayOfWeek] },
    { key: 'window', header: 'Window', render: (t) => formatSlotWindow(t.window) },
    { key: 'capacity', header: 'Capacity', render: (t) => String(t.capacity) },
    { key: 'cutoff', header: 'Cutoff (min)', render: (t) => String(t.cutoffMinutesBefore) },
    {
      key: 'scope',
      header: 'Areas',
      render: (t) => (t.areaIds.length === 0 ? 'All areas' : `${t.areaIds.length} area(s)`),
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) =>
        t.isActive ? (
          <Badge color="success">Active</Badge>
        ) : (
          <Badge color="neutral">Inactive</Badge>
        ),
    },
    {
      key: 'actions',
      header: '',
      render: (t) => (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditing(t);
              setModalOpen(true);
            }}
          >
            Edit
          </Button>
          {t.isActive && (
            <Button size="sm" variant="ghost" onClick={() => void handleDeactivate(t)}>
              Deactivate
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-text text-sm font-semibold">Templates</h2>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus className="size-4" aria-hidden="true" />
          New template
        </Button>
      </div>
      {error && <ErrorState title="Couldn't load templates" description={error} />}
      <Table
        columns={columns}
        data={templates ?? []}
        getRowKey={(t) => t._id}
        isLoading={templates === null && !error}
        emptyState={<EmptyState title="No slot templates yet" description="" />}
      />
      <SlotTemplateModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        template={editing}
        onSaved={load}
      />
    </Card>
  );
}

function CapacitySection(): ReactNode {
  const [areas, setAreas] = useState<AdminArea[]>([]);
  const [areaId, setAreaId] = useState('');
  const [type, setType] = useState<'pickup' | 'delivery'>('pickup');
  const [dates, setDates] = useState<
    | {
        date: string;
        windows: {
          window: string;
          label: string;
          capacity: number;
          booked: number;
          disabled: boolean;
        }[];
      }[]
    | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [overrideTarget, setOverrideTarget] = useState<{ date: string; window: string } | null>(
    null,
  );
  const [overrideValue, setOverrideValue] = useState('');

  useEffect(() => {
    listAreas()
      .then(({ areas: a }) => {
        setAreas(a);
        setAreaId((prev) => prev || a[0]?._id || '');
      })
      .catch(() => setAreas([]));
  }, []);

  function load(): void {
    if (!areaId) return;
    getSlotCapacity({ type, areaId, from: todayInKolkata(), days: 14 })
      .then(({ dates: d }) => setDates(d))
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'Could not load capacity.'),
      );
  }
  useEffect(load, [areaId, type]);

  const windowsInView = useMemo(() => {
    const set = new Set<string>();
    dates?.forEach((d) => d.windows.forEach((w) => set.add(w.window)));
    return [...set].sort();
  }, [dates]);

  async function handleOverride(): Promise<void> {
    if (!overrideTarget) return;
    const capacity = Number(overrideValue);
    if (Number.isNaN(capacity) || capacity < 0) return;
    try {
      await overrideSlotCapacity({
        date: overrideTarget.date,
        window: overrideTarget.window,
        type,
        areaId,
        capacity,
      });
      toast.success('Capacity updated');
      setOverrideTarget(null);
      setOverrideValue('');
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not override capacity.');
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-text text-sm font-semibold">Capacity — next 14 days</h2>
      <div className="flex flex-wrap gap-3">
        <div className="w-56">
          <Select
            label="Area"
            options={areas.map((a) => ({ value: a._id, label: a.area }))}
            value={areaId}
            onValueChange={setAreaId}
          />
        </div>
        <div className="w-40">
          <Select
            label="Type"
            options={[
              { value: 'pickup', label: 'Pickup' },
              { value: 'delivery', label: 'Delivery' },
            ]}
            value={type}
            onValueChange={(v) => setType(v as 'pickup' | 'delivery')}
          />
        </div>
      </div>

      {error && <ErrorState title="Couldn't load capacity" description={error} />}

      {dates && windowsInView.length === 0 && (
        <EmptyState title="No slots configured for this area/type" description="" />
      )}

      {dates && windowsInView.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="px-2 py-2 text-left">Date</th>
                {windowsInView.map((w) => (
                  <th key={w} className="px-2 py-2 text-center">
                    {formatSlotWindow(w)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dates.map((day) => (
                <tr key={day.date} className="border-border border-t">
                  <td className="px-2 py-2 whitespace-nowrap">{formatSlotDate(day.date)}</td>
                  {windowsInView.map((w) => {
                    const window = day.windows.find((win) => win.window === w);
                    if (!window)
                      return (
                        <td key={w} className="text-text-muted px-2 py-2 text-center">
                          —
                        </td>
                      );
                    return (
                      <td key={w} className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setOverrideTarget({ date: day.date, window: w });
                            setOverrideValue(String(window.capacity));
                          }}
                          className={`hover:bg-surface-alt rounded px-2 py-1 tabular-nums ${window.disabled ? 'text-error' : 'text-text'}`}
                        >
                          {window.booked}/{window.capacity}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={Boolean(overrideTarget)}
        onOpenChange={(open) => !open && setOverrideTarget(null)}
        title="Override capacity"
      >
        <div className="flex flex-col gap-4">
          <p className="text-text-muted text-sm">
            {overrideTarget &&
              `${formatSlotDate(overrideTarget.date)} · ${formatSlotWindow(overrideTarget.window)}`}
          </p>
          <Input
            label="Capacity"
            type="number"
            helperText="Set to 0 to block this slot entirely."
            value={overrideValue}
            onChange={(e) => setOverrideValue(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOverrideTarget(null)}>
              Cancel
            </Button>
            <Button onClick={() => void handleOverride()}>Save</Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

export function SlotsContent(): ReactNode {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-text text-xl font-semibold">Slots</h1>
      <TemplatesSection />
      <CapacitySection />
    </div>
  );
}
