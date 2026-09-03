import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { useId } from 'react';
import { cn } from '@/lib/cn';

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps extends Omit<
  RadioGroupPrimitive.RadioGroupProps,
  'children' | 'asChild'
> {
  /** Legend for the fieldset — required for screen readers to announce the group's purpose. */
  label: string;
  options: RadioOption[];
  error?: string;
}

export function RadioGroup({
  label,
  options,
  error,
  required,
  className,
  ...props
}: RadioGroupProps): ReactNode {
  const groupId = useId();
  const errorId = error ? `${groupId}-error` : undefined;

  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={errorId}>
      <legend className="text-text mb-0.5 text-sm font-medium">
        {label}
        {required && (
          <span className="text-error ml-0.5" aria-hidden="true">
            *
          </span>
        )}
      </legend>

      <RadioGroupPrimitive.Root
        required={required}
        className={cn('flex flex-col gap-2', className)}
        {...props}
      >
        {options.map((option) => {
          const itemId = `${groupId}-${option.value}`;
          return (
            <div key={option.value} className="flex items-start gap-2.5">
              <RadioGroupPrimitive.Item
                id={itemId}
                value={option.value}
                disabled={option.disabled}
                className={cn(
                  'border-border-strong bg-surface mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border',
                  'duration-fast ease-standard transition-[border-color]',
                  'focus-visible:shadow-focus focus-visible:outline-none',
                  'data-[state=checked]:border-primary',
                  'disabled:cursor-not-allowed disabled:opacity-45',
                )}
              >
                <RadioGroupPrimitive.Indicator className="bg-primary size-2.5 rounded-full" />
              </RadioGroupPrimitive.Item>

              <label
                htmlFor={itemId}
                className="text-text flex flex-col gap-0.5 text-sm select-none"
              >
                {option.label}
                {option.description && (
                  <span className="text-text-muted text-[13px]">{option.description}</span>
                )}
              </label>
            </div>
          );
        })}
      </RadioGroupPrimitive.Root>

      {error && (
        <p id={errorId} className="text-error flex items-center gap-1 text-[13px]">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </fieldset>
  );
}
