import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  description = "We couldn't load this. Please try again.",
  onRetry,
  retryLabel = 'Try again',
}: ErrorStateProps): ReactNode {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="bg-error-soft flex size-12 items-center justify-center rounded-full">
        <AlertTriangle className="text-error size-6" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-text text-sm font-semibold">{title}</p>
        <p className="text-text-muted max-w-sm text-sm">{description}</p>
      </div>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry} className="mt-1">
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
