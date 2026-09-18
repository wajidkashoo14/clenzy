import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/layout/AuthShell';
import { brand } from '@/content/brand';
import { ResetPasswordForm } from '@/features/auth/ResetPasswordForm';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: `Reset password | ${brand.name}`,
  description: 'Set a new password for your staff or admin account.',
  path: '/reset-password',
});

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <AuthShell title="Invalid link">
        <p className="text-text-muted text-sm">
          This reset link is missing its token. Request a new one from the{' '}
          <Link href="/forgot-password" className="hover:text-text underline">
            forgot password
          </Link>{' '}
          page.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set a new password">
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
