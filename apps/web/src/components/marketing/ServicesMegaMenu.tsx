import Link from 'next/link';
import type { ReactNode } from 'react';
import { SERVICE_CATEGORIES } from '@/content/services';

/** Two columns of categories + a promoted panel — see docs/DESIGN_SYSTEM.md §5 "Navigation". */
export function ServicesMegaMenu(): ReactNode {
  const [left, right] = [
    SERVICE_CATEGORIES.slice(0, Math.ceil(SERVICE_CATEGORIES.length / 2)),
    SERVICE_CATEGORIES.slice(Math.ceil(SERVICE_CATEGORIES.length / 2)),
  ];

  return (
    <div className="grid w-[640px] grid-cols-[1fr_1fr_260px] gap-6">
      {[left, right].map((column, columnIndex) => (
        <ul key={columnIndex} className="flex flex-col gap-1">
          {column.map((category) => {
            const Icon = category.icon;
            return (
              <li key={category.slug}>
                <Link
                  href={`/services/${category.slug}`}
                  className="duration-fast ease-standard hover:bg-primary-soft flex items-start gap-3 rounded-md p-2.5 transition-colors"
                >
                  <span className="bg-primary-soft text-primary flex size-9 shrink-0 items-center justify-center rounded-md">
                    <Icon className="size-4.5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="text-text block text-sm font-medium">{category.name}</span>
                    <span className="text-text-muted block text-[13px]">
                      {category.shortDescription}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ))}

      <div className="bg-primary text-text-inverse flex flex-col justify-between rounded-lg p-5">
        <div>
          <p className="font-heading text-lg font-semibold">Not sure what you need?</p>
          <p className="text-text-inverse/80 mt-1 text-sm">
            See every item and its price in one place.
          </p>
        </div>
        <Link
          href="/pricing"
          className="bg-surface text-primary duration-fast ease-standard hover:bg-surface-alt mt-4 inline-flex w-fit rounded-md px-4 py-2 text-sm font-medium transition-colors"
        >
          View full price list
        </Link>
      </div>
    </div>
  );
}
