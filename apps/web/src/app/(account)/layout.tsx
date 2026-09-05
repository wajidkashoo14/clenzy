'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Container } from '@/components/layout/Container';
import { brand } from '@/content/brand';
import { AuthSessionInit } from '@/features/auth/AuthSessionInit';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/stores/authStore';

const NAV_ITEMS = [
  { href: '/account', label: 'Overview' },
  { href: '/account/orders', label: 'Orders' },
  { href: '/account/addresses', label: 'Addresses' },
  { href: '/account/profile', label: 'Profile' },
];

function AccountNav(): ReactNode {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto pb-2 lg:w-48 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === '/account' ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'shrink-0 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap',
              'duration-fast ease-standard transition-colors',
              isActive
                ? 'bg-primary-soft text-primary'
                : 'text-text-muted hover:bg-surface-alt hover:text-text',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Minimal chrome for the customer account area — see docs/ARCHITECTURE.md §4 `(account)/`. */
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
        <Container className="flex flex-col gap-6 py-8 lg:flex-row lg:items-start lg:gap-10 lg:py-10">
          <AccountNav />
          <div className="min-w-0 flex-1">{children}</div>
        </Container>
      </main>
    </>
  );
}
