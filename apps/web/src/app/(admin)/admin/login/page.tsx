import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthShell } from '@/components/layout/AuthShell';
import { brand } from '@/content/brand';
import { AdminLoginForm } from '@/features/auth/AdminLoginForm';
import { buildMetadata } from '@/lib/seo';

// noindex/nofollow per docs/ADMIN_DASHBOARD.md §15 — /admin must never be
// crawled or listed, in addition to the disallow rule in app/robots.ts.
export const metadata: Metadata = {
  ...buildMetadata({
    title: `Admin login | ${brand.name}`,
    description: 'Staff and admin sign-in.',
    path: '/admin/login',
  }),
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <AuthShell
      title="Staff, admin & agent sign-in"
      subtitle="Email and password required — OTP login isn't available here."
    >
      <Suspense>
        <AdminLoginForm />
      </Suspense>
    </AuthShell>
  );
}
