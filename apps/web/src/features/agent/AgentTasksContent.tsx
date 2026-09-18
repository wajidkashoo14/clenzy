'use client';

import type { AgentTask } from '@clenzy/shared';
import { CheckCircle2, MapPin, Package, Phone, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Spinner } from '@/components/ui/Spinner';
import { getAgentTasks, markDelivered, markPickedUp } from '@/features/agent/api';
import { MarkFailedModal } from '@/features/agent/MarkFailedModal';
import { addDaysToDateString, todayInKolkata } from '@/lib/date';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { formatSlotDate, formatSlotWindow } from '@/lib/format';
import { toast } from '@/lib/toast';

const today = todayInKolkata();
const DATE_OPTIONS = [
  { date: today, label: 'Today' },
  { date: addDaysToDateString(today, 1), label: 'Tomorrow' },
  { date: addDaysToDateString(today, 2), label: formatSlotDate(addDaysToDateString(today, 2)) },
];

function TaskCard({
  task,
  onDone,
  onFail,
}: {
  task: AgentTask;
  onDone: () => void;
  onFail: () => void;
}): ReactNode {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleComplete(): Promise<void> {
    setIsSubmitting(true);
    try {
      if (task.type === 'pickup') {
        await markPickedUp(task.orderNumber);
      } else {
        await markDelivered(task.orderNumber);
      }
      toast.success(task.type === 'pickup' ? 'Marked as picked up' : 'Marked as delivered');
      onDone();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update this task.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
            task.type === 'pickup'
              ? 'bg-secondary-soft text-secondary'
              : 'bg-primary-soft text-primary',
          )}
        >
          <Package className="size-3.5 shrink-0" aria-hidden="true" />
          {task.type === 'pickup' ? 'Pickup' : 'Delivery'}
        </span>
        <span className="text-text-muted text-sm font-medium">{formatSlotWindow(task.window)}</span>
      </div>

      <div>
        <p className="text-text text-sm font-semibold">{task.address.contactName}</p>
        <a
          href={`tel:${task.address.contactPhone}`}
          className="text-primary inline-flex items-center gap-1 text-sm"
        >
          <Phone className="size-3.5 shrink-0" aria-hidden="true" />
          {task.address.contactPhone}
        </a>
      </div>

      <div className="flex items-start gap-1.5 text-sm">
        <MapPin className="text-text-muted mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <p className="text-text-muted">
          {task.address.line1}
          {task.address.landmark && `, near ${task.address.landmark}`}, {task.address.area},{' '}
          {task.address.city} – {task.address.pincode}
        </p>
      </div>

      <p className="text-text-muted text-sm">
        {task.itemCount} item{task.itemCount === 1 ? '' : 's'} · {task.orderNumber}
      </p>

      {task.customerNote && (
        <p className="text-text-muted text-sm italic">&ldquo;{task.customerNote}&rdquo;</p>
      )}

      <div className="mt-1 flex gap-2">
        <Button
          size="sm"
          className="flex-1"
          isLoading={isSubmitting}
          onClick={() => void handleComplete()}
        >
          <CheckCircle2 className="size-4" aria-hidden="true" />
          Mark {task.type === 'pickup' ? 'picked up' : 'delivered'}
        </Button>
        <Button size="sm" variant="secondary" onClick={onFail}>
          <XCircle className="size-4" aria-hidden="true" />
          Failed
        </Button>
      </div>
    </Card>
  );
}

interface LoadedResult {
  requestKey: string;
  tasks?: AgentTask[];
  error?: string;
}

export function AgentTasksContent(): ReactNode {
  const [date, setDate] = useState(today);
  const [result, setResult] = useState<LoadedResult | null>(null);
  const [failingTask, setFailingTask] = useState<AgentTask | null>(null);

  const load = useCallback((forDate: string) => {
    getAgentTasks(forDate)
      .then(({ tasks }) => setResult({ requestKey: forDate, tasks }))
      .catch((err: unknown) =>
        setResult({
          requestKey: forDate,
          error: err instanceof ApiError ? err.message : 'Could not load tasks.',
        }),
      );
  }, []);

  useEffect(() => {
    load(date);
  }, [date, load]);

  const isLoading = result === null || result.requestKey !== date;
  const tasks = !isLoading ? result.tasks : undefined;
  const error = !isLoading ? result.error : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {DATE_OPTIONS.map((option) => (
          <button
            key={option.date}
            type="button"
            onClick={() => setDate(option.date)}
            className={cn(
              'border-border-strong flex-1 rounded-lg border px-3 py-2 text-sm font-medium',
              'duration-fast ease-standard transition-[border-color,background-color]',
              date === option.date
                ? 'border-primary bg-primary-soft text-primary'
                : 'bg-surface text-text',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {error && <ErrorState title="Couldn't load tasks" description={error} />}

      {!error && !tasks && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}

      {!error && tasks && tasks.length === 0 && (
        <EmptyState
          title="No tasks for this day"
          description="Assigned pickups and deliveries will show up here."
        />
      )}

      {!error && tasks && tasks.length > 0 && (
        <div className="flex flex-col gap-3">
          {tasks.map((task) => (
            <TaskCard
              key={`${task.type}-${task.orderNumber}`}
              task={task}
              onDone={() => load(date)}
              onFail={() => setFailingTask(task)}
            />
          ))}
        </div>
      )}

      {failingTask && (
        <MarkFailedModal
          open={Boolean(failingTask)}
          onOpenChange={(open) => !open && setFailingTask(null)}
          orderNumber={failingTask.orderNumber}
          type={failingTask.type}
          onSuccess={() => {
            setFailingTask(null);
            load(date);
          }}
        />
      )}
    </div>
  );
}
