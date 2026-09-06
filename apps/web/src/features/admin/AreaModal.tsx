'use client';

import type { CreateAreaInput } from '@clenzy/shared';
import { createAreaInputSchema } from '@clenzy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import type { KeyboardEvent, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { createArea, updateArea, type AdminArea } from '@/features/admin/areasApi';
import { ApiError } from '@/lib/api-client';
import { applyApiErrorToForm } from '@/lib/form-helpers';
import { toast } from '@/lib/toast';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function PincodeChips({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}): ReactNode {
  const [draft, setDraft] = useState('');

  function commit(): void {
    const digits = draft.replace(/\D/g, '').slice(0, 6);
    if (digits.length === 6 && !value.includes(digits)) onChange([...value, digits]);
    setDraft('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit();
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-text text-sm font-medium">
        Pincodes<span className="text-error ml-0.5">*</span>
      </label>
      <div className="border-border-strong bg-surface-alt flex flex-wrap items-center gap-1.5 rounded-md border px-2 py-1.5">
        {value.map((p) => (
          <span
            key={p}
            className="bg-primary-soft text-primary inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
          >
            {p}
            <button
              type="button"
              onClick={() => onChange(value.filter((v) => v !== p))}
              aria-label={`Remove ${p}`}
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          placeholder="Type a pincode, press Enter"
          className="text-text min-w-32 flex-1 bg-transparent px-1.5 py-1 text-sm outline-none"
        />
      </div>
    </div>
  );
}

export interface AreaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  area: AdminArea | null;
  onSaved: () => void;
}

export function AreaModal({ open, onOpenChange, area, onSaved }: AreaModalProps): ReactNode {
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateAreaInput>({
    resolver: zodResolver(createAreaInputSchema),
    defaultValues: {
      city: 'Srinagar',
      state: 'Jammu and Kashmir',
      area: '',
      slug: '',
      pincodes: [],
      pickupAvailable: true,
      deliveryAvailable: true,
      expressAvailable: false,
    },
  });

  useEffect(() => {
    if (!open) return;
    reset(
      area
        ? {
            city: area.city,
            state: area.state,
            area: area.area,
            slug: area.slug,
            pincodes: area.pincodes,
            pickupAvailable: area.pickupAvailable,
            deliveryAvailable: area.deliveryAvailable,
            expressAvailable: area.expressAvailable,
            deliveryFee: area.deliveryFee,
            minOrderValue: area.minOrderValue,
          }
        : {
            city: 'Srinagar',
            state: 'Jammu and Kashmir',
            area: '',
            slug: '',
            pincodes: [],
            pickupAvailable: true,
            deliveryAvailable: true,
            expressAvailable: false,
          },
    );
  }, [open, area, reset]);

  const areaName = useWatch({ control, name: 'area' });
  useEffect(() => {
    if (!area) setValue('slug', slugify(areaName || ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaName, area]);

  async function onSubmit(data: CreateAreaInput): Promise<void> {
    try {
      if (area) await updateArea(area._id, data);
      else await createArea(data);
      toast.success(area ? 'Area updated' : 'Area created');
      onSaved();
      onOpenChange(false);
    } catch (error) {
      const message = applyApiErrorToForm(error, setError);
      toast.error(
        error instanceof ApiError ? error.code.replace(/_/g, ' ') : 'Could not save area',
        {
          description: message,
        },
      );
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={area ? 'Edit area' : 'New area'}>
      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        noValidate
        className="flex flex-col gap-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <Input label="Area name" required error={errors.area?.message} {...register('area')} />
          <Input
            label="Slug"
            required
            disabled={Boolean(area)}
            helperText={area ? 'Locked after creation.' : 'Auto-generated.'}
            error={errors.slug?.message}
            {...register('slug')}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="City" required error={errors.city?.message} {...register('city')} />
          <Input label="State" required error={errors.state?.message} {...register('state')} />
        </div>

        <Controller
          control={control}
          name="pincodes"
          render={({ field }) => <PincodeChips value={field.value} onChange={field.onChange} />}
        />
        {errors.pincodes?.message && (
          <p className="text-error text-[13px]">{errors.pincodes.message}</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Controller
            control={control}
            name="deliveryFee"
            render={({ field }) => (
              <Input
                label="Delivery fee override (₹)"
                type="number"
                helperText="Blank uses the global default."
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
                label="Minimum order override (₹)"
                type="number"
                helperText="Blank uses the global default."
                value={field.value != null ? field.value / 100 : ''}
                onChange={(e) =>
                  field.onChange(
                    e.target.value === '' ? undefined : Math.round(Number(e.target.value) * 100),
                  )
                }
              />
            )}
          />
        </div>

        <Controller
          control={control}
          name="pickupAvailable"
          render={({ field }) => (
            <Checkbox
              label="Pickup available"
              checked={field.value}
              onCheckedChange={(c) => field.onChange(c === true)}
            />
          )}
        />
        <Controller
          control={control}
          name="deliveryAvailable"
          render={({ field }) => (
            <Checkbox
              label="Delivery available"
              checked={field.value}
              onCheckedChange={(c) => field.onChange(c === true)}
            />
          )}
        />
        <Controller
          control={control}
          name="expressAvailable"
          render={({ field }) => (
            <Checkbox
              label="Express available"
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
            {area ? 'Save changes' : 'Create area'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
