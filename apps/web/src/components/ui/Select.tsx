import * as SelectPrimitive from '@radix-ui/react-select';
import { AlertCircle, Check, ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { useId } from 'react';
import { cn } from '@/lib/cn';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  label: string;
  options: SelectOption[];
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  /** Applied to the outer wrapper (label + trigger + message), not the trigger itself. */
  className?: string;
}

/**
 * NOTE: DESIGN_SYSTEM.md §5 specifies a bottom-sheet presentation on
 * mobile (<640px) instead of the floating popover. Radix Select's popover
 * is fully usable on touch devices as-is, so that's what's implemented here
 * — the bottom-sheet variant is a deliberate deferral, not an oversight,
 * because it requires a second render tree (Dialog-based) kept in sync with
 * this one and isn't worth the complexity until a real screen needs it.
 */
export function Select({
  label,
  options,
  placeholder = 'Select…',
  error,
  helperText,
  required,
  name,
  className,
  ...props
}: SelectProps): ReactNode {
  const id = useId();
  const messageId = error ? `${id}-error` : helperText ? `${id}-helper` : undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label id={`${id}-label`} htmlFor={id} className="text-text text-sm font-medium">
        {label}
        {required && (
          <span className="text-error ml-0.5" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <SelectPrimitive.Root name={name} {...props}>
        <SelectPrimitive.Trigger
          id={id}
          aria-labelledby={`${id}-label`}
          aria-describedby={messageId}
          aria-invalid={Boolean(error) || undefined}
          className={cn(
            'border-border-strong bg-surface-alt text-text flex h-11 w-full items-center justify-between gap-2 rounded-md border px-3.5 text-sm',
            'duration-fast ease-standard transition-[border-color,box-shadow]',
            'data-[placeholder]:text-text-muted',
            'focus-visible:border-primary focus-visible:shadow-focus focus-visible:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-45',
            error && 'border-error focus-visible:border-error',
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon>
            <ChevronDown className="text-text-muted size-4" aria-hidden="true" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={6}
            className="border-border bg-surface z-50 max-h-(--radix-select-content-available-height) w-(--radix-select-trigger-width) overflow-hidden rounded-md border p-2 shadow-lg"
          >
            <SelectPrimitive.Viewport>
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className={cn(
                    'text-text relative flex h-10 cursor-pointer items-center rounded-sm px-3 pl-8 text-sm outline-none select-none',
                    'data-[highlighted]:bg-primary-soft',
                    'data-[disabled]:pointer-events-none data-[disabled]:opacity-45',
                  )}
                >
                  <SelectPrimitive.ItemIndicator className="absolute left-2.5 inline-flex items-center">
                    <Check className="text-primary size-4" aria-hidden="true" />
                  </SelectPrimitive.ItemIndicator>
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>

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
