'use client';

import type { CreateManualOrderInput, ServiceCategoryPayload } from '@clenzy/shared';
import { createManualOrderInputSchema } from '@clenzy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { createManualOrder } from '@/features/admin/api';
import type { AdminOrder } from '@/features/admin/types';
import { useSlotWindows } from '@/features/admin/useSlotWindows';
import { ApiError } from '@/lib/api-client';
import { getCategories } from '@/lib/catalog-api';
import { formatRupees } from '@/lib/format';
import { toast } from '@/lib/toast';
import { applyApiErrorToForm } from '@/lib/form-helpers';

export interface ManualOrderPrefill {
  customerName?: string;
  customerPhone?: string;
  customerNote?: string;
}

export interface ManualOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (order: AdminOrder) => void;
  /** Pre-fills the form — used by "convert to order" on the leads pipeline (docs/ADMIN_DASHBOARD.md §11). */
  prefill?: ManualOrderPrefill;
}

const emptyAddress = {
  contactName: '',
  contactPhone: '',
  line1: '',
  line2: '',
  landmark: '',
  area: '',
  city: 'Srinagar',
  pincode: '',
};

function buildDefaults(prefill?: ManualOrderPrefill): CreateManualOrderInput {
  return {
    customerPhone: prefill?.customerPhone ?? '',
    customerName: prefill?.customerName ?? '',
    items: [{ serviceItemId: '', quantity: 1 }],
    pickupAddress: emptyAddress,
    deliveryAddress: emptyAddress,
    pickupSlot: { date: '', window: '' },
    deliverySlot: { date: '', window: '' },
    isExpress: false,
    customerNote: prefill?.customerNote ?? '',
  };
}

