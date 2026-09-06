'use client';

import { Download, Upload } from 'lucide-react';
import type { ChangeEvent, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { Textarea } from '@/components/ui/Textarea';
import {
  commitCsvImport,
  downloadPricingCsv,
  getPricingGrid,
  listCategories,
  previewCsvImport,
  updatePricingGrid,
} from '@/features/admin/catalogApi';
import type { AdminCategory, AdminItem, CsvPreviewRow } from '@/features/admin/catalogTypes';
import { ApiError } from '@/lib/api-client';
import { toast } from '@/lib/toast';

interface RowEdit {
  price: number;
  expressPrice: number | undefined;
  taxRatePercent: number;
  isActive: boolean;
}

/** Minimal CSV line parser for our own controlled export format (quoted fields, "" escapes commas/newlines). */
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r\n|\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return [];
  const parseLine = (line: string): string[] => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"' && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          current += char;
        }
      } else if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        cells.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current);
    return cells;
  };
  const header = parseLine(lines[0]!);
  return lines.slice(1).map((line) => {
    const cells = parseLine(line);
    return Object.fromEntries(header.map((key, i) => [key, cells[i] ?? '']));
  });
}

export function PricingContent(): ReactNode {
  const [items, setItems] = useState<AdminItem[] | null>(null);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, RowEdit>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [importPreview, setImportPreview] = useState<CsvPreviewRow[] | null>(null);
  const [importRows, setImportRows] = useState<
    { itemId: string; price?: number; expressPrice?: number; taxRatePercent?: number }[]
  >([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function load(): void {
    Promise.all([getPricingGrid(), listCategories()])
      .then(([pricing, cats]) => {
        setItems(pricing.items);
        setCategories(cats.categories);
        setEdits({});
      })
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'Could not load pricing.'),
      );
  }
  useEffect(load, []);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c._id, c.name])), [categories]);

  function edited(item: AdminItem): RowEdit {
    return (
      edits[item._id] ?? {
        price: item.price,
        expressPrice: item.expressPrice,
        taxRatePercent: item.taxRatePercent,
        isActive: item.isActive,
      }
    );
  }

  function setEdit(itemId: string, patch: Partial<RowEdit>): void {
    setEdits((prev) => ({
      ...prev,
      [itemId]: { ...edited(items!.find((i) => i._id === itemId)!), ...prev[itemId], ...patch },
    }));
  }

  const dirtyItemIds = Object.keys(edits).filter((id) => {
    const item = items?.find((i) => i._id === id);
    if (!item) return false;
    const e = edits[id]!;
    return (
      e.price !== item.price ||
      e.expressPrice !== item.expressPrice ||
      e.taxRatePercent !== item.taxRatePercent ||
      e.isActive !== item.isActive
    );
  });

  async function handleSave(): Promise<void> {
    setIsSaving(true);
    try {
      const updates = dirtyItemIds.map((itemId) => ({ itemId, ...edits[itemId]! }));
      await updatePricingGrid({ updates, reason: 'Pricing grid edit' });
      toast.success(`Saved ${updates.length} row(s)`);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save changes.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleFileSelected(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    const rows = parseCsv(text)
      .filter((row) => row.itemId)
      .map((row) => ({
        itemId: row.itemId!,
        price: row.price ? Number(row.price) : undefined,
        expressPrice: row.expressPrice ? Number(row.expressPrice) : undefined,
        taxRatePercent: row.taxRatePercent ? Number(row.taxRatePercent) : undefined,
      }));
    setImportRows(rows);
    try {
      const { rows: preview } = await previewCsvImport({ rows });
      setImportPreview(preview);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not read this CSV.');
    }
  }

  async function handleImportCommit(): Promise<void> {
    setIsImporting(true);
    try {
      const { updated } = await commitCsvImport({ rows: importRows });
      toast.success(`Imported ${updated} row(s)`);
      setImportPreview(null);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not commit the import.');
    } finally {
      setIsImporting(false);
    }
  }

  if (error) return <ErrorState title="Couldn't load pricing" description={error} />;
  if (!items) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const invalidCount = importPreview?.filter((r) => !r.valid).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-text text-xl font-semibold">Pricing</h1>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => void downloadPricingCsv()}>
            <Download className="size-4" aria-hidden="true" />
            Export CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="size-4" aria-hidden="true" />
            Import CSV
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            hidden
            onChange={(e) => void handleFileSelected(e)}
          />
          <Button
            size="sm"
            disabled={dirtyItemIds.length === 0}
            isLoading={isSaving}
            onClick={() => void handleSave()}
          >
            Save {dirtyItemIds.length > 0 ? `(${dirtyItemIds.length})` : ''}
          </Button>
        </div>
      </div>

      <Card padding="none" className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left">Item</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-right">Price (₹)</th>
              <th className="px-3 py-2 text-right">Express (₹)</th>
              <th className="px-3 py-2 text-right">Tax (%)</th>
              <th className="px-3 py-2 text-center">Active</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const e = edited(item);
              const isDirty = dirtyItemIds.includes(item._id);
              return (
                <tr
                  key={item._id}
                  className={`border-border border-t ${isDirty ? 'bg-warning-soft' : ''}`}
                >
                  <td className="px-3 py-1.5">{item.name}</td>
                  <td className="text-text-muted px-3 py-1.5">
                    {categoryById.get(item.categoryId) ?? '—'}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <input
                      type="number"
                      className="border-border-strong w-24 rounded border bg-transparent px-2 py-1 text-right"
                      value={e.price / 100}
                      onChange={(ev) =>
                        setEdit(item._id, { price: Math.round(Number(ev.target.value) * 100) })
                      }
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <input
                      type="number"
                      className="border-border-strong w-24 rounded border bg-transparent px-2 py-1 text-right"
                      value={e.expressPrice != null ? e.expressPrice / 100 : ''}
                      onChange={(ev) =>
                        setEdit(item._id, {
                          expressPrice:
                            ev.target.value === ''
                              ? undefined
                              : Math.round(Number(ev.target.value) * 100),
                        })
                      }
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <input
                      type="number"
                      className="border-border-strong w-16 rounded border bg-transparent px-2 py-1 text-right"
                      value={e.taxRatePercent}
                      onChange={(ev) =>
                        setEdit(item._id, { taxRatePercent: Number(ev.target.value) })
                      }
                    />
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <input
                      type="checkbox"
                      checked={e.isActive}
                      onChange={(ev) => setEdit(item._id, { isActive: ev.target.checked })}
                      className="accent-primary size-4"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Modal
        open={Boolean(importPreview)}
        onOpenChange={(open) => !open && setImportPreview(null)}
        title="Import preview"
        size="md"
      >
        <div className="flex flex-col gap-4">
          {invalidCount > 0 && (
            <Textarea
              label=""
              readOnly
              value={`${invalidCount} row(s) are invalid and must be fixed before importing:\n${importPreview
                ?.filter((r) => !r.valid)
                .map((r) => `${r.itemId}: ${r.error}`)
                .join('\n')}`}
            />
          )}
          <div className="border-border max-h-64 overflow-y-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-surface-alt sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left">Item</th>
                  <th className="px-3 py-2 text-right">Old</th>
                  <th className="px-3 py-2 text-right">New</th>
                </tr>
              </thead>
              <tbody>
                {importPreview?.map((row) => (
                  <tr
                    key={row.itemId}
                    className={`border-border border-t ${!row.valid ? 'bg-error-soft' : ''}`}
                  >
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2 text-right">
                      {row.oldPrice != null ? row.oldPrice / 100 : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {row.valid ? (row.newPrice != null ? row.newPrice / 100 : '—') : row.error}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setImportPreview(null)}>
              Cancel
            </Button>
            <Button
              disabled={invalidCount > 0}
              isLoading={isImporting}
              onClick={() => void handleImportCommit()}
            >
              Commit import
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
