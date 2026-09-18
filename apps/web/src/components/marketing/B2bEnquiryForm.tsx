'use client';

import { b2bEnquiryInputSchema, type B2bEnquiryInput } from '@clenzy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RadioGroup } from '@/components/ui/RadioGroup';
import { Textarea } from '@/components/ui/Textarea';
import { apiPost } from '@/lib/api-client';
import { applyApiErrorToForm } from '@/lib/form-helpers';
import { toast } from '@/lib/toast';

const BUSINESS_TYPE_OPTIONS = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'houseboat', label: 'Houseboat' },
  { value: 'guesthouse', label: 'Guesthouse' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'other', label: 'Other' },
];

export function B2bEnquiryForm(): ReactNode {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<B2bEnquiryInput>({ resolver: zodResolver(b2bEnquiryInputSchema) });

  async function onSubmit(data: B2bEnquiryInput): Promise<void> {
    try {
      await apiPost('/api/v1/b2b-enquiries', data);
      setSubmitted(true);
      reset();
    } catch (error) {
      const message = applyApiErrorToForm(error, setError);
      toast.error('Could not submit your enquiry', { description: message });
    }
  }

  if (submitted) {
    return (
      <div className="border-success bg-success-soft rounded-lg border p-6" role="status">
        <p className="text-success font-semibold">Enquiry received</p>
        <p className="text-text-muted mt-1 text-sm">
          Our commercial team will reach out within one business day.
        </p>
        <Button size="sm" variant="secondary" className="mt-4" onClick={() => setSubmitted(false)}>
          Submit another enquiry
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <Input label="Your name" required error={errors.name?.message} {...register('name')} />
      <Input
        label="Business name"
        required
        error={errors.businessName?.message}
        {...register('businessName')}
      />

      <Controller
        control={control}
        name="businessType"
        render={({ field }) => (
          <RadioGroup
            label="Business type"
            options={BUSINESS_TYPE_OPTIONS}
            value={field.value}
            onValueChange={field.onChange}
          />
        )}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        <Input
          label="Email"
          required
          type="email"
          inputMode="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
      </div>

      <Textarea
        label="Tell us about your linen/laundry volume (optional)"
        maxLength={1000}
        {...register('message')}
      />

      <div className="hidden" aria-hidden="true">
        <label htmlFor="b2b-website">Leave this field empty</label>
        <input id="b2b-website" tabIndex={-1} autoComplete="off" {...register('website')} />
      </div>

      <Button type="submit" size="lg" isLoading={isSubmitting} className="mt-2">
        Submit enquiry
      </Button>
    </form>
  );
}
