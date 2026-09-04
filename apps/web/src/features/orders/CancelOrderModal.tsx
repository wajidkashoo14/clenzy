'use client';

import type { OrderPayload } from '@clenzy/shared';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { cancelOrder } from '@/features/orders/api';
import { ApiError } from '@/lib/api-client';
import { toast } from '@/lib/toast';

interface CancelOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber: string;
  onSuccess: (order: OrderPayload) => void;
}

export function CancelOrderModal({
  open,
  onOpenChange,
  orderNumber,
  onSuccess,
}: CancelOrderModalProps): ReactNode {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm(): Promise<void> {
    if (!reason.trim()) return;
    setIsSubmitting(true);
    try {
      const { order } = await cancelOrder(orderNumber, reason.trim());
      toast.success('Order cancelled', {
        description: order.paymentStatus === 'refunded' ? 'Your refund is on its way.' : undefined,
      });
      onSuccess(order);
      onOpenChange(false);
      setReason('');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not cancel this order.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Cancel this order?"
      description="If you've already paid, your refund will be initiated automatically."
    >
      <div className="flex flex-col gap-4">
        <Textarea
          label="Reason for cancelling"
          required
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Booked by mistake, plans changed…"
        />
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Keep order
          </Button>
          <Button
            variant="danger"
            disabled={!reason.trim()}
            isLoading={isSubmitting}
            onClick={() => void handleConfirm()}
          >
            Cancel order
          </Button>
        </div>
      </div>
    </Modal>
  );
}
