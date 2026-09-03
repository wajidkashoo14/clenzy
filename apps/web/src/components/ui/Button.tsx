import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '@/lib/cn';

/**
 * See docs/DESIGN_SYSTEM.md §5 "Buttons". Hover/active states use
 * `color-mix()` to darken the token color rather than introducing new
 * hardcoded hex values — this keeps every shade traceable to a single
 * token per color family.
 */
const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium',
    'transition-[background-color,color,transform,opacity] duration-fast ease-standard',
    'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45',
    'aria-busy:pointer-events-none',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-primary text-text-inverse',
          'hover:bg-[color-mix(in_srgb,var(--color-primary)_92%,black)]',
          'active:bg-[color-mix(in_srgb,var(--color-primary)_88%,black)]',
        ],
        secondary: [
          'border border-border-strong bg-surface text-text',
          'hover:bg-surface-alt active:bg-surface-alt',
        ],
        ghost: ['text-text hover:bg-primary-soft active:bg-primary-soft'],
        danger: [
          'bg-error text-text-inverse',
          'hover:bg-[color-mix(in_srgb,var(--color-error)_92%,black)]',
          'active:bg-[color-mix(in_srgb,var(--color-error)_88%,black)]',
        ],
        link: [
          'h-auto rounded-none p-0 text-primary underline-offset-4 hover:underline active:scale-100',
        ],
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-11 px-5 text-sm',
        lg: 'h-13 px-6 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /** Render the child element (e.g. a Next.js `<Link>`) as the button, via Radix Slot. */
  asChild?: boolean;
  /** Shows a spinner in place of the label and disables interaction. Width is preserved. */
  isLoading?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  isLoading = false,
  disabled,
  children,
  ref,
  ...props
}: ButtonProps): ReactNode {
  const classes = cn(buttonVariants({ variant, size }), 'relative', className);

  // Slot (asChild) requires exactly one child element to merge props onto, so
  // it can't host the loading-overlay's two spans — asChild callers (e.g. a
  // Button wrapping a Link) pass isLoading through as a plain prop instead.
  if (asChild) {
    return (
      <Slot ref={ref} className={classes} aria-busy={isLoading || undefined} {...props}>
        {children}
      </Slot>
    );
  }

  return (
    <button
      ref={ref}
      className={classes}
      disabled={disabled ?? isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {/* `invisible` (not `hidden`) keeps the label's layout box so the button
          doesn't change size when the spinner takes over — see DESIGN_SYSTEM.md §5. */}
      <span className={cn('inline-flex items-center gap-2', isLoading && 'invisible')}>
        {children}
      </span>
      {isLoading && (
        <span className="absolute inset-0 inline-flex items-center justify-center gap-2">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          <span className="sr-only">Loading</span>
        </span>
      )}
    </button>
  );
}
