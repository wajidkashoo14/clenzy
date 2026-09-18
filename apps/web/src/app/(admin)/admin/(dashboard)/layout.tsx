import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AdminLayoutShell } from '@/features/admin/AdminLayoutShell';

// noindex/nofollow per docs/ADMIN_DASHBOARD.md §15 — /admin must never be crawled.
export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export default function AdminDashboardLayout({ children }: { children: ReactNode }) {
  return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
