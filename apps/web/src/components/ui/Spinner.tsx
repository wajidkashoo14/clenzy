import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

const sizeClasses = {
  sm: 'size-4',
  md: 'size-6',
  lg: 'size-8',
} as const;

export interface SpinnerProps {
  size?: keyof typeof sizeClasses;
  className?: string;
  /** Screen-reader text — defaults to "Loading". Pass "" only if a parent already announces the state. */
  label?: string;
}

export function Spinner({ size = 'md', className, label = 'Loading' }: SpinnerProps): ReactNode {
  return (
    <span role="status" className="inline-flex">
      <Loader2
        className={cn('text-primary animate-spin', sizeClasses[size], className)}
        aria-hidden="true"
      />
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}
