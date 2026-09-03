import * as SwitchPrimitive from '@radix-ui/react-switch';
import type { ReactNode, Ref } from 'react';
import { useId } from 'react';
import { cn } from '@/lib/cn';

export interface SwitchProps extends Omit<SwitchPrimitive.SwitchProps, 'asChild'> {
  label: string;
  description?: string;
  ref?: Ref<HTMLButtonElement>;
}

export function Switch({ label, description, className, ref, ...props }: SwitchProps): ReactNode {
  const generatedId = useId();
  const id = props.id ?? generatedId;

  return (
    <div className="flex items-start justify-between gap-3">
      <label htmlFor={id} className="text-text flex flex-col gap-0.5 text-sm select-none">
        {label}
        {description && <span className="text-text-muted text-[13px]">{description}</span>}
      </label>

      <SwitchPrimitive.Root
        ref={ref}
        id={id}
        className={cn(
          'bg-border-strong relative h-6 w-10 shrink-0 rounded-full',
          'duration-fast ease-standard transition-colors',
          'focus-visible:shadow-focus focus-visible:outline-none',
          'data-[state=checked]:bg-primary',
          'disabled:cursor-not-allowed disabled:opacity-45',
          className,
        )}
        {...props}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            'bg-surface block size-4.5 translate-x-0.75 rounded-full shadow-sm',
            'duration-fast ease-standard transition-transform',
            'data-[state=checked]:translate-x-[19px]',
          )}
        />
      </SwitchPrimitive.Root>
    </div>
  );
}
