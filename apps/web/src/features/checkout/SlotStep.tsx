'use client';

import type { SlotDay } from '@clenzy/shared';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { getSlots } from '@/features/checkout/api';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { formatSlotDate, formatSlotWindow } from '@/lib/format';

export interface SlotValue {
  date: string;
  window: string;
}

interface SlotStepProps {
  type: 'pickup' | 'delivery';
  areaId: string;
  fromDate: string;
  value: SlotValue | null;
  onChange: (slot: SlotValue) => void;
}

interface LoadedResult {
  requestKey: string;
  dates?: SlotDay[];
  error?: string;
}

/** Date chips + time-window cards — see docs/DESIGN_SYSTEM.md §5 "Checkout components". */
export function SlotStep({ type, areaId, fromDate, value, onChange }: SlotStepProps): ReactNode {
  const requestKey = `${type}|${areaId}|${fromDate}`;
  const [result, setResult] = useState<LoadedResult | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(value?.date ?? null);

  useEffect(() => {
    let cancelled = false;
    getSlots({ type, areaId, from: fromDate, days: 10 })
      .then((response) => {
        if (cancelled) return;
        setResult({ requestKey, dates: response.dates });
        setSelectedDate((current) =>
          current && response.dates.some((d) => d.date === current)
            ? current
            : (response.dates[0]?.date ?? null),
        );
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setResult({
          requestKey,
          error: err instanceof ApiError ? err.message : 'Could not load available slots.',
        });
      });
    return () => {
      cancelled = true;
    };
  }, [requestKey, type, areaId, fromDate]);

  const isLoading = result === null || result.requestKey !== requestKey;
  const dates = !isLoading ? result.dates : undefined;
  const error = !isLoading ? result.error : undefined;

  if (error) return <p className="text-error text-sm">{error}</p>;
  if (!dates) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  const activeDay = dates.find((d) => d.date === selectedDate) ?? dates[0];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={`${type} date`}>
        {dates.map((day) => {
          const isSelected = day.date === selectedDate;
          const allDisabled = day.windows.length === 0 || day.windows.every((w) => w.disabled);
          return (
            <button
              key={day.date}
              type="button"
              role="tab"
              aria-selected={isSelected}
              disabled={allDisabled}
              onClick={() => setSelectedDate(day.date)}
              className={cn(
                'border-border-strong flex shrink-0 flex-col items-center rounded-lg border px-3.5 py-2 text-sm',
                'duration-fast ease-standard transition-[border-color,background-color]',
                isSelected
                  ? 'border-primary bg-primary-soft text-primary font-semibold'
                  : 'text-text bg-surface',
                allDisabled && 'cursor-not-allowed opacity-45',
              )}
            >
              {formatSlotDate(day.date)}
            </button>
          );
        })}
      </div>

      {activeDay && (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {activeDay.windows.length === 0 && (
            <p className="text-text-muted col-span-full text-sm">
              No {type} slots run on this day.
            </p>
          )}
          {activeDay.windows.map((window) => {
            const isSelected = value?.date === activeDay.date && value.window === window.window;
            return (
              <button
                key={window.window}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={window.disabled}
                onClick={() => onChange({ date: activeDay.date, window: window.window })}
                className={cn(
                  'border-border-strong flex flex-col items-start gap-1 rounded-lg border p-3.5 text-left',
                  'duration-fast ease-standard transition-[border-color,background-color]',
                  isSelected ? 'border-primary bg-primary-soft' : 'bg-surface',
                  window.disabled && 'cursor-not-allowed opacity-45',
                )}
              >
                <span className="text-text text-sm font-medium">
                  {formatSlotWindow(window.window)}
                </span>
                <span
                  className={cn(
                    'text-[13px]',
                    window.disabled ? 'text-text-muted' : 'text-success',
                  )}
                >
                  {window.disabledReason ?? `${window.available} left`}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
