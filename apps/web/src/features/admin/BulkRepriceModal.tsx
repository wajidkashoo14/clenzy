'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { bulkRepriceCommit, bulkRepricePreview } from '@/features/admin/catalogApi';
import type { BulkRepriceRow } from '@/features/admin/catalogTypes';
import { ApiError } from '@/lib/api-client';
import { formatRupees } from '@/lib/format';
import { toast } from '@/lib/toast';

export interface BulkRepriceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemIds: string[];
  onApplied: () => void;
}

export function BulkRepriceModal({
  open,
  onOpenChange,
  itemIds,
  onApplied,
}: BulkRepriceModalProps): ReactNode {
  const [mode, setMode] = useState<'percentage' | 'flat'>('percentage');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState<BulkRepriceRow[] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset(): void {
    setMode('percentage');
    setValue('');
    setReason('');
    setPreview(null);
  }

  async function handlePreview(): Promise<void> {
    const numericValue = Number(value);
    if (Number.isNaN(numericValue) || !reason.trim()) return;
    try {
      const { rows } = await bulkRepricePreview({
        itemIds,
        mode,
        value: numericValue,
        reason: reason.trim(),
      });
      setPreview(rows);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not preview the change.');
    }
  }

  async function handleApply(): Promise<void> {
    const numericValue = Number(value);
    setIsSubmitting(true);
    try {
      await bulkRepriceCommit({ itemIds, mode, value: numericValue, reason: reason.trim() });
      toast.success(`Repriced ${itemIds.length} item(s)`);
      onApplied();
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not apply the change.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title={`Bulk reprice ${itemIds.length} item(s)`}
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Mode"
            options={[
              { value: 'percentage', label: 'Percentage' },
              { value: 'flat', label: 'Flat (₹)' },
            ]}
            value={mode}
            onValueChange={(v) => {
              setMode(v as 'percentage' | 'flat');
              setPreview(null);
            }}
          />
          <Input
            label={mode === 'percentage' ? 'Change (%)' : 'Change (₹)'}
            type="number"
            helperText="Negative values decrease price."
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setPreview(null);
            }}
          />
        </div>
        <Textarea
          label="Reason"
          required
          maxLength={500}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setPreview(null);
          }}
        />

        {!preview && (
          <Button
            variant="secondary"
            onClick={() => void handlePreview()}
            disabled={!value || !reason.trim()}
          >
            Preview changes
          </Button>
        )}

        {preview && (
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
                {preview.map((row) => (
                  <tr key={row.itemId} className="border-border border-t">
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2 text-right">{formatRupees(row.oldPrice)}</td>
                    <td
                      className={`px-3 py-2 text-right font-medium ${row.newPrice !== row.oldPrice ? 'text-primary' : ''}`}
                    >
                      {formatRupees(row.newPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!preview} isLoading={isSubmitting} onClick={() => void handleApply()}>
            Apply to {itemIds.length} item(s)
          </Button>
        </div>
      </div>
    </Modal>
  );
}
