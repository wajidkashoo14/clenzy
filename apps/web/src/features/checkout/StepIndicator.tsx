import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface StepIndicatorProps {
  steps: string[];
  currentIndex: number;
}

/** See docs/DESIGN_SYSTEM.md §5 "Step indicator (checkout)". */
export function StepIndicator({ steps, currentIndex }: StepIndicatorProps): ReactNode {
  return (
    <div>
      {/* Mobile: "Step X of Y" + progress bar. */}
      <div className="sm:hidden">
        <p className="text-text-muted text-[13px]">
          Step {currentIndex + 1} of {steps.length} — {steps[currentIndex]}
        </p>
        <div className="bg-surface-alt mt-2 h-1.5 w-full overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-[width]"
            style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop/tablet: numbered circles connected by a line. */}
      <ol className="hidden items-center sm:flex">
        {steps.map((label, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          return (
            <li key={label} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={cn(
                    'flex size-8 items-center justify-center rounded-full text-sm font-semibold',
                    isCompleted && 'bg-primary text-text-inverse',
                    isCurrent && 'bg-surface text-primary ring-primary ring-2',
                    !isCompleted && !isCurrent && 'bg-surface-alt text-text-muted',
                  )}
                >
                  {isCompleted ? <Check className="size-4" aria-hidden="true" /> : index + 1}
                </span>
                <span
                  className={cn(
                    'text-[13px] whitespace-nowrap',
                    isCurrent ? 'text-text font-medium' : 'text-text-muted',
                  )}
                >
                  {label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={cn('mx-2 h-px flex-1', isCompleted ? 'bg-primary' : 'bg-border')} />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
