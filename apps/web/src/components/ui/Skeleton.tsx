import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Shimmer placeholder — see docs/ANIMATION_SYSTEM.md §4.11. Match the real content's dimensions exactly to avoid CLS on swap. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactNode {
  return (
    <div
      className={cn(
        'bg-surface-alt relative overflow-hidden rounded-md',
        'before:absolute before:inset-0 before:animate-[shimmer_1.4s_linear_infinite]',
        'before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent',
        // Dark theme: same sweep, much fainter sheen (html carries data-theme).
        '[[data-theme=dark]_&]:before:via-white/10',
        className,
      )}
      aria-hidden="true"
      {...props}
    />
  );
}
