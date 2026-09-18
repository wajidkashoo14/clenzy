'use client';

import { leadInputSchema, type LeadInput } from '@clenzy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { SERVICE_AREAS } from '@/content/locations';
import { SERVICE_CATEGORIES } from '@/content/services';
import { apiPost } from '@/lib/api-client';
import { applyApiErrorToForm } from '@/lib/form-helpers';
import { toast } from '@/lib/toast';

const WINDOW_OPTIONS = [
  { value: '9-11', label: '9:00 – 11:00 AM' },
  { value: '11-13', label: '11:00 AM – 1:00 PM' },
  { value: '14-16', label: '2:00 – 4:00 PM' },
  { value: '16-18', label: '4:00 – 6:00 PM' },
  { value: '18-20', label: '6:00 – 8:00 PM' },
];

export function LeadForm(): ReactNode {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeadInput>({ resolver: zodResolver(leadInputSchema) });

  async function onSubmit(data: LeadInput): Promise<void> {
    try {
      await apiPost('/api/v1/leads', data);
      setSubmitted(true);
      reset();
    } catch (error) {
      const message = applyApiErrorToForm(error, setError);
      toast.error('Could not submit your request', { description: message });
    }
  }

  if (submitted) {
    return (
      <div
        className="border-success bg-success-soft flex flex-col items-center gap-3 rounded-lg border p-8 text-center"
        role="status"
      >
        <CheckCircle2 className="text-success size-8" aria-hidden="true" />
        <p className="text-text text-lg font-semibold">Request received</p>
        <p className="text-text-muted max-w-sm text-sm">
          Our team will call or WhatsApp you shortly to confirm your pickup.
        </p>
        <Button size="sm" variant="secondary" onClick={() => setSubmitted(false)}>
          Book another pickup
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Full name" required error={errors.name?.message} {...register('name')} />
        <Input
          label="Phone"
          prefix="+91"
          required
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          error={errors.phone?.message}
          {...register('phone')}
        />
      </div>

      <Controller
        control={control}
        name="area"
        render={({ field }) => (
          <Select
            label="Your area"
            placeholder="Select your area"
            options={SERVICE_AREAS.map((area) => ({ value: area.name, label: area.name }))}
            value={field.value}
            onValueChange={field.onChange}
            error={errors.area?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="serviceInterest"
        render={({ field }) => (
          <Select
            label="What do you need cleaned? (optional)"
            placeholder="Select a service"
            options={SERVICE_CATEGORIES.map((c) => ({ value: c.name, label: c.name }))}
            value={field.value}
            onValueChange={field.onChange}
          />
        )}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Controller
          control={control}
          name="preferredDate"
          render={({ field }) => (
            <DatePicker
              label="Preferred pickup date"
              value={field.value ? new Date(field.value) : null}
              onChange={(date) => field.onChange(date ? date.toISOString().slice(0, 10) : '')}
              minDate={new Date()}
            />
          )}
        />
        <Controller
          control={control}
          name="preferredWindow"
          render={({ field }) => (
            <Select
              label="Preferred time"
              placeholder="Select a window"
              options={WINDOW_OPTIONS}
              value={field.value}
              onValueChange={field.onChange}
            />
          )}
        />
      </div>

      <Textarea
        label="Anything we should know? (optional)"
        maxLength={500}
        {...register('message')}
      />

      <div className="hidden" aria-hidden="true">
        <label htmlFor="lead-website">Leave this field empty</label>
        <input id="lead-website" tabIndex={-1} autoComplete="off" {...register('website')} />
      </div>

      <Button type="submit" size="lg" isLoading={isSubmitting} className="mt-2">
        Request pickup
      </Button>
    </form>
  );
}
