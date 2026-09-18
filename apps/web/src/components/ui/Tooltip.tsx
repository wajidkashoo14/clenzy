import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const TooltipProvider = TooltipPrimitive.Provider;

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: TooltipPrimitive.TooltipContentProps['side'];
}

/** Wrap the app root in a single <TooltipProvider> — see components/layout. */
export function Tooltip({ content, children, side = 'top' }: TooltipProps): ReactNode {
  return (
    <TooltipPrimitive.Root delayDuration={300}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className={cn(
            'bg-text text-text-inverse z-50 rounded-md px-2.5 py-1.5 text-xs font-medium shadow-md',
          )}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-text" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
