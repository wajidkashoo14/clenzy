import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { BrandMark } from '@/components/layout/BrandMark';
import { Container } from '@/components/layout/Container';

/**
 * Chrome for login/reset flows. 2026 refresh: a two-column split on desktop —
 * decorative brand panel with ambient mesh + floating proof chips on the
 * left, the form card on the right — collapsing to the simple centered card
 * on mobile. Deliberately not sharing (marketing)'s layout: auth pages
 * benefit from fewer distractions, and it avoids wiring up nav content those
 * pages don't use. The panel is aria-hidden and purely decorative.
 */
const PANEL_POINTS = ['Free pickup & delivery', 'Transparent pricing', 'Re-clean guarantee'];

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
    <main className="bg-hero-mesh relative flex min-h-full items-center justify-center overflow-hidden px-4 py-16">
      {/* Ambient brand glow — decorative only */}
      <div
        className="from-primary-soft pointer-events-none absolute -top-24 -left-24 size-96 rounded-full bg-gradient-to-br to-transparent opacity-60 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative grid w-full max-w-4xl items-center gap-10 lg:grid-cols-2">
        {/* Brand panel (desktop only) */}
        <div className="hidden lg:block" aria-hidden="true">
          <BrandMark />
          <p className="font-heading text-text mt-8 text-3xl leading-tight font-semibold">
            Fabric care that treats your clothes like they’re yours.
          </p>
          <ul className="mt-8 flex flex-col gap-3">
            {PANEL_POINTS.map((point, i) => (
              <li
                key={point}
                className="text-text-muted flex items-center gap-2.5 text-sm"
                style={{ animationDelay: `${i * 0.4}s` }}
              >
                <span className="bg-success-soft text-success flex size-5 items-center justify-center rounded-full">
                  <CheckCircle2 className="size-3.5" />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* Form card */}
        <Container className="max-w-md px-0 sm:px-0">
          <div className="flex justify-center lg:hidden">
            <Link
              href="/"
              className="focus-visible:shadow-focus rounded-full focus-visible:outline-none"
            >
              <BrandMark />
            </Link>
          </div>

          <div className="border-border bg-surface mt-6 rounded-xl border p-6 shadow-lg sm:p-8 lg:mt-0">
            <h1 className="font-heading text-text text-xl font-semibold">{title}</h1>
            {subtitle && <p className="text-text-muted mt-1.5 text-sm">{subtitle}</p>}
            <div className="mt-6">{children}</div>
          </div>
        </Container>
      </div>
    </main>
  );
}
