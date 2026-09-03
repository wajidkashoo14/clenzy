'use client';

import * as Popover from '@radix-ui/react-popover';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { AlertCircle, CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { useId, useState } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/cn';

export interface DatePickerProps {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  required?: boolean;
}

/**
 * Native `<input type="date">` on mobile (the OS picker is faster and more
 * familiar than any custom widget on a touch keyboard), a Radix
 * Popover-hosted calendar on desktop — see docs/DESIGN_SYSTEM.md §5. Note
 * this is a general-purpose primitive for admin/report date fields; the
 * pickup/delivery slot flow uses a horizontal date-strip instead (see
 * DESIGN_SYSTEM.md §5 "Checkout components"), not this component.
 */
export function DatePicker({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  disabled,
  error,
  helperText,
  required,
}: DatePickerProps): ReactNode {
  const isDesktop = useMediaQuery('(min-width: 640px)');
  const id = useId();
  const messageId = error ? `${id}-error` : helperText ? `${id}-helper` : undefined;

  if (!isDesktop) {
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-text text-sm font-medium">
          {label}
          {required && (
            <span className="text-error ml-0.5" aria-hidden="true">
              *
            </span>
          )}
        </label>
        <input
          id={id}
          type="date"
          disabled={disabled}
          required={required}
          aria-describedby={messageId}
          aria-invalid={Boolean(error) || undefined}
          value={value ? format(value, 'yyyy-MM-dd') : ''}
          min={minDate ? format(minDate, 'yyyy-MM-dd') : undefined}
          max={maxDate ? format(maxDate, 'yyyy-MM-dd') : undefined}
          onChange={(e) => onChange(e.target.value ? parseISO(e.target.value) : null)}
          className={cn(
            'border-border-strong bg-surface-alt text-text h-11 w-full rounded-md border px-3.5 text-sm',
            'duration-fast ease-standard transition-[border-color,box-shadow]',
            'focus-visible:border-primary focus-visible:shadow-focus focus-visible:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-45',
            error && 'border-error focus-visible:border-error',
          )}
        />
        <Message messageId={messageId} error={error} helperText={helperText} />
      </div>
    );
  }

  return (
    <DesktopDatePicker
      id={id}
      label={label}
      value={value}
      onChange={onChange}
      minDate={minDate}
      maxDate={maxDate}
      disabled={disabled}
      error={error}
      helperText={helperText}
      required={required}
      messageId={messageId}
    />
  );
}

function Message({
  messageId,
  error,
  helperText,
}: {
  messageId?: string;
  error?: string;
  helperText?: string;
}): ReactNode {
  if (error) {
    return (
      <p id={messageId} className="text-error flex items-center gap-1 text-[13px]">
        <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
        {error}
      </p>
    );
  }
  if (helperText) {
    return (
      <p id={messageId} className="text-text-muted text-[13px]">
        {helperText}
      </p>
    );
  }
  return null;
}

interface DesktopDatePickerProps extends DatePickerProps {
  id: string;
  messageId?: string;
}

function DesktopDatePicker({
  id,
  label,
  value,
  onChange,
  minDate,
  maxDate,
  disabled,
  error,
  helperText,
  required,
  messageId,
}: DesktopDatePickerProps): ReactNode {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => value ?? new Date());

  const isDateDisabled = (date: Date): boolean =>
    (minDate ? isBefore(date, minDate) : false) || (maxDate ? isAfter(date, maxDate) : false);

  function handleSelect(date: Date): void {
    if (isDateDisabled(date)) return;
    onChange(date);
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-text text-sm font-medium">
        {label}
        {required && (
          <span className="text-error ml-0.5" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <Popover.Root
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setViewMonth(value ?? new Date());
        }}
      >
        <Popover.Trigger asChild>
          <button
            id={id}
            type="button"
            disabled={disabled}
            aria-describedby={messageId}
            className={cn(
              'border-border-strong bg-surface-alt flex h-11 w-full items-center justify-between gap-2 rounded-md border px-3.5 text-sm',
              value ? 'text-text' : 'text-text-muted',
              'duration-fast ease-standard transition-[border-color,box-shadow]',
              'focus-visible:border-primary focus-visible:shadow-focus focus-visible:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-45',
              error && 'border-error focus-visible:border-error',
            )}
          >
            {value ? format(value, 'd MMM yyyy') : 'Select a date'}
            <CalendarIcon className="text-text-muted size-4" aria-hidden="true" />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            sideOffset={6}
            align="start"
            className="border-border bg-surface z-50 w-72 rounded-md border p-3 shadow-lg"
          >
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewMonth((m) => subMonths(m, 1))}
                aria-label="Previous month"
                className="text-text-muted duration-fast ease-standard hover:bg-surface-alt hover:text-text focus-visible:shadow-focus flex size-8 items-center justify-center rounded-md transition-colors focus-visible:outline-none"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </button>
              <p className="text-text text-sm font-semibold">{format(viewMonth, 'MMMM yyyy')}</p>
              <button
                type="button"
                onClick={() => setViewMonth((m) => addMonths(m, 1))}
                aria-label="Next month"
                className="text-text-muted duration-fast ease-standard hover:bg-surface-alt hover:text-text focus-visible:shadow-focus flex size-8 items-center justify-center rounded-md transition-colors focus-visible:outline-none"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </div>

            <CalendarGrid
              viewMonth={viewMonth}
              selected={value}
              isDateDisabled={isDateDisabled}
              onSelect={handleSelect}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <Message messageId={messageId} error={error} helperText={helperText} />
    </div>
  );
}

function CalendarGrid({
  viewMonth,
  selected,
  isDateDisabled,
  onSelect,
}: {
  viewMonth: Date;
  selected: Date | null;
  isDateDisabled: (date: Date) => boolean;
  onSelect: (date: Date) => void;
}): ReactNode {
  const gridStart = startOfWeek(startOfMonth(viewMonth));
  const gridEnd = endOfWeek(endOfMonth(viewMonth));
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div>
      <div className="text-text-muted grid grid-cols-7 gap-1 pb-1 text-center text-xs font-medium">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const outsideMonth = !isSameMonth(day, viewMonth);
          const isSelected = selected ? isSameDay(day, selected) : false;
          const disabled = isDateDisabled(day);

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(day)}
              aria-pressed={isSelected}
              aria-label={format(day, 'EEEE, d MMMM yyyy')}
              className={cn(
                'flex size-9 items-center justify-center rounded-md text-sm tabular-nums',
                'duration-fast ease-standard transition-colors',
                'focus-visible:shadow-focus focus-visible:outline-none',
                outsideMonth && 'text-text-muted/50',
                !outsideMonth && !isSelected && 'text-text hover:bg-primary-soft',
                isSelected && 'bg-primary text-text-inverse',
                disabled && 'pointer-events-none opacity-30',
              )}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}
