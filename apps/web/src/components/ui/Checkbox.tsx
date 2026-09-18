import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import type { ReactNode, Ref } from 'react';
import { useId } from 'react';
import { cn } from '@/lib/cn';

export interface CheckboxProps extends Omit<
  CheckboxPrimitive.CheckboxProps,
  'children' | 'asChild'
> {
  label: string;
  description?: string;
  ref?: Ref<HTMLButtonElement>;
}

export function Checkbox({
  label,
  description,
  className,
  ref,
  ...props
}: CheckboxProps): ReactNode {
  const generatedId = useId();
  const id = props.id ?? generatedId;

  return (
    <div className="flex items-start gap-2.5">
      <CheckboxPrimitive.Root
        ref={ref}
        id={id}
        className={cn(
          'border-border-strong bg-surface mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm border',
          'duration-fast ease-standard transition-[background-color,border-color]',
          'focus-visible:shadow-focus focus-visible:outline-none',
          'data-[state=checked]:border-primary data-[state=checked]:bg-primary',
          'disabled:cursor-not-allowed disabled:opacity-45',
          className,
        )}
        {...props}
      >
        <CheckboxPrimitive.Indicator>
          <Check className="text-text-inverse size-3.5" strokeWidth={3} aria-hidden="true" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>

      <label htmlFor={id} className="text-text flex flex-col gap-0.5 text-sm select-none">
        {label}
        {description && <span className="text-text-muted text-[13px]">{description}</span>}
      </label>
    </div>
  );
}
