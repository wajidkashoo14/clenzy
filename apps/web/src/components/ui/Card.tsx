import { type VariantProps, cva } from 'class-variance-authority';
import type { HTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '@/lib/cn';

/**
 * Generic card primitive — see docs/DESIGN_SYSTEM.md §5. Specialized cards
 * (service card, item row, pricing card, order card, stat card) are built by
 * composing this in the feature that needs them, not as separate primitives.
 */
const cardVariants = cva('rounded-lg border border-border bg-surface shadow-sm', {
  variants: {
    padding: {
      none: '',
      sm: 'p-4',
      md: 'p-5',
      lg: 'p-6',
    },
    interactive: {
      true: [
        'transition-[transform,box-shadow,border-color] duration-base ease-out',
        'hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-lg',
        'focus-visible:shadow-focus focus-visible:outline-none',
      ],
      false: '',
    },
  },
  defaultVariants: { padding: 'md', interactive: false },
});

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {
  ref?: Ref<HTMLDivElement>;
}

export function Card({ className, padding, interactive, ref, ...props }: CardProps): ReactNode {
  return (
    <div ref={ref} className={cn(cardVariants({ padding, interactive }), className)} {...props} />
  );
}
