'use client';

import { ArrowDown, ArrowUp, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Switch } from '@/components/ui/Switch';
import type { TableColumn } from '@/components/ui/Table';
import { Table } from '@/components/ui/Table';
import {
  deactivateCategory,
  listCategories,
  reorderCategories,
  updateCategory,
} from '@/features/admin/catalogApi';
import { CategoryModal } from '@/features/admin/CategoryModal';
import type { AdminCategory } from '@/features/admin/catalogTypes';
import { ApiError } from '@/lib/api-client';
import { toast } from '@/lib/toast';

export function CategoriesContent(): ReactNode {
  const [categories, setCategories] = useState<AdminCategory[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [orphanWarning, setOrphanWarning] = useState<{
    category: AdminCategory;
    count: number;
  } | null>(null);

  function load(): void {
    listCategories()
      .then(({ categories: c }) => setCategories(c))
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'Could not load categories.'),
      );
  }
  useEffect(load, []);

  async function move(index: number, direction: -1 | 1): Promise<void> {
    if (!categories) return;
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;
    const reordered = [...categories];
    [reordered[index], reordered[target]] = [reordered[target]!, reordered[index]!];
    setCategories(reordered);
    try {
      await reorderCategories({ orderedIds: reordered.map((c) => c._id) });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not reorder categories.');
      load();
    }
  }

  async function toggleActive(category: AdminCategory): Promise<void> {
    if (!category.isActive) {
      try {
        await updateCategory(category._id, { isActive: true });
        toast.success('Category reactivated');
        load();
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Could not reactivate category.');
      }
      return;
    }
    try {
      await deactivateCategory(category._id);
      toast.success('Category deactivated');
      load();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CATEGORY_HAS_ACTIVE_ITEMS') {
        const count = (err.extra?.orphanedItemCount as number) ?? 0;
        setOrphanWarning({ category, count });
        return;
      }
      toast.error(err instanceof ApiError ? err.message : 'Could not deactivate category.');
    }
  }

  async function forceDeactivate(): Promise<void> {
    if (!orphanWarning) return;
    try {
      await deactivateCategory(orphanWarning.category._id, true);
      toast.success('Category deactivated');
      setOrphanWarning(null);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not deactivate category.');
    }
  }

  const columns: TableColumn<AdminCategory>[] = [
    {
      key: 'order',
      header: '',
      className: 'w-20',
      render: (c) => {
        const index = categories!.indexOf(c);
        return (
          <div className="flex gap-1">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => void move(index, -1)}
              className="text-text-muted hover:text-text disabled:opacity-30"
              aria-label="Move up"
            >
              <ArrowUp className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled={index === categories!.length - 1}
              onClick={() => void move(index, 1)}
              className="text-text-muted hover:text-text disabled:opacity-30"
              aria-label="Move down"
            >
              <ArrowDown className="size-4" aria-hidden="true" />
            </button>
          </div>
        );
      },
    },
    { key: 'name', header: 'Name', render: (c) => <span className="font-medium">{c.name}</span> },
    { key: 'slug', header: 'Slug', render: (c) => c.slug },
    { key: 'itemCount', header: 'Items', render: (c) => String(c.itemCount) },
    {
      key: 'express',
      header: 'Express',
      render: (c) =>
        c.expressAvailable ? (
          <Badge color="accent">Yes</Badge>
        ) : (
          <span className="text-text-muted">No</span>
        ),
    },
    {
      key: 'active',
      header: 'Active',
      render: (c) => (
        <Switch label="" checked={c.isActive} onCheckedChange={() => void toggleActive(c)} />
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (c) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setEditing(c);
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
        <h1 className="text-text text-xl font-semibold">Categories</h1>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus className="size-4" aria-hidden="true" />
          New category
        </Button>
      </div>

      {error && <ErrorState title="Couldn't load categories" description={error} />}

      <Table
        columns={columns}
        data={categories ?? []}
        getRowKey={(c) => c._id}
        isLoading={categories === null && !error}
      />

      <CategoryModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        category={editing}
        onSaved={load}
      />

      <Modal
        open={Boolean(orphanWarning)}
        onOpenChange={(open) => !open && setOrphanWarning(null)}
        title="Deactivate category?"
      >
        <div className="flex flex-col gap-4">
          <p className="text-text text-sm">
            This category has <strong>{orphanWarning?.count}</strong> active item(s). Deactivating
            it will hide them from the storefront (they stay linked to this category but the
            category itself won&apos;t list them anywhere active).
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOrphanWarning(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void forceDeactivate()}>
              Deactivate anyway
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
