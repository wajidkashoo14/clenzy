import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { StatusColor } from '@/lib/orderStatus';
import type { LucideIcon } from 'lucide-react';

const colorClasses: Record<StatusColor, string> = {
  primary: 'bg-primary-soft text-primary',
  secondary: 'bg-secondary-soft text-secondary',
  accent: 'bg-accent-soft text-[color-mix(in_srgb,var(--color-accent)_65%,black)]',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  error: 'bg-error-soft text-error',
  neutral: 'bg-surface-alt text-text-muted',
};

export interface StatusPillProps extends HTMLAttributes<HTMLSpanElement> {
  label: string;
  color: StatusColor;
  /** Required, not optional — color alone must never be the only signal. See ACCESSIBILITY_AND_MOBILE.md §12. */
  icon: LucideIcon;
}

export function StatusPill({
  label,
  color,
  icon: Icon,
  className,
  ...props
}: StatusPillProps): ReactNode {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        colorClasses[color],
        className,
      )}
      {...props}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
}
