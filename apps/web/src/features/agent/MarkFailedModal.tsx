'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { markFailed } from '@/features/agent/api';
import { ApiError } from '@/lib/api-client';
import { toast } from '@/lib/toast';

interface MarkFailedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber: string;
  type: 'pickup' | 'delivery';
  onSuccess: () => void;
}

export function MarkFailedModal({
  open,
  onOpenChange,
  orderNumber,
  type,
  onSuccess,
}: MarkFailedModalProps): ReactNode {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm(): Promise<void> {
    if (!reason.trim()) return;
    setIsSubmitting(true);
    try {
      await markFailed(orderNumber, { type, reason: reason.trim() });
      toast.success(`${type === 'pickup' ? 'Pickup' : 'Delivery'} marked as failed`);
      onSuccess();
      onOpenChange(false);
      setReason('');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update this task.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={`Report failed ${type}`}>
      <div className="flex flex-col gap-4">
        <Textarea
          label="What happened?"
          required
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Customer not home, address unreachable…"
        />
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Back
          </Button>
          <Button
            variant="danger"
            disabled={!reason.trim()}
            isLoading={isSubmitting}
            onClick={() => void handleConfirm()}
          >
            Confirm
          </Button>
        </div>
      </div>
    </Modal>
  );
}
