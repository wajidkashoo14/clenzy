'use client';

import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useId, useRef } from 'react';
import { cn } from '@/lib/cn';

export type PincodeCheckStatus = 'idle' | 'loading' | 'success' | 'error';

export interface PincodeInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Fires once exactly 6 digits are entered — the caller triggers the actual serviceability API call. */
  onComplete?: (value: string) => void;
  status?: PincodeCheckStatus;
  successMessage?: string;
  errorMessage?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}

/** 6-digit pin code with an inline serviceability check — see docs/DESIGN_SYSTEM.md §5. */
export function PincodeInput({
  value,
  onChange,
  onComplete,
  status = 'idle',
  successMessage = 'We deliver to this area',
  errorMessage = "We don't deliver here yet",
  label = 'Pin code',
  disabled,
  className,
}: PincodeInputProps): ReactNode {
  const id = useId();
  const messageId = status !== 'idle' ? `${id}-status` : undefined;
  const lastCompleted = useRef<string | null>(null);

  useEffect(() => {
    if (value.length === 6 && lastCompleted.current !== value) {
      lastCompleted.current = value;
      onComplete?.(value);
    }
    if (value.length < 6) lastCompleted.current = null;
  }, [value, onComplete]);

  const statusIcon: Record<Exclude<PincodeCheckStatus, 'idle'>, ReactNode> = {
    loading: <Loader2 className="text-text-muted size-4 animate-spin" aria-hidden="true" />,
    success: <CheckCircle2 className="text-success size-4" aria-hidden="true" />,
    error: <XCircle className="text-error size-4" aria-hidden="true" />,
  };

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-text text-sm font-medium">
        {label}
      </label>

      <div className="relative flex items-center">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={6}
          value={value}
          disabled={disabled}
          aria-describedby={messageId}
          aria-invalid={status === 'error' || undefined}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="e.g. 190001"
          className={cn(
            'border-border bg-surface text-text hover:border-border-strong h-11 w-full rounded-md border pr-10 pl-3.5 text-sm tabular-nums',
            'placeholder:text-text-muted',
            'duration-base transition-[border-color,box-shadow] ease-out',
            'focus-visible:border-primary focus-visible:shadow-focus focus-visible:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-45',
            status === 'error' && 'border-error focus-visible:border-error',
            status === 'success' && 'border-success',
          )}
        />
        {status !== 'idle' && (
          <span className="absolute right-3 inline-flex">{statusIcon[status]}</span>
        )}
      </div>

      {status === 'success' && (
        <p id={messageId} className="text-success flex items-center gap-1 text-[13px]">
          {successMessage}
        </p>
      )}
      {status === 'error' && (
        <p id={messageId} className="text-error flex items-center gap-1 text-[13px]">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
