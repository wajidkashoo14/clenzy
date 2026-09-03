import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: EmptyStateProps): ReactNode {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="bg-surface-alt flex size-12 items-center justify-center rounded-full">
        <Icon className="text-text-muted size-6" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-text text-sm font-semibold">{title}</p>
        {description && <p className="text-text-muted max-w-sm text-sm">{description}</p>}
      </div>
      {action && (
        <Button size="sm" variant="secondary" onClick={action.onClick} className="mt-1">
          {action.label}
        </Button>
      )}
    </div>
  );
}
