import Link from 'next/link';
import type { ReactNode } from 'react';
import { Container } from '@/components/layout/Container';
import { brand } from '@/content/brand';

/**
 * Minimal chrome for login/reset flows — just the wordmark, no full nav or
 * footer. Deliberately not sharing (marketing)'s layout: auth pages benefit
 * from fewer distractions, and it avoids wiring up nav content those pages
 * don't use.
 */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-full flex-col items-center justify-center px-4 py-16">
      <Link href="/" className="font-heading text-primary text-2xl font-semibold">
        {brand.name}
      </Link>

      <Container className="mt-8 max-w-sm">
        <div className="border-border bg-surface rounded-lg border p-6 sm:p-8">
          <h1 className="font-heading text-text text-xl font-semibold">{title}</h1>
          {subtitle && <p className="text-text-muted mt-1.5 text-sm">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </Container>
    </main>
  );
}
