'use client';

import { contactInputSchema, type ContactInput } from '@clenzy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { apiPost } from '@/lib/api-client';
import { applyApiErrorToForm } from '@/lib/form-helpers';
import { toast } from '@/lib/toast';

export function ContactForm(): ReactNode {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({ resolver: zodResolver(contactInputSchema) });

  async function onSubmit(data: ContactInput): Promise<void> {
    try {
      await apiPost('/api/v1/contact', data);
      setSubmitted(true);
      reset();
    } catch (error) {
      const message = applyApiErrorToForm(error, setError);
      toast.error('Could not send your message', { description: message });
    }
  }

  if (submitted) {
    return (
      <div className="border-success bg-success-soft rounded-lg border p-6" role="status">
        <p className="text-success font-semibold">Message sent</p>
        <p className="text-text-muted mt-1 text-sm">
          Thanks for reaching out — we’ll get back to you shortly.
        </p>
        <Button size="sm" variant="secondary" className="mt-4" onClick={() => setSubmitted(false)}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
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
      <Input
        label="Email (optional)"
        type="email"
        inputMode="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <Textarea
        label="Message"
        required
        maxLength={1000}
        error={errors.message?.message}
        {...register('message')}
      />

      {/* Honeypot — hidden from real users via CSS, not display:none (some screen readers still skip it correctly via aria-hidden + tabIndex). */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="contact-website">Leave this field empty</label>
        <input id="contact-website" tabIndex={-1} autoComplete="off" {...register('website')} />
      </div>

      <Button type="submit" size="lg" isLoading={isSubmitting} className="mt-2">
        Send message
      </Button>
    </form>
  );
}