export function ManualOrderModal({
  open,
  onOpenChange,
  onCreated,
  prefill,
}: ManualOrderModalProps): ReactNode {
  const [categories, setCategories] = useState<ServiceCategoryPayload[]>([]);
  const [sameAddress, setSameAddress] = useState(true);

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateManualOrderInput>({
    resolver: zodResolver(createManualOrderInputSchema),
    defaultValues: buildDefaults(prefill),
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  useEffect(() => {
    if (!open) return;
    getCategories(true)
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [open]);

  useEffect(() => {
    if (open) reset(buildDefaults(prefill));
    // Re-seed on open (with whatever prefill was passed this time) and reset
    // to blank on close — `prefill` is deliberately excluded so an unrelated
    // parent re-render mid-edit doesn't clobber what the admin has typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset]);

  const pickupAddress = useWatch({ control, name: 'pickupAddress' });
  const pickupDate = useWatch({ control, name: 'pickupSlot.date' });
  const deliveryPincodeInput = useWatch({ control, name: 'deliveryAddress.pincode' });
  const deliveryDate = useWatch({ control, name: 'deliverySlot.date' });
  const deliveryPincode = sameAddress ? pickupAddress.pincode : deliveryPincodeInput;

  // Zod validates the form's OWN `deliveryAddress` fields regardless of this
  // toggle, so when "same address" is checked those fields must actually be
  // kept in sync — copying pickup → delivery only at submit time is too late,
  // since react-hook-form's resolver runs against the still-empty fields first.
  useEffect(() => {
    if (sameAddress) setValue('deliveryAddress', pickupAddress);
  }, [sameAddress, pickupAddress, setValue]);

  const pickupSlots = useSlotWindows(pickupAddress.pincode, pickupDate, 'pickup');
  const deliverySlots = useSlotWindows(deliveryPincode, deliveryDate, 'delivery');

  const itemOptions = categories.flatMap((category) =>
    (category.items ?? []).map((item) => ({
      value: item.id,
      label: `${category.name} — ${item.name} (${formatRupees(item.price)}/${item.unit})`,
    })),
  );

  async function onSubmit(data: CreateManualOrderInput): Promise<void> {
    try {
      const { order } = await createManualOrder(data);
      toast.success(`Order ${order.orderNumber} created`);
      onCreated(order);
      onOpenChange(false);
    } catch (error) {
      const message = applyApiErrorToForm(error, setError);
      toast.error(
        error instanceof ApiError ? error.code.replace(/_/g, ' ') : 'Could not create order',
        {
          description: message,
        },
      );
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Create manual order" size="md">
      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        noValidate
        className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pr-1"
      >
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Customer phone"
            required
            error={errors.customerPhone?.message}
            {...register('customerPhone')}
          />
          <Input
            label="Customer name"
            error={errors.customerName?.message}
            {...register('customerName')}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-text text-sm font-medium">Items</span>
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-end gap-2">
              <Controller
                control={control}
                name={`items.${index}.serviceItemId`}
                render={({ field: f }) => (
                  <Select
                    label={index === 0 ? 'Item' : ''}
                    className="flex-1"
                    options={itemOptions}
                    value={f.value}
                    onValueChange={f.onChange}
                    error={errors.items?.[index]?.serviceItemId?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name={`items.${index}.quantity`}
                render={({ field: f }) => (
                  <QuantityStepper
                    value={f.value}
                    onChange={f.onChange}
                    min={1}
                    max={99}
                    aria-label={`Quantity for item ${index + 1}`}
                  />
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={fields.length === 1}
                onClick={() => remove(index)}
                aria-label="Remove item"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="self-start"
            onClick={() => append({ serviceItemId: '', quantity: 1 })}
          >
            <Plus className="size-4" aria-hidden="true" />
            Add item
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-text text-sm font-medium">Pickup address</span>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Contact name"
              error={errors.pickupAddress?.contactName?.message}
              {...register('pickupAddress.contactName')}
            />
            <Input
              label="Contact phone"
              error={errors.pickupAddress?.contactPhone?.message}
              {...register('pickupAddress.contactPhone')}
            />
          </div>
          <Input
            label="Address line 1"
            error={errors.pickupAddress?.line1?.message}
            {...register('pickupAddress.line1')}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Landmark"
              error={errors.pickupAddress?.landmark?.message}
              {...register('pickupAddress.landmark')}
            />
            <Input
              label="Area"
              error={errors.pickupAddress?.area?.message}
              {...register('pickupAddress.area')}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="City"
              error={errors.pickupAddress?.city?.message}
              {...register('pickupAddress.city')}
            />
            <Input
              label="Pincode"
              maxLength={6}
              error={errors.pickupAddress?.pincode?.message}
              {...register('pickupAddress.pincode')}
            />
          </div>
        </div>

        <Checkbox
          label="Deliver to the same address"
          checked={sameAddress}
          onCheckedChange={(checked) => setSameAddress(checked === true)}
        />

        {!sameAddress && (
          <div className="flex flex-col gap-2">
            <span className="text-text text-sm font-medium">Delivery address</span>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Contact name"
                error={errors.deliveryAddress?.contactName?.message}
                {...register('deliveryAddress.contactName')}
              />
              <Input
                label="Contact phone"
                error={errors.deliveryAddress?.contactPhone?.message}
                {...register('deliveryAddress.contactPhone')}
              />
            </div>
            <Input
              label="Address line 1"
              error={errors.deliveryAddress?.line1?.message}
              {...register('deliveryAddress.line1')}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Landmark"
                error={errors.deliveryAddress?.landmark?.message}
                {...register('deliveryAddress.landmark')}
              />
              <Input
                label="Area"
                error={errors.deliveryAddress?.area?.message}
                {...register('deliveryAddress.area')}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="City"
                error={errors.deliveryAddress?.city?.message}
                {...register('deliveryAddress.city')}
              />
              <Input
                label="Pincode"
                maxLength={6}
                error={errors.deliveryAddress?.pincode?.message}
                {...register('deliveryAddress.pincode')}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Pickup date"
            type="date"
            error={errors.pickupSlot?.date?.message}
            {...register('pickupSlot.date')}
          />
          <Controller
            control={control}
            name="pickupSlot.window"
            render={({ field: f }) => (
              <Select
                label="Pickup window"
                options={pickupSlots.windows.map((w) => ({ value: w.window, label: w.label }))}
                value={f.value}
                onValueChange={f.onChange}
                placeholder={pickupSlots.isLoading ? 'Loading…' : 'Select a window'}
                disabled={pickupSlots.windows.length === 0}
                error={errors.pickupSlot?.window?.message}
              />
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Delivery date"
            type="date"
            error={errors.deliverySlot?.date?.message}
            {...register('deliverySlot.date')}
          />
          <Controller
            control={control}
            name="deliverySlot.window"
            render={({ field: f }) => (
              <Select
                label="Delivery window"
                options={deliverySlots.windows.map((w) => ({ value: w.window, label: w.label }))}
                value={f.value}
                onValueChange={f.onChange}
                placeholder={deliverySlots.isLoading ? 'Loading…' : 'Select a window'}
                disabled={deliverySlots.windows.length === 0}
                error={errors.deliverySlot?.window?.message}
              />
            )}
          />
        </div>

        <Controller
          control={control}
          name="isExpress"
          render={({ field: f }) => (
            <Checkbox
              label="Express service"
              checked={f.value}
              onCheckedChange={(checked) => f.onChange(checked === true)}
            />
          )}
        />

        <Textarea label="Customer note" maxLength={500} {...register('customerNote')} />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Create order
          </Button>
        </div>
      </form>
    </Modal>
  );
}
