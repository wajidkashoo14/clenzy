import { AlertCircle } from 'lucide-react';
import type { InputHTMLAttributes, ReactNode, Ref } from 'react';
import { useId } from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  /** Always visible above the field — placeholders alone fail accessibility. */
  label: string;
  error?: string;
  helperText?: string;
  /** Fixed content shown inside the field, e.g. "+91" for phone numbers. */
  prefix?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}

export function Input({
  label,
  error,
  helperText,
  prefix,
  required,
  className,
  ref,
  ...props
}: InputProps): ReactNode {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const messageId = error ? `${id}-error` : helperText ? `${id}-helper` : undefined;

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

      <div className="relative flex items-center">
        {prefix && (
          <span className="text-text-muted pointer-events-none absolute left-3 text-sm">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          required={required}
          aria-required={required || undefined}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={messageId}
          className={cn(
            'border-border-strong bg-surface-alt text-text h-11 w-full rounded-md border px-3.5 text-sm',
            'placeholder:text-text-muted',
            'duration-fast ease-standard transition-[border-color,box-shadow]',
            'focus-visible:border-primary focus-visible:shadow-focus focus-visible:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-45',
            error && 'border-error focus-visible:border-error',
            prefix && 'pl-9',
            className,
          )}
          {...props}
        />
      </div>

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
  );
}
