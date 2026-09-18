import type { Metadata } from 'next';
import { AuthShell } from '@/components/layout/AuthShell';
import { brand } from '@/content/brand';
import { ForgotPasswordForm } from '@/features/auth/ForgotPasswordForm';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: `Forgot password | ${brand.name}`,
  description: 'Reset the password for your staff or admin account.',
  path: '/forgot-password',
});

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter your email and we'll send a reset link."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
