import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const Accordion = AccordionPrimitive.Root;

export function AccordionItem({
  className,
  ...props
}: AccordionPrimitive.AccordionItemProps): ReactNode {
  return (
    <AccordionPrimitive.Item
      className={cn('border-border border-b last:border-b-0', className)}
      {...props}
    />
  );
}

export function AccordionTrigger({
  className,
  children,
  ...props
}: AccordionPrimitive.AccordionTriggerProps): ReactNode {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          'group text-text flex flex-1 items-center justify-between gap-4 py-4 text-left text-sm font-medium',
          'duration-fast ease-standard hover:text-primary transition-colors',
          'focus-visible:shadow-focus focus-visible:outline-none',
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown
          className="text-text-muted duration-base ease-standard size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180"
          aria-hidden="true"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({
  className,
  children,
  ...props
}: AccordionPrimitive.AccordionContentProps): ReactNode {
  return (
    <AccordionPrimitive.Content
      className={cn(
        'text-text-muted overflow-hidden text-sm',
        'data-[state=open]:animate-[accordion-down_var(--duration-base)_var(--ease-standard)]',
        'data-[state=closed]:animate-[accordion-up_var(--duration-base)_var(--ease-standard)]',
        className,
      )}
      {...props}
    >
      <div className="pb-4">{children}</div>
    </AccordionPrimitive.Content>
  );
}
