import type { OrderTrackResult } from '@clenzy/shared';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/format';

/**
 * Vertical on mobile, horizontal (scrollable) on desktop — see
 * docs/DESIGN_SYSTEM.md §5 "Order timeline". Completed nodes filled, current
 * node pulsing (via `motion-safe:animate-pulse`, so it's inert under
 * prefers-reduced-motion), future nodes outlined.
 */
export function OrderTimeline({ timeline }: { timeline: OrderTrackResult['timeline'] }): ReactNode {
  return (
    <ol className="flex flex-col gap-0 lg:flex-row lg:gap-0 lg:overflow-x-auto lg:pb-2">
      {timeline.map((entry, index) => {
        const isLast = index === timeline.length - 1;
        return (
          <li
            key={`${entry.status}-${index}`}
            className="flex gap-3 lg:min-w-[168px] lg:flex-1 lg:flex-col lg:gap-0"
          >
            <div className="flex flex-col items-center lg:w-full lg:flex-row">
              <span
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold',
                  entry.isCompleted &&
                    !entry.isCurrent &&
                    'border-primary bg-primary text-text-inverse',
                  entry.isCurrent &&
                    'border-primary bg-primary-soft text-primary motion-safe:animate-pulse',
                  !entry.isCompleted &&
                    !entry.isCurrent &&
                    'border-border-strong bg-surface text-text-muted',
                )}
              >
                {entry.isCompleted && !entry.isCurrent ? (
                  <Check className="size-4" aria-hidden="true" />
                ) : (
                  index + 1
                )}
              </span>
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'my-1 w-0.5 flex-1 lg:mx-1 lg:my-0 lg:h-0.5 lg:w-full lg:flex-none',
                    entry.isCompleted ? 'bg-primary' : 'bg-border-strong',
                  )}
                />
              )}
            </div>
            <div className="pb-6 lg:pt-3 lg:pb-0">
              <p
                className={cn(
                  'text-sm font-medium',
                  entry.isCurrent ? 'text-primary' : 'text-text',
                )}
              >
                {entry.label}
              </p>
              {entry.at && (
                <p className="text-text-muted mt-0.5 text-[13px]">{formatDateTime(entry.at)}</p>
              )}
              {entry.note && (
                <p className="text-text-muted mt-0.5 text-[13px] italic">{entry.note}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
