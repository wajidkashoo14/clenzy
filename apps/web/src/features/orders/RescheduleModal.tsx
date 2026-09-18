'use client';

import type { OrderPayload } from '@clenzy/shared';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { SlotStep, type SlotValue } from '@/features/checkout/SlotStep';
import { rescheduleOrder } from '@/features/orders/api';
import { addDaysToDateString, todayInKolkata } from '@/lib/date';
import { ApiError } from '@/lib/api-client';
import { toast } from '@/lib/toast';

interface RescheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderPayload;
  /** Which legs are currently reschedulable, from the order's status. */
  allowedTypes: ('pickup' | 'delivery')[];
  onSuccess: (order: OrderPayload) => void;
}

export function RescheduleModal({
  open,
  onOpenChange,
  order,
  allowedTypes,
  onSuccess,
}: RescheduleModalProps): ReactNode {
  const [type, setType] = useState<'pickup' | 'delivery'>(allowedTypes[0] ?? 'pickup');
  const [slot, setSlot] = useState<SlotValue | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const areaId = type === 'pickup' ? order.pickupSlot.areaId : order.deliverySlot.areaId;
  const fromDate = addDaysToDateString(todayInKolkata(), 1);

  async function handleConfirm(): Promise<void> {
    if (!slot) return;
    setIsSubmitting(true);
    try {
      const { order: updated } = await rescheduleOrder(order.orderNumber, { type, ...slot });
      toast.success('Order rescheduled');
      onSuccess(updated);
      onOpenChange(false);
      setSlot(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not reschedule this order.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Reschedule"
      description={`This order has been rescheduled ${order.rescheduleCount} of 2 times allowed.`}
    >
      <div className="flex flex-col gap-4">
        {allowedTypes.length > 1 && (
          <Tabs value={type} onValueChange={(v) => setType(v as 'pickup' | 'delivery')}>
            <TabsList>
              <TabsTrigger value="pickup">Pickup</TabsTrigger>
              <TabsTrigger value="delivery">Delivery</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        <SlotStep type={type} areaId={areaId} fromDate={fromDate} value={slot} onChange={setSlot} />

        <Button
          size="lg"
          disabled={!slot}
          isLoading={isSubmitting}
          onClick={() => void handleConfirm()}
        >
          Confirm new {type} slot
        </Button>
      </div>
    </Modal>
  );
}
