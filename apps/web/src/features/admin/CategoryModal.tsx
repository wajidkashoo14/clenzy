'use client';

import type { CreateCategoryInput } from '@clenzy/shared';
import { createCategoryInputSchema } from '@clenzy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { createCategory, updateCategory } from '@/features/admin/catalogApi';
import type { AdminCategory } from '@/features/admin/catalogTypes';
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

export interface CategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: AdminCategory | null;
  onSaved: () => void;
}

export function CategoryModal({
  open,
  onOpenChange,
  category,
  onSaved,
}: CategoryModalProps): ReactNode {
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategoryInputSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      shortDescription: '',
      icon: 'Shirt',
      turnaroundHours: 48,
      expressAvailable: false,
    },
  });

  useEffect(() => {
    if (!open) return;
    reset(
      category
        ? {
            name: category.name,
            slug: category.slug,
            description: category.description,
            shortDescription: category.shortDescription,
            icon: category.icon,
            turnaroundHours: category.turnaroundHours,
            expressAvailable: category.expressAvailable,
          }
        : {
            name: '',
            slug: '',
            description: '',
            shortDescription: '',
            icon: 'Shirt',
            turnaroundHours: 48,
            expressAvailable: false,
          },
    );
  }, [open, category, reset]);

  const name = useWatch({ control, name: 'name' });
  useEffect(() => {
    if (!category) setValue('slug', slugify(name || ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, category]);

  async function onSubmit(data: CreateCategoryInput): Promise<void> {
    try {
      if (category) await updateCategory(category._id, data);
      else await createCategory(data);
      toast.success(category ? 'Category updated' : 'Category created');
      onSaved();
      onOpenChange(false);
    } catch (error) {
      const message = applyApiErrorToForm(error, setError);
      toast.error(
        error instanceof ApiError ? error.code.replace(/_/g, ' ') : 'Could not save category',
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
      title={category ? 'Edit category' : 'New category'}
    >
      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        noValidate
        className="flex flex-col gap-4"
      >
        <Input label="Name" required error={errors.name?.message} {...register('name')} />
        <Input
          label="Slug"
          required
          disabled={Boolean(category)}
          helperText={
            category
              ? 'Locked after creation.'
              : 'Auto-generated from the name — editable before saving.'
          }
          error={errors.slug?.message}
          {...register('slug')}
        />
        <Textarea
          label="Short description"
          required
          maxLength={300}
          error={errors.shortDescription?.message}
          {...register('shortDescription')}
        />
        <Textarea
          label="Full description"
          required
          maxLength={2000}
          error={errors.description?.message}
          {...register('description')}
        />
        <Input
          label="Icon"
          required
          helperText="A Lucide icon export name, e.g. Shirt, Sparkles, Home."
          error={errors.icon?.message}
          {...register('icon')}
        />
        <Input
          label="Turnaround (hours)"
          type="number"
          required
          error={errors.turnaroundHours?.message}
          {...register('turnaroundHours', { valueAsNumber: true })}
        />
        <Controller
          control={control}
          name="expressAvailable"
          render={({ field }) => (
            <Checkbox
              label="Express available"
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
            />
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {category ? 'Save changes' : 'Create category'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
