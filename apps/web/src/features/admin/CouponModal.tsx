'use client';

import type { CreateCouponInput } from '@clenzy/shared';
import { createCouponInputSchema } from '@clenzy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { DatePicker } from '@/components/ui/DatePicker';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { createCoupon, updateCoupon, type AdminCoupon } from '@/features/admin/couponsApi';
import { ApiError } from '@/lib/api-client';
import { applyApiErrorToForm } from '@/lib/form-helpers';
import { formatRupees } from '@/lib/format';
import { toast } from '@/lib/toast';

export interface CouponModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coupon: AdminCoupon | null;
  onSaved: () => void;
}

const SAMPLE_ORDER_PAISE = 50_000;

export function CouponModal({ open, onOpenChange, coupon, onSaved }: CouponModalProps): ReactNode {
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCouponInput>({
    resolver: zodResolver(createCouponInputSchema),
    defaultValues: {
      code: '',
      description: '',
      discountType: 'percentage',
      discountValue: 10,
      minOrderValue: 0,
      // Placeholder only — the effect below replaces these with real "now"
      // dates once the modal actually opens (`new Date()` there runs in an
      // effect, not render, so it isn't a purity violation).
      validFrom: new Date(0),
      validUntil: new Date(0),
      usageLimitPerUser: 1,
      firstOrderOnly: false,
      isActive: true,
    },
  });

  useEffect(() => {
    if (!open) return;
    reset(
      coupon
        ? {
            code: coupon.code,
            description: coupon.description,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            maxDiscountAmount: coupon.maxDiscountAmount,
            minOrderValue: coupon.minOrderValue,
            validFrom: new Date(coupon.validFrom),
            validUntil: new Date(coupon.validUntil),
            usageLimitTotal: coupon.usageLimitTotal,
            usageLimitPerUser: coupon.usageLimitPerUser,
            firstOrderOnly: coupon.firstOrderOnly,
            isActive: coupon.isActive,
          }
        : {
            code: '',
            description: '',
            discountType: 'percentage',
            discountValue: 10,
            minOrderValue: 0,
            validFrom: new Date(),
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            usageLimitPerUser: 1,
            firstOrderOnly: false,
            isActive: true,
          },
    );
  }, [open, coupon, reset]);

  const discountType = useWatch({ control, name: 'discountType' });
  const discountValue = useWatch({ control, name: 'discountValue' });
  const maxDiscountAmount = useWatch({ control, name: 'maxDiscountAmount' });

  let previewDiscount = 0;
  if (discountValue) {
    previewDiscount =
      discountType === 'percentage'
        ? Math.round((SAMPLE_ORDER_PAISE * discountValue) / 100)
        : discountValue * 100;
    if (maxDiscountAmount) previewDiscount = Math.min(previewDiscount, maxDiscountAmount * 100);
  }
  const previewTotal = Math.max(0, SAMPLE_ORDER_PAISE - previewDiscount);

  async function onSubmit(data: CreateCouponInput): Promise<void> {
    try {
      if (coupon) await updateCoupon(coupon._id, data);
      else await createCoupon(data);
      toast.success(coupon ? 'Coupon updated' : 'Coupon created');
      onSaved();
      onOpenChange(false);
    } catch (error) {
      const message = applyApiErrorToForm(error, setError);
      toast.error(
        error instanceof ApiError ? error.code.replace(/_/g, ' ') : 'Could not save coupon',
        {
          description: message,
        },
      );
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={coupon ? 'Edit coupon' : 'New coupon'}
      size="md"
    >
      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        noValidate
        className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1"
      >
        <Input
          label="Code"
          required
          disabled={Boolean(coupon)}
          helperText="Uppercased automatically."
          error={errors.code?.message}
          {...register('code')}
        />
        <Textarea
          label="Description"
          required
          maxLength={300}
          error={errors.description?.message}
          {...register('description')}
        />

        <div className="grid grid-cols-2 gap-3">
          <Controller
            control={control}
            name="discountType"
            render={({ field }) => (
              <Select
                label="Discount type"
                options={[
                  { value: 'percentage', label: 'Percentage' },
                  { value: 'flat', label: 'Flat (₹)' },
                ]}
                value={field.value}
                onValueChange={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="discountValue"
            render={({ field }) => (
              <Input
                label={discountType === 'percentage' ? 'Value (%)' : 'Value (₹)'}
                type="number"
                required
                error={errors.discountValue?.message}
                value={
                  field.value != null
                    ? discountType === 'percentage'
                      ? field.value
                      : field.value / 100
                    : ''
                }
                onChange={(e) => {
                  const raw = Number(e.target.value);
                  field.onChange(discountType === 'percentage' ? raw : Math.round(raw * 100));
                }}
              />
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Controller
            control={control}
            name="maxDiscountAmount"
            render={({ field }) => (
              <Input
                label="Max discount cap (₹)"
                type="number"
                helperText="Only applies to a percentage discount."
                value={field.value != null ? field.value / 100 : ''}
                onChange={(e) =>
                  field.onChange(
                    e.target.value === '' ? undefined : Math.round(Number(e.target.value) * 100),
                  )
                }
              />
            )}
          />
          <Controller
            control={control}
            name="minOrderValue"
            render={({ field }) => (
              <Input
                label="Minimum order (₹)"
                type="number"
                value={field.value != null ? field.value / 100 : ''}
                onChange={(e) =>
                  field.onChange(
                    e.target.value === '' ? 0 : Math.round(Number(e.target.value) * 100),
                  )
                }
              />
            )}
          />
        </div>

        <div className="bg-primary-soft rounded-md p-3 text-sm">
          Preview: {formatRupees(SAMPLE_ORDER_PAISE)} order →{' '}
          <strong>{formatRupees(previewTotal)}</strong> ({formatRupees(previewDiscount)} off)
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Controller
            control={control}
            name="validFrom"
            render={({ field }) => (
              <DatePicker
                label="Valid from"
                required
                value={field.value ?? null}
                onChange={(d) => field.onChange(d ?? undefined)}
              />
            )}
          />
          <Controller
            control={control}
            name="validUntil"
            render={({ field }) => (
              <DatePicker
                label="Valid until"
                required
                value={field.value ?? null}
                onChange={(d) => field.onChange(d ?? undefined)}
                error={errors.validUntil?.message}
              />
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Controller
            control={control}
            name="usageLimitTotal"
            render={({ field }) => (
              <Input
                label="Total usage limit"
                type="number"
                helperText="Blank = unlimited."
                value={field.value ?? ''}
                onChange={(e) =>
                  field.onChange(e.target.value === '' ? undefined : Number(e.target.value))
                }
              />
            )}
          />
          <Input
            label="Per-user limit"
            type="number"
            required
            error={errors.usageLimitPerUser?.message}
            {...register('usageLimitPerUser', { valueAsNumber: true })}
          />
        </div>

        <Controller
          control={control}
          name="firstOrderOnly"
          render={({ field }) => (
            <Checkbox
              label="First order only"
              checked={field.value}
              onCheckedChange={(c) => field.onChange(c === true)}
            />
          )}
        />
        <Controller
          control={control}
          name="isActive"
          render={({ field }) => (
            <Checkbox
              label="Active"
              checked={field.value}
              onCheckedChange={(c) => field.onChange(c === true)}
            />
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {coupon ? 'Save changes' : 'Create coupon'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
