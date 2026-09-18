'use client';

import type { CreateSlotTemplateInput } from '@clenzy/shared';
import { createSlotTemplateInputSchema } from '@clenzy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import {
  createSlotTemplate,
  updateSlotTemplate,
  type AdminSlotTemplate,
} from '@/features/admin/slotsApi';
import { ApiError } from '@/lib/api-client';
import { applyApiErrorToForm } from '@/lib/form-helpers';
import { toast } from '@/lib/toast';

const DAY_OPTIONS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
].map((label, value) => ({
  value: String(value),
  label,
}));

export interface SlotTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: AdminSlotTemplate | null;
  onSaved: () => void;
}

export function SlotTemplateModal({
  open,
  onOpenChange,
  template,
  onSaved,
}: SlotTemplateModalProps): ReactNode {
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateSlotTemplateInput>({
    resolver: zodResolver(createSlotTemplateInputSchema),
    defaultValues: {
      type: 'pickup',
      dayOfWeek: 1,
      window: '09:00-11:00',
      label: '9 AM – 11 AM',
      capacity: 15,
      cutoffMinutesBefore: 0,
    },
  });

  useEffect(() => {
    if (!open) return;
    reset(
      template
        ? {
            type: template.type,
            dayOfWeek: template.dayOfWeek,
            window: template.window,
            label: template.label,
            capacity: template.capacity,
            cutoffMinutesBefore: template.cutoffMinutesBefore,
          }
        : {
            type: 'pickup',
            dayOfWeek: 1,
            window: '09:00-11:00',
            label: '9 AM – 11 AM',
            capacity: 15,
            cutoffMinutesBefore: 0,
          },
    );
  }, [open, template, reset]);

  async function onSubmit(data: CreateSlotTemplateInput): Promise<void> {
    try {
      if (template) await updateSlotTemplate(template._id, data);
      else await createSlotTemplate(data);
      toast.success(template ? 'Template updated' : 'Template created');
      onSaved();
      onOpenChange(false);
    } catch (error) {
      const message = applyApiErrorToForm(error, setError);
      toast.error(
        error instanceof ApiError ? error.code.replace(/_/g, ' ') : 'Could not save template',
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
      title={template ? 'Edit slot template' : 'New slot template'}
    >
      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        noValidate
        className="flex flex-col gap-4"
      >
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <Select
              label="Type"
              options={[
                { value: 'pickup', label: 'Pickup' },
                { value: 'delivery', label: 'Delivery' },
              ]}
              value={field.value}
              onValueChange={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="dayOfWeek"
          render={({ field }) => (
            <Select
              label="Day of week"
              options={DAY_OPTIONS}
              value={String(field.value)}
              onValueChange={(v) => field.onChange(Number(v))}
            />
          )}
        />
        <Input
          label="Window (HH:MM-HH:MM)"
          required
          placeholder="09:00-11:00"
          error={errors.window?.message}
          {...register('window')}
        />
        <Input label="Label" required error={errors.label?.message} {...register('label')} />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Capacity"
            type="number"
            required
            error={errors.capacity?.message}
            {...register('capacity', { valueAsNumber: true })}
          />
          <Input
            label="Cutoff (minutes before)"
            type="number"
            error={errors.cutoffMinutesBefore?.message}
            {...register('cutoffMinutesBefore', { valueAsNumber: true })}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {template ? 'Save changes' : 'Create template'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
