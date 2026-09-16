import { type VariantProps, cva } from 'class-variance-authority';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

const badgeVariants = cva(
  [
    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
    // Hairline inset ring in the badge's own color keeps the tint legible on
    // white surfaces without introducing new per-color values.
    'shadow-[inset_0_0_0_1px_color-mix(in_srgb,currentColor_16%,transparent)]',
  ],
  {
    variants: {
      color: {
        primary: 'bg-primary-soft text-primary',
        secondary: 'bg-secondary-soft text-secondary',
        accent:
          'bg-accent-soft text-[color-mix(in_srgb,var(--color-accent)_75%,var(--color-text))]',
        success: 'bg-success-soft text-success',
        warning: 'bg-warning-soft text-warning',
        error: 'bg-error-soft text-error',
        info: 'bg-info-soft text-info',
        neutral: 'bg-surface-alt text-text-muted',
      },
    },
    defaultVariants: { color: 'neutral' },
  },
);

export interface BadgeProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, 'color'>, VariantProps<typeof badgeVariants> {
  /** Shows a small leading dot in the badge's color — useful for status badges. */
  dot?: boolean;
}

export function Badge({ className, color, dot, children, ...props }: BadgeProps): ReactNode {
  return (
    <span className={cn(badgeVariants({ color }), className)} {...props}>
      {dot && <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}
