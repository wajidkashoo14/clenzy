import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthShell } from '@/components/layout/AuthShell';
import { brand } from '@/content/brand';
import { LoginForm } from '@/features/auth/LoginForm';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: `Log in | ${brand.name}`,
  description: `Log in to your ${brand.name} account with your phone number.`,
  path: '/login',
});

export default function LoginPage() {
  return (
    <AuthShell title="Log in" subtitle="We'll text you a one-time code — no password needed.">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
