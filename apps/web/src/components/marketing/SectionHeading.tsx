import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Shared section heading — eyebrow pill, display title, optional lede. The
 * eyebrow pill (soft tint + accent dot) is the 2026-refresh signature that
 * replaces the plain uppercase eyebrow. Server component: pure markup.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  className?: string;
}): ReactNode {
  return (
    <div className={cn('max-w-xl', className)}>
      <span className="bg-primary-soft text-primary inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-[0.14em] uppercase">
        <span className="bg-accent size-1.5 rounded-full" aria-hidden="true" />
        {eyebrow}
      </span>
      <h2 className="font-heading text-text mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {title}
      </h2>
      {description && <p className="text-text-muted mt-4 text-base">{description}</p>}
    </div>
  );
}
