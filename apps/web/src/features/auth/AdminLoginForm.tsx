'use client';

import { hasRole, loginInputSchema, type LoginInput } from '@clenzy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { loginWithPassword } from '@/features/auth/api';
import { applyApiErrorToForm } from '@/lib/form-helpers';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/lib/toast';

export function AdminLoginForm(): ReactNode {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAuthStore((state) => state.setUser);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginInputSchema) });

  async function onSubmit(data: LoginInput): Promise<void> {
    try {
      const { user } = await loginWithPassword(data.email, data.password);
      setUser(user);
      const fallback =
        user.role === 'agent' ? '/agent/tasks' : hasRole(user.role, 'staff') ? '/admin' : '/';
      router.push(searchParams.get('redirect') || fallback);
    } catch (error) {
      const message = applyApiErrorToForm(error, setError);
      toast.error('Could not sign in', { description: message });
    }
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
      <Input
        label="Password"
        type="password"
        required
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />

      <Button type="submit" size="lg" isLoading={isSubmitting} className="mt-2">
        Sign in
      </Button>

      <Link
        href="/forgot-password"
        className="text-text-muted hover:text-text text-center text-sm underline"
      >
        Forgot your password?
      </Link>
    </form>
  );
}
