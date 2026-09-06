'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import type { TableColumn } from '@/components/ui/Table';
import { Table } from '@/components/ui/Table';
import { Textarea } from '@/components/ui/Textarea';
import {
  addB2bEnquiryNote,
  addContactSubmissionNote,
  addLeadNote,
  convertLead,
  listB2bEnquiries,
  listContactSubmissions,
  listLeads,
  updateB2bEnquiryStatus,
  updateContactSubmissionStatus,
  updateLead,
  type AdminB2bEnquiry,
  type AdminLead,
  type AdminSubmission,
} from '@/features/admin/leadsApi';
import { ManualOrderModal } from '@/features/admin/ManualOrderModal';
import { listAgents, type AdminAgent } from '@/features/admin/staffApi';
import type { AdminOrder } from '@/features/admin/types';
import { ApiError } from '@/lib/api-client';
import { toast } from '@/lib/toast';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
];

function LeadsTab(): ReactNode {
  const [leads, setLeads] = useState<AdminLead[] | null>(null);
  const [agents, setAgents] = useState<AdminAgent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('all');
  const [noteTarget, setNoteTarget] = useState<AdminLead | null>(null);
  const [noteText, setNoteText] = useState('');
  const [convertTarget, setConvertTarget] = useState<AdminLead | null>(null);

  function load(): void {
    listLeads(status === 'all' ? undefined : status)
      .then(({ items }) => setLeads(items))
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'Could not load leads.'),
      );
  }
  useEffect(load, [status]);
  useEffect(() => {
    listAgents()
      .then(({ agents: a }) => setAgents(a))
      .catch(() => setAgents([]));
  }, []);

  async function changeStatus(lead: AdminLead, next: string): Promise<void> {
    try {
      await updateLead(lead._id, { status: next as AdminLead['status'] });
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update lead.');
    }
  }

  async function assign(lead: AdminLead, agentId: string): Promise<void> {
    try {
      await updateLead(lead._id, { assignedTo: agentId });
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not assign lead.');
    }
  }

  async function submitNote(): Promise<void> {
    if (!noteTarget || !noteText.trim()) return;
    try {
      await addLeadNote(noteTarget._id, { note: noteText.trim() });
      toast.success('Note added');
      setNoteTarget(null);
      setNoteText('');
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not add note.');
    }
  }

  async function handleOrderCreated(order: AdminOrder): Promise<void> {
    if (!convertTarget) return;
    try {
      await convertLead(convertTarget._id, order._id);
      toast.success('Lead marked converted');
      setConvertTarget(null);
      load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Order created, but could not link the lead.',
      );
    }
  }

  const columns: TableColumn<AdminLead>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (l) => (
        <div>
          <div className="font-medium">{l.name}</div>
          <div className="text-text-muted text-xs">{l.phone}</div>
        </div>
      ),
    },
    { key: 'interest', header: 'Interest', render: (l) => l.serviceInterest ?? '—' },
    { key: 'area', header: 'Area', render: (l) => l.area ?? '—' },
    {
      key: 'assigned',
      header: 'Assigned to',
      render: (l) => (
        <div className="w-40">
          <Select
            label=""
            options={[
              { value: '', label: 'Unassigned' },
              ...agents.map((a) => ({ value: a._id, label: a.name ?? a.phone })),
            ]}
            value={l.assignedTo ?? ''}
            onValueChange={(v) => v && void assign(l, v)}
          />
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (l) => (
        <div className="w-36">
          <Select
            label=""
            options={STATUS_OPTIONS.filter((o) => o.value !== 'all')}
            value={l.status}
            onValueChange={(v) => void changeStatus(l, v)}
          />
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (l) => (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => setNoteTarget(l)}>
            Note ({l.notes.length})
          </Button>
          {l.status !== 'converted' && (
            <Button size="sm" variant="ghost" onClick={() => setConvertTarget(l)}>
              Convert
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <div className="w-48">
          <Select label="" options={STATUS_OPTIONS} value={status} onValueChange={setStatus} />
        </div>
      </div>
      {error && <ErrorState title="Couldn't load leads" description={error} />}
      <Table
        columns={columns}
        data={leads ?? []}
        getRowKey={(l) => l._id}
        isLoading={leads === null && !error}
        emptyState={<EmptyState title="No leads here" description="Nothing matches this filter." />}
      />

      <Modal
        open={Boolean(noteTarget)}
        onOpenChange={(open) => !open && setNoteTarget(null)}
        title="Add note"
      >
        <div className="flex flex-col gap-4">
          {noteTarget?.notes.map((n, i) => (
            <p key={i} className="text-text-muted border-border border-b pb-2 text-sm">
              {n.note}
            </p>
          ))}
          <Textarea
            label="New note"
            maxLength={1000}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setNoteTarget(null)}>
              Cancel
            </Button>
            <Button disabled={!noteText.trim()} onClick={() => void submitNote()}>
              Add note
            </Button>
          </div>
        </div>
      </Modal>

      <ManualOrderModal
        open={Boolean(convertTarget)}
        onOpenChange={(open) => !open && setConvertTarget(null)}
        onCreated={(order) => void handleOrderCreated(order)}
        prefill={
          convertTarget
            ? {
                customerName: convertTarget.name,
                customerPhone: convertTarget.phone,
                customerNote: convertTarget.message,
              }
            : undefined
        }
      />
    </div>
  );
}

function SimpleQueueTab<T extends AdminSubmission>({
  list,
  updateStatus,
  addNote,
  extraColumns = [],
}: {
  list: (status?: string) => Promise<{ items: T[] }>;
  updateStatus: (id: string, status: T['status']) => Promise<unknown>;
  addNote: (id: string, note: string) => Promise<unknown>;
  extraColumns?: TableColumn<T>[];
}): ReactNode {
  const [items, setItems] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('all');
  const [noteTarget, setNoteTarget] = useState<T | null>(null);
  const [noteText, setNoteText] = useState('');

  function load(): void {
    list(status === 'all' ? undefined : status)
      .then((r) => setItems(r.items))
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'Could not load.'));
  }
  useEffect(load, [status, list]);

  async function changeStatus(item: T, next: string): Promise<void> {
    try {
      await updateStatus(item._id, next as T['status']);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update status.');
    }
  }

  async function submitNote(): Promise<void> {
    if (!noteTarget || !noteText.trim()) return;
    try {
      await addNote(noteTarget._id, noteText.trim());
      toast.success('Note added');
      setNoteTarget(null);
      setNoteText('');
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not add note.');
    }
  }

  const columns: TableColumn<T>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (s) => (
        <div>
          <div className="font-medium">{s.name}</div>
          <div className="text-text-muted text-xs">{s.phone}</div>
        </div>
      ),
    },
    ...extraColumns,
    {
      key: 'message',
      header: 'Message',
      render: (s) => <span className="line-clamp-2 max-w-xs">{s.message}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => (
        <div className="w-36">
          <Select
            label=""
            options={STATUS_OPTIONS.filter((o) => o.value !== 'all')}
            value={s.status}
            onValueChange={(v) => void changeStatus(s, v)}
          />
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (s) => (
        <Button size="sm" variant="ghost" onClick={() => setNoteTarget(s)}>
          Note ({s.notes.length})
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <div className="w-48">
          <Select label="" options={STATUS_OPTIONS} value={status} onValueChange={setStatus} />
        </div>
      </div>
      {error && <ErrorState title="Couldn't load" description={error} />}
      <Table
        columns={columns}
        data={items ?? []}
        getRowKey={(s) => s._id}
        isLoading={items === null && !error}
        emptyState={<EmptyState title="Nothing here" description="Nothing matches this filter." />}
      />

      <Modal
        open={Boolean(noteTarget)}
        onOpenChange={(open) => !open && setNoteTarget(null)}
        title="Add note"
      >
        <div className="flex flex-col gap-4">
          {noteTarget?.notes.map((n, i) => (
            <p key={i} className="text-text-muted border-border border-b pb-2 text-sm">
              {n.note}
            </p>
          ))}
          <Textarea
            label="New note"
            maxLength={1000}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setNoteTarget(null)}>
              Cancel
            </Button>
            <Button disabled={!noteText.trim()} onClick={() => void submitNote()}>
              Add note
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export function LeadsContent(): ReactNode {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-text text-xl font-semibold">Leads</h1>
      <Tabs defaultValue="leads">
        <TabsList>
          <TabsTrigger value="leads">Bookings</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="b2b">B2B</TabsTrigger>
        </TabsList>
        <TabsContent value="leads">
          <LeadsTab />
        </TabsContent>
        <TabsContent value="contact">
          <SimpleQueueTab
            list={listContactSubmissions}
            updateStatus={(id, status) => updateContactSubmissionStatus(id, { status })}
            addNote={(id, note) => addContactSubmissionNote(id, { note })}
          />
        </TabsContent>
        <TabsContent value="b2b">
          <SimpleQueueTab<AdminB2bEnquiry>
            list={listB2bEnquiries}
            updateStatus={(id, status) => updateB2bEnquiryStatus(id, { status })}
            addNote={(id, note) => addB2bEnquiryNote(id, { note })}
            extraColumns={[{ key: 'business', header: 'Business', render: (e) => e.businessName }]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
