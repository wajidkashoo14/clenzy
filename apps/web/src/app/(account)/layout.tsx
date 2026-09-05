'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Container } from '@/components/layout/Container';
import { brand } from '@/content/brand';
import { AuthSessionInit } from '@/features/auth/AuthSessionInit';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { useAuthStore } from '@/stores/authStore';

/**
 * Minimal chrome for the customer account area — see docs/ARCHITECTURE.md §4
 * `(account)/`. Only one placeholder page exists so far (Phase 4 proves the
 * protected-route mechanism); a fuller account nav (orders, addresses,
 * profile) lands with the customer-dashboard phase.
 */
export default function AccountLayout({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);

  return (
    <>
      <AuthSessionInit />
      <header className="border-border border-b">
        <Container className="flex h-14 items-center justify-between">
          <Link href="/" className="font-heading text-primary text-lg font-semibold">
            {brand.name}
          </Link>
          <div className="flex items-center gap-2">
            {user && <NotificationBell />}
            <Link href="/" className="text-text-muted hover:text-text text-sm underline">
              Back to site
            </Link>
          </div>
        </Container>
      </header>
      <main className="flex-1">
        <Container className="py-10">{children}</Container>
      </main>
    </>
  );
}
