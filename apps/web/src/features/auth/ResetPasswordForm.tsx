'use client';

import { resetPasswordInputSchema } from '@clenzy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { resetPassword } from '@/features/auth/api';
import { ApiError } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { z } from 'zod';

// The token comes from the URL, not a field the user fills in — split it out
// of the shared schema so the form only validates what's actually rendered.
const formSchema = resetPasswordInputSchema.pick({ newPassword: true });
type FormInput = z.infer<typeof formSchema>;

export function ResetPasswordForm({ token }: { token: string }): ReactNode {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({ resolver: zodResolver(formSchema) });

  async function onSubmit(data: FormInput): Promise<void> {
    try {
      await resetPassword(token, data.newPassword);
      toast.success('Password reset — please sign in again.');
      router.push('/admin/login');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Could not reset your password.';
      toast.error('Could not reset your password', { description: message });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <Input
        label="New password"
        type="password"
        required
        autoComplete="new-password"
        error={errors.newPassword?.message}
        {...register('newPassword')}
      />
      <Button type="submit" size="lg" isLoading={isSubmitting}>
        Reset password
      </Button>
    </form>
  );
}
