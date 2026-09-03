import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Max-width 1200px, responsive gutters — see docs/DESIGN_SYSTEM.md §4. */
export function Container({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactNode {
  return (
    <div
      className={cn('mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8', className)}
      {...props}
    />
  );
}
