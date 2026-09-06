'use client';

import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import type { TableColumn } from '@/components/ui/Table';
import { Table } from '@/components/ui/Table';
import { BulkRepriceModal } from '@/features/admin/BulkRepriceModal';
import {
  bulkChangeCategory,
  bulkItemAction,
  listCategories,
  listItems,
  updateItem,
} from '@/features/admin/catalogApi';
import type { AdminCategory, AdminItem } from '@/features/admin/catalogTypes';
import { ItemModal } from '@/features/admin/ItemModal';
import { ApiError } from '@/lib/api-client';
import { formatRupees } from '@/lib/format';
import { toast } from '@/lib/toast';

interface LoadedResult {
  requestKey: string;
  items?: AdminItem[];
  total?: number;
  error?: string;
}

export function ItemsContent(): ReactNode {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('all');
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<LoadedResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminItem | null>(null);
  const [repriceOpen, setRepriceOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    listCategories()
      .then(({ categories: c }) => setCategories(c))
      .catch(() => setCategories([]));
  }, []);

  const requestKey = `${categoryFilter}|${statusFilter}|${search}|${refreshTick}`;

  useEffect(() => {
    listItems({
      categoryId: categoryFilter || undefined,
      status: statusFilter,
      q: search || undefined,
      page: 1,
      pageSize: 200,
    })
      .then(({ items, total }) => setResult({ requestKey, items, total }))
      .catch((err: unknown) =>
        setResult({
          requestKey,
          error: err instanceof ApiError ? err.message : 'Could not load items.',
        }),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  function reload(): void {
    setRefreshTick((t) => t + 1);
  }

  const isLoading = result === null || result.requestKey !== requestKey;
  const items = !isLoading ? result.items : undefined;
  const error = !isLoading ? result.error : undefined;
  const categoryById = new Map(categories.map((c) => [c._id, c.name]));

  async function toggleActive(item: AdminItem): Promise<void> {
    try {
      await updateItem(item._id, { isActive: !item.isActive });
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update item.');
    }
  }

  async function handleBulkStatus(action: 'activate' | 'deactivate'): Promise<void> {
    try {
      const { updated } = await bulkItemAction({ itemIds: [...selected], action });
      toast.success(`${action === 'activate' ? 'Activated' : 'Deactivated'} ${updated} item(s)`);
      setSelected(new Set());
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update items.');
    }
  }

  async function handleBulkCategoryChange(categoryId: string): Promise<void> {
    if (!categoryId) return;
    try {
      const { updated } = await bulkChangeCategory({ itemIds: [...selected], categoryId });
      toast.success(`Moved ${updated} item(s)`);
      setSelected(new Set());
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not change category.');
    }
  }

  const columns: TableColumn<AdminItem>[] = [
    { key: 'name', header: 'Name', render: (i) => <span className="font-medium">{i.name}</span> },
    { key: 'category', header: 'Category', render: (i) => categoryById.get(i.categoryId) ?? '—' },
    { key: 'unit', header: 'Unit', render: (i) => i.unit },
    { key: 'price', header: 'Price', render: (i) => formatRupees(i.price) },
    {
      key: 'popular',
      header: 'Popular',
      render: (i) => (i.isPopular ? <Badge color="accent">Popular</Badge> : null),
    },
    {
      key: 'active',
      header: 'Active',
      render: (i) => (
        <Switch label="" checked={i.isActive} onCheckedChange={() => void toggleActive(i)} />
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (i) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setEditing(i);
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
        <h1 className="text-text text-xl font-semibold">Items</h1>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus className="size-4" aria-hidden="true" />
          New item
        </Button>
      </div>

      <Card padding="sm" className="flex flex-wrap gap-3">
        <Input
          label="Search"
          placeholder="Item name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-48"
        />
        <div className="min-w-48">
          <Select
            label="Category"
            placeholder="All categories"
            options={categories.map((c) => ({ value: c._id, label: c.name }))}
            value={categoryFilter}
            onValueChange={setCategoryFilter}
          />
        </div>
        <div className="min-w-40">
          <Select
            label="Status"
            options={[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
          />
        </div>
      </Card>

      <Table
        columns={columns}
        data={items ?? []}
        getRowKey={(i) => i._id}
        isLoading={isLoading}
        selectable
        selectedKeys={selected}
        onSelectionChange={setSelected}
        errorState={
          error ? <ErrorState title="Couldn't load items" description={error} /> : undefined
        }
        emptyState={<EmptyState title="No items match these filters" description="" />}
        bulkActions={
          <>
            <Button size="sm" variant="secondary" onClick={() => void handleBulkStatus('activate')}>
              Activate
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void handleBulkStatus('deactivate')}
            >
              Deactivate
            </Button>
            <div className="w-44">
              <Select
                label=""
                placeholder="Move to category…"
                options={categories.map((c) => ({ value: c._id, label: c.name }))}
                onValueChange={(v) => void handleBulkCategoryChange(v)}
              />
            </div>
            <Button size="sm" variant="secondary" onClick={() => setRepriceOpen(true)}>
              Bulk reprice
            </Button>
          </>
        }
      />

      <ItemModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        item={editing}
        categories={categories}
        onSaved={reload}
      />
      <BulkRepriceModal
        open={repriceOpen}
        onOpenChange={setRepriceOpen}
        itemIds={[...selected]}
        onApplied={() => {
          setSelected(new Set());
          reload();
        }}
      />
    </div>
  );
}
