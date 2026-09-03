import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Semantic breadcrumb nav. Pair with a `BreadcrumbList` JSON-LD block built
 * from the same `items` at the page level — see docs/SEO_AND_PERFORMANCE.md §3.
 * This component only renders the visible, accessible trail.
 */
export function Breadcrumb({ items }: { items: BreadcrumbItem[] }): ReactNode {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="text-text-muted flex flex-wrap items-center gap-1.5 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${index}-${item.label}`} className="flex items-center gap-1.5">
              {index > 0 && <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />}
              {item.href && !isLast ? (
                <Link href={item.href} className="duration-fast hover:text-text transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={isLast ? 'text-text' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
