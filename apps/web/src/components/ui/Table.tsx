'use client';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Skeleton } from './Skeleton';

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
  /** Label used in the mobile stacked-card view; defaults to `header`. */
  mobileLabel?: string;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  getRowKey: (row: T) => string;
  isLoading?: boolean;
  skeletonRows?: number;
  /** Shown instead of the table body when `data` is empty and not loading/errored. */
  emptyState?: ReactNode;
  /** Shown instead of the table body when set — takes priority over empty/data. */
  errorState?: ReactNode;
  /**
   * Sorting is controlled: this component renders the sort icons and calls
   * `onSortChange`, but does NOT reorder `data` itself — the caller does that
   * (matches server-side-sorted API responses, which is the common real
   * case for admin tables). Pass already-sorted `data` for the current
   * `sortKey`/`sortDirection`.
   */
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSortChange?: (key: string) => void;
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  /** Rendered in a bar above the table while at least one row is selected. */
  bulkActions?: ReactNode;
  onRowClick?: (row: T) => void;
}

/**
 * Real table with sticky header/first column and sorting on desktop;
 * stacked cards on mobile (<768px) — see docs/DESIGN_SYSTEM.md §5 "Tables".
 * Loading/empty/error states are all first-class, not afterthoughts.
 */
export function Table<T>({
  columns,
  data,
  getRowKey,
  isLoading = false,
  skeletonRows = 5,
  emptyState,
  errorState,
  sortKey,
  sortDirection,
  onSortChange,
  selectable = false,
  selectedKeys,
  onSelectionChange,
  bulkActions,
  onRowClick,
}: TableProps<T>): ReactNode {
  const allKeys = data.map(getRowKey);
  const selected = selectedKeys ?? new Set<string>();
  const allSelected = allKeys.length > 0 && allKeys.every((key) => selected.has(key));
  const someSelected = allKeys.some((key) => selected.has(key)) && !allSelected;

  function toggleAll(): void {
    if (!onSelectionChange) return;
    onSelectionChange(allSelected ? new Set() : new Set(allKeys));
  }

  function toggleRow(key: string): void {
    if (!onSelectionChange) return;
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectionChange(next);
  }

  const showEmpty = !isLoading && !errorState && data.length === 0;
  const showRows = !isLoading && !errorState && data.length > 0;

  return (
    <div className="flex flex-col gap-3">
      {selectable && selected.size > 0 && bulkActions && (
        <div className="bg-primary-soft flex items-center gap-3 rounded-md px-4 py-2.5 text-sm">
          <span className="text-primary font-medium">{selected.size} selected</span>
          <div className="flex items-center gap-2">{bulkActions}</div>
        </div>
      )}

      {/* Desktop / tablet: real table */}
      <div className="border-border hidden overflow-x-auto rounded-lg border md:block">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-surface-alt sticky top-0 z-10">
            <tr>
              {selectable && (
                <th className="bg-surface-alt sticky left-0 z-20 w-11 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleAll}
                    aria-label="Select all rows"
                    className="border-border-strong accent-primary size-4 rounded"
                  />
                </th>
              )}
              {columns.map((col, i) => (
                <th
                  key={col.key}
                  className={cn(
                    'text-text-muted px-4 py-3 text-left text-xs font-semibold tracking-wide uppercase',
                    i === 0 && !selectable && 'bg-surface-alt sticky left-0 z-20',
                    col.className,
                  )}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => onSortChange?.(col.key)}
                      className="duration-fast ease-standard hover:text-text inline-flex items-center gap-1 transition-colors"
                    >
                      {col.header}
                      {sortKey === col.key ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="size-3.5" aria-hidden="true" />
                        ) : (
                          <ArrowDown className="size-3.5" aria-hidden="true" />
                        )
                      ) : (
                        <ArrowUpDown className="size-3.5 opacity-40" aria-hidden="true" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: skeletonRows }, (_, rowIndex) => (
                <tr key={rowIndex} className="border-border border-t">
                  {selectable && (
                    <td className="px-4 py-3">
                      <Skeleton className="size-4" />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <Skeleton className="h-4 w-full max-w-32" />
                    </td>
                  ))}
                </tr>
              ))}

            {errorState && (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)}>{errorState}</td>
              </tr>
            )}

            {showEmpty && (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)}>{emptyState}</td>
              </tr>
            )}

            {showRows &&
              data.map((row, rowIndex) => {
                const key = getRowKey(row);
                const isSelected = selected.has(key);
                const rowBg = isSelected
                  ? 'bg-primary-soft'
                  : rowIndex % 2 === 1
                    ? 'bg-surface-alt'
                    : 'bg-surface';

                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      'border-border duration-fast ease-standard border-t transition-colors',
                      onRowClick && 'cursor-pointer',
                      !isSelected && 'hover:bg-primary-soft/40',
                    )}
                  >
                    {selectable && (
                      <td
                        className={cn('sticky left-0 z-10 px-4 py-3', rowBg)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(key)}
                          aria-label={`Select row`}
                          className="border-border-strong accent-primary size-4 rounded"
                        />
                      </td>
                    )}
                    {columns.map((col, i) => (
                      <td
                        key={col.key}
                        className={cn(
                          'text-text px-4 py-3',
                          i === 0 && !selectable && cn('sticky left-0 z-10', rowBg),
                          col.className,
                        )}
                      >
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {isLoading &&
          Array.from({ length: skeletonRows }, (_, i) => (
            <div
              key={i}
              className="border-border bg-surface flex flex-col gap-2 rounded-lg border p-4"
            >
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        {errorState}
        {showEmpty && emptyState}
        {showRows &&
          data.map((row) => (
            <div
              key={getRowKey(row)}
              onClick={() => onRowClick?.(row)}
              className={cn(
                'border-border bg-surface flex flex-col gap-2 rounded-lg border p-4',
                onRowClick && 'cursor-pointer',
              )}
            >
              {selectable && (
                <input
                  type="checkbox"
                  checked={selected.has(getRowKey(row))}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleRow(getRowKey(row));
                  }}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Select row"
                  className="border-border-strong accent-primary size-4 self-start rounded"
                />
              )}
              {columns.map((col) => (
                <div key={col.key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-text-muted">{col.mobileLabel ?? col.header}</span>
                  <span className="text-text text-right">{col.render(row)}</span>
                </div>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}
