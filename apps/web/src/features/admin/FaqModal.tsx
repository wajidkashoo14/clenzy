'use client';

import type { CreateFaqInput } from '@clenzy/shared';
import { createFaqInputSchema } from '@clenzy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { createFaq, updateFaq, type AdminFaq } from '@/features/admin/contentApi';
import { RichTextEditor } from '@/features/admin/RichTextEditor';
import { ApiError } from '@/lib/api-client';
import { applyApiErrorToForm } from '@/lib/form-helpers';
import { toast } from '@/lib/toast';

export interface FaqModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  faq: AdminFaq | null;
  onSaved: () => void;
}

export function FaqModal({ open, onOpenChange, faq, onSaved }: FaqModalProps): ReactNode {
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateFaqInput>({
    resolver: zodResolver(createFaqInputSchema),
    defaultValues: { question: '', answer: '', category: 'general', sortOrder: 0 },
  });

  useEffect(() => {
    if (!open) return;
    reset(
      faq
        ? {
            question: faq.question,
            answer: faq.answer,
            category: faq.category,
            sortOrder: faq.sortOrder,
          }
        : { question: '', answer: '', category: 'general', sortOrder: 0 },
    );
  }, [open, faq, reset]);

  async function onSubmit(data: CreateFaqInput): Promise<void> {
    try {
      if (faq) await updateFaq(faq._id, data);
      else await createFaq(data);
      toast.success(faq ? 'FAQ updated' : 'FAQ created');
      onSaved();
      onOpenChange(false);
    } catch (error) {
      const message = applyApiErrorToForm(error, setError);
      toast.error(
        error instanceof ApiError ? error.code.replace(/_/g, ' ') : 'Could not save FAQ',
        {
          description: message,
        },
      );
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={faq ? 'Edit FAQ' : 'New FAQ'}>
      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        noValidate
        className="flex flex-col gap-4"
      >
        <Input
          label="Question"
          required
          error={errors.question?.message}
          {...register('question')}
        />
        <Input
          label="Category"
          required
          helperText="Groups related questions, e.g. pricing, pickup, payments."
          error={errors.category?.message}
          {...register('category')}
        />
        <Controller
          control={control}
          name="answer"
          render={({ field }) => (
            <RichTextEditor
              label="Answer"
              required
              value={field.value}
              onChange={field.onChange}
              error={errors.answer?.message}
            />
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {faq ? 'Save changes' : 'Create FAQ'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
