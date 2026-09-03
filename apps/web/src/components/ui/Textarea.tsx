import { AlertCircle } from 'lucide-react';
import type { ReactNode, Ref, TextareaHTMLAttributes } from 'react';
import { useEffect, useId, useRef } from 'react';
import { cn } from '@/lib/cn';

function useMergedRef<T>(...refs: Array<Ref<T> | undefined>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(node);
      else if (ref && 'current' in ref) (ref as { current: T | null }).current = node;
    }
  };
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  helperText?: string;
  /** Shows a live "N / max" counter below the field when set. */
  maxLength?: number;
  ref?: Ref<HTMLTextAreaElement>;
}

export function Textarea({
  label,
  error,
  helperText,
  required,
  maxLength,
  className,
  ref,
  value,
  defaultValue,
  ...props
}: TextareaProps): ReactNode {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const messageId = error ? `${id}-error` : (helperText ?? maxLength) ? `${id}-helper` : undefined;
  const innerRef = useRef<HTMLTextAreaElement>(null);
  const mergedRef = useMergedRef(ref, innerRef);

  // Auto-grow: recalculate on every value change, including programmatic ones.
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const currentLength = typeof value === 'string' ? value.length : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-text text-sm font-medium">
        {label}
        {required && (
          <span className="text-error ml-0.5" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <textarea
        ref={mergedRef}
        id={id}
        required={required}
        aria-required={required || undefined}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={messageId}
        value={value}
        defaultValue={defaultValue}
        maxLength={maxLength}
        rows={3}
        className={cn(
          'border-border-strong bg-surface-alt text-text min-h-11 w-full resize-none overflow-hidden rounded-md border px-3.5 py-2.5 text-sm',
          'placeholder:text-text-muted',
          'duration-fast ease-standard transition-[border-color,box-shadow]',
          'focus-visible:border-primary focus-visible:shadow-focus focus-visible:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-45',
          error && 'border-error focus-visible:border-error',
          className,
        )}
        {...props}
      />

      <div className="flex items-start justify-between gap-2">
        <div>
          {error ? (
            <p id={messageId} className="text-error flex items-center gap-1 text-[13px]">
              <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
              {error}
            </p>
          ) : (
            helperText && (
              <p id={messageId} className="text-text-muted text-[13px]">
                {helperText}
              </p>
            )
          )}
        </div>
        {maxLength && currentLength !== undefined && (
          <p className="text-text-muted shrink-0 text-[13px] tabular-nums" aria-hidden="true">
            {currentLength} / {maxLength}
          </p>
        )}
      </div>
    </div>
  );
}
