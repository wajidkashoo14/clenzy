'use client';

import { forgotPasswordInputSchema, type ForgotPasswordInput } from '@clenzy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { forgotPassword } from '@/features/auth/api';
import { toast } from '@/lib/toast';

export function ForgotPasswordForm(): ReactNode {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordInputSchema) });

  async function onSubmit(data: ForgotPasswordInput): Promise<void> {
    try {
      await forgotPassword(data.email);
      setSent(true);
    } catch {
      // The endpoint always reports success to avoid revealing which emails
      // have accounts — a network-level failure is the only realistic error.
      toast.error('Something went wrong', { description: 'Please try again.' });
    }
  }

  if (sent) {
    return (
      <div
        className="border-border bg-surface-alt text-text-muted rounded-lg border p-4 text-sm"
        role="status"
      >
        If that email has an account, a reset link has been sent.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <Input
        label="Email"
        type="email"
        required
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <Button type="submit" size="lg" isLoading={isSubmitting}>
        Send reset link
      </Button>
    </form>
  );
}
