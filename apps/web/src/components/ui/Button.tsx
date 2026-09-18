import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '@/lib/cn';

/**
 * See docs/DESIGN_SYSTEM.md §5 "Buttons". Hover/active states use
 * `color-mix()` to darken the token color rather than introducing new
 * hardcoded hex values — this keeps every shade traceable to a single
 * token per color family. The 2026 visual refresh makes buttons pill-shaped
 * (rounded-full), adds a hover lift + brand glow, and a CSS-only sheen sweep
 * on primary/danger via the `.btn-sheen` class in globals.css.
 */
const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium',
    'transition-[background-color,color,transform,box-shadow,opacity] duration-base ease-out',
    'hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97]',
    'disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-45 disabled:shadow-none',
    'aria-busy:pointer-events-none',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-primary text-text-inverse shadow-glow btn-sheen',
          'hover:bg-primary-hover hover:shadow-glow-lg',
          'active:bg-[color-mix(in_srgb,var(--color-primary)_80%,var(--color-text))]',
        ],
        secondary: [
          'border border-border-strong bg-surface text-text shadow-sm',
          'hover:border-primary/50 hover:bg-primary-soft/40 hover:text-primary hover:shadow-md',
          'active:bg-primary-soft/60',
        ],
        ghost: ['text-text hover:bg-primary-soft hover:text-primary active:bg-primary-soft'],
        danger: [
          'bg-error text-text-inverse btn-sheen shadow-[0_8px_20px_-6px_color-mix(in_srgb,var(--color-error)_45%,transparent)]',
          'hover:bg-[color-mix(in_srgb,var(--color-error)_88%,var(--color-text))]',
          'active:bg-[color-mix(in_srgb,var(--color-error)_80%,var(--color-text))]',
        ],
        link: [
          'h-auto rounded-none p-0 text-primary underline-offset-4 hover:underline',
          'hover:translate-y-0 active:scale-100 active:translate-y-0',
        ],
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-11 px-5 text-sm',
        lg: 'h-13 px-7 text-base',
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
