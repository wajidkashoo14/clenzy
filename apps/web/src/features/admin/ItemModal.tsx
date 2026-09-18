'use client';

import type { CreateItemInput } from '@clenzy/shared';
import { createItemInputSchema } from '@clenzy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { createItem, updateItem } from '@/features/admin/catalogApi';
import type { AdminCategory, AdminItem } from '@/features/admin/catalogTypes';
import { ApiError } from '@/lib/api-client';
import { applyApiErrorToForm } from '@/lib/form-helpers';
import { toast } from '@/lib/toast';

const UNIT_OPTIONS = [
  { value: 'piece', label: 'Piece' },
  { value: 'kg', label: 'Kilogram' },
  { value: 'sqft', label: 'Square foot' },
  { value: 'set', label: 'Set' },
  { value: 'pair', label: 'Pair' },
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export interface ItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: AdminItem | null;
  categories: AdminCategory[];
  onSaved: () => void;
}

export function ItemModal({
  open,
  onOpenChange,
  item,
  categories,
  onSaved,
}: ItemModalProps): ReactNode {
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateItemInput>({
    resolver: zodResolver(createItemInputSchema),
    defaultValues: {
      categoryId: categories[0]?._id ?? '',
      name: '',
      slug: '',
      unit: 'piece',
      price: 0,
      taxRatePercent: 0,
      minQuantity: 1,
      maxQuantity: 99,
      isPopular: false,
    },
  });

  useEffect(() => {
    if (!open) return;
    reset(
      item
        ? {
            categoryId: item.categoryId,
            name: item.name,
            slug: item.slug,
            description: item.description,
            careNote: item.careNote,
            unit: item.unit,
            price: item.price,
            mrp: item.mrp,
            expressPrice: item.expressPrice,
            taxRatePercent: item.taxRatePercent,
            hsnCode: item.hsnCode,
            minQuantity: item.minQuantity,
            maxQuantity: item.maxQuantity,
            turnaroundHours: item.turnaroundHours,
            isPopular: item.isPopular,
          }
        : {
            categoryId: categories[0]?._id ?? '',
            name: '',
            slug: '',
            unit: 'piece',
            price: 0,
            taxRatePercent: 0,
            minQuantity: 1,
            maxQuantity: 99,
            isPopular: false,
          },
    );
  }, [open, item, categories, reset]);

  const name = useWatch({ control, name: 'name' });
  useEffect(() => {
    if (!item) setValue('slug', slugify(name || ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, item]);

  async function onSubmit(data: CreateItemInput): Promise<void> {
    try {
      if (item) await updateItem(item._id, data);
      else await createItem(data);
      toast.success(item ? 'Item updated' : 'Item created');
      onSaved();
      onOpenChange(false);
    } catch (error) {
      const message = applyApiErrorToForm(error, setError);
      toast.error(
        error instanceof ApiError ? error.code.replace(/_/g, ' ') : 'Could not save item',
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
      title={item ? 'Edit item' : 'New item'}
      size="md"
    >
      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        noValidate
        className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1"
      >
        <Controller
          control={control}
          name="categoryId"
          render={({ field }) => (
            <Select
              label="Category"
              required
              options={categories.map((c) => ({ value: c._id, label: c.name }))}
              value={field.value}
              onValueChange={field.onChange}
              error={errors.categoryId?.message}
            />
          )}
        />
        <Input label="Name" required error={errors.name?.message} {...register('name')} />
        <Input
          label="Slug"
          required
          disabled={Boolean(item)}
          helperText={item ? 'Locked after creation.' : 'Auto-generated — editable before saving.'}
          error={errors.slug?.message}
          {...register('slug')}
        />
        <Textarea
          label="Description"
          maxLength={2000}
          error={errors.description?.message}
          {...register('description')}
        />
        <Textarea
          label="Care note"
          maxLength={500}
          error={errors.careNote?.message}
          {...register('careNote')}
        />

        <Controller
          control={control}
          name="unit"
          render={({ field }) => (
            <Select
              label="Unit"
              required
              options={UNIT_OPTIONS}
              value={field.value}
              onValueChange={field.onChange}
            />
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <Controller
            control={control}
            name="price"
            render={({ field }) => (
              <Input
                label="Price (₹)"
                type="number"
                required
                error={errors.price?.message}
                value={field.value != null ? field.value / 100 : ''}
                onChange={(e) =>
                  field.onChange(
                    e.target.value === '' ? 0 : Math.round(Number(e.target.value) * 100),
                  )
                }
              />
            )}
          />
          <Controller
            control={control}
            name="expressPrice"
            render={({ field }) => (
              <Input
                label="Express price (₹)"
                type="number"
                error={errors.expressPrice?.message}
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
        <div className="grid grid-cols-2 gap-3">
          <Controller
            control={control}
            name="mrp"
            render={({ field }) => (
              <Input
                label="MRP (₹)"
                type="number"
                error={errors.mrp?.message}
                value={field.value != null ? field.value / 100 : ''}
                onChange={(e) =>
                  field.onChange(
                    e.target.value === '' ? undefined : Math.round(Number(e.target.value) * 100),
                  )
                }
              />
            )}
          />
          <Input
            label="Tax rate (%)"
            type="number"
            error={errors.taxRatePercent?.message}
            {...register('taxRatePercent', { valueAsNumber: true })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="HSN code" error={errors.hsnCode?.message} {...register('hsnCode')} />
          <Input
            label="Turnaround override (hours)"
            type="number"
            error={errors.turnaroundHours?.message}
            {...register('turnaroundHours', {
              setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
            })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Min quantity"
            type="number"
            required
            error={errors.minQuantity?.message}
            {...register('minQuantity', { valueAsNumber: true })}
          />
          <Input
            label="Max quantity"
            type="number"
            required
            error={errors.maxQuantity?.message}
            {...register('maxQuantity', { valueAsNumber: true })}
          />
        </div>

        <Controller
          control={control}
          name="isPopular"
          render={({ field }) => (
            <Checkbox
              label="Popular"
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
            {item ? 'Save changes' : 'Create item'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
