import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/** Builds a page list like [1, '…', 4, 5, 6, '…', 20] — never more than ~7 entries. */
function buildPageList(current: number, total: number): Array<number | 'ellipsis'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const result: Array<number | 'ellipsis'> = [];
  sorted.forEach((page, i) => {
    if (i > 0) {
      const prev = sorted[i - 1];
      if (prev !== undefined && page - prev > 1) result.push('ellipsis');
    }
    result.push(page);
  });
  return result;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps): ReactNode {
  if (totalPages <= 1) return null;
  const pages = buildPageList(currentPage, totalPages);

  return (
    <nav aria-label="Pagination" className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="Previous page"
        className={cn(
          'text-text-muted flex size-9 items-center justify-center rounded-md',
          'duration-fast ease-standard hover:bg-surface-alt hover:text-text transition-colors',
          'disabled:pointer-events-none disabled:opacity-35',
          'focus-visible:shadow-focus focus-visible:outline-none',
        )}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>

      {pages.map((page, i) =>
        page === 'ellipsis' ? (
          <span key={`ellipsis-${i}`} className="text-text-muted px-1.5 text-sm" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            aria-current={page === currentPage ? 'page' : undefined}
            className={cn(
              'flex size-9 items-center justify-center rounded-md text-sm font-medium tabular-nums',
              'duration-fast ease-standard transition-colors',
              'focus-visible:shadow-focus focus-visible:outline-none',
              page === currentPage
                ? 'bg-primary text-text-inverse'
                : 'text-text hover:bg-surface-alt',
            )}
          >
            {page}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label="Next page"
        className={cn(
          'text-text-muted flex size-9 items-center justify-center rounded-md',
          'duration-fast ease-standard hover:bg-surface-alt hover:text-text transition-colors',
          'disabled:pointer-events-none disabled:opacity-35',
          'focus-visible:shadow-focus focus-visible:outline-none',
        )}
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </nav>
  );
}
