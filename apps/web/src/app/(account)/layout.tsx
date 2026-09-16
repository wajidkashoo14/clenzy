'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { BrandMark } from '@/components/layout/BrandMark';
import { Container } from '@/components/layout/Container';
import { AuthSessionInit } from '@/features/auth/AuthSessionInit';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
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
              'shrink-0 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap',
              'duration-base transition-[background-color,color,box-shadow] ease-out',
              isActive
                ? 'bg-primary-soft text-primary shadow-sm'
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
      <header className="border-border bg-surface/80 sticky top-0 z-20 border-b backdrop-blur-lg">
        <Container className="flex h-14 items-center justify-between">
          <Link
            href="/"
            className="focus-visible:shadow-focus rounded-full focus-visible:outline-none"
          >
            <BrandMark />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user && <NotificationBell />}
            <Link
              href="/"
              className="text-text-muted hover:text-text hover:bg-surface-alt duration-base rounded-full px-3 py-1.5 text-sm underline transition-colors ease-out"
            >
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
