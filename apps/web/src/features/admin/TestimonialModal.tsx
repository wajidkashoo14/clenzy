'use client';

import type { CreateTestimonialInput } from '@clenzy/shared';
import { createTestimonialInputSchema } from '@clenzy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import {
  createTestimonial,
  updateTestimonial,
  type AdminTestimonial,
} from '@/features/admin/contentApi';
import { ApiError } from '@/lib/api-client';
import { applyApiErrorToForm } from '@/lib/form-helpers';
import { toast } from '@/lib/toast';

const RATING_OPTIONS = [1, 2, 3, 4, 5].map((n) => ({
  value: String(n),
  label: `${n} star${n === 1 ? '' : 's'}`,
}));

export interface TestimonialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testimonial: AdminTestimonial | null;
  onSaved: () => void;
}

export function TestimonialModal({
  open,
  onOpenChange,
  testimonial,
  onSaved,
}: TestimonialModalProps): ReactNode {
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTestimonialInput>({
    resolver: zodResolver(createTestimonialInputSchema),
    defaultValues: { name: '', area: '', rating: 5, text: '', image: undefined, isFeatured: false },
  });

  useEffect(() => {
    if (!open) return;
    reset(
      testimonial
        ? {
            name: testimonial.name,
            area: testimonial.area,
            rating: testimonial.rating,
            text: testimonial.text,
            image: testimonial.image,
            isFeatured: testimonial.isFeatured,
          }
        : { name: '', area: '', rating: 5, text: '', image: undefined, isFeatured: false },
    );
  }, [open, testimonial, reset]);

  async function onSubmit(data: CreateTestimonialInput): Promise<void> {
    try {
      if (testimonial) await updateTestimonial(testimonial._id, data);
      else await createTestimonial(data);
      toast.success(testimonial ? 'Testimonial updated' : 'Testimonial created');
      onSaved();
      onOpenChange(false);
    } catch (error) {
      const message = applyApiErrorToForm(error, setError);
      toast.error(
        error instanceof ApiError ? error.code.replace(/_/g, ' ') : 'Could not save testimonial',
        { description: message },
      );
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={testimonial ? 'Edit testimonial' : 'New testimonial'}
    >
      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        noValidate
        className="flex flex-col gap-4"
      >
        <Input label="Customer name" required error={errors.name?.message} {...register('name')} />
        <Input label="Area" error={errors.area?.message} {...register('area')} />
        <Controller
          control={control}
          name="rating"
          render={({ field }) => (
            <Select
              label="Rating"
              options={RATING_OPTIONS}
              value={String(field.value)}
              onValueChange={(v) => field.onChange(Number(v))}
            />
          )}
        />
        <Textarea
          label="Testimonial text"
          required
          maxLength={1000}
          error={errors.text?.message}
          {...register('text')}
        />
        <Input
          label="Photo URL"
          helperText="Optional — a Cloudinary upload widget isn't wired up yet, paste a hosted image URL."
          error={errors.image?.message}
          {...register('image')}
        />
        <Controller
          control={control}
          name="isFeatured"
          render={({ field }) => (
            <Checkbox
              label="Feature on homepage"
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
            {testimonial ? 'Save changes' : 'Create testimonial'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
