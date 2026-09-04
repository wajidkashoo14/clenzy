'use client';

import type { PricingGroupPayload } from '@clenzy/shared';
import { Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { formatRupees } from '@/lib/format';

/**
 * Search overrides the category-tabbed browse view with a single flat,
 * matched-items table — the "item picker" search task from
 * docs/DEVELOPMENT_PLAN.md Phase 5. Quantity steppers aren't included here:
 * without a cart to add to yet (Phase 6), a stepper would have no action to
 * drive — it lands once "add to cart" exists.
 */
export function PriceListSearch({ groups }: { groups: PricingGroupPayload[] }): ReactNode {
  const [query, setQuery] = useState('');
  const trimmedQuery = query.trim().toLowerCase();

  const searchResults = useMemo(() => {
    if (!trimmedQuery) return null;
    return groups.flatMap(({ category, items }) =>
      items
        .filter((item) => item.name.toLowerCase().includes(trimmedQuery))
        .map((item) => ({ item, categoryName: category.name })),
    );
  }, [groups, trimmedQuery]);

  return (
    <div className="mt-8">
      <div className="relative max-w-sm">
        <Search
          className="text-text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search an item, e.g. “saree”"
          aria-label="Search the price list"
          className="border-border-strong bg-surface-alt text-text placeholder:text-text-muted focus-visible:border-primary focus-visible:shadow-focus duration-fast ease-standard h-11 w-full rounded-md border pr-3.5 pl-9 text-sm transition-[border-color,box-shadow] focus-visible:outline-none"
        />
      </div>

      {searchResults ? (
        <div className="border-border mt-6 overflow-hidden rounded-lg border">
          {searchResults.length === 0 ? (
            <p className="text-text-muted p-6 text-center text-sm">
              No items match &ldquo;{query.trim()}&rdquo;.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface-alt">
                <tr>
                  <th className="text-text px-4 py-3 text-left font-semibold">Item</th>
                  <th className="text-text px-4 py-3 text-right font-semibold">Price</th>
                </tr>
              </thead>
              <tbody>
                {searchResults.map(({ item, categoryName }, i) => (
                  <tr key={item.id} className={i % 2 === 1 ? 'bg-surface-alt' : 'bg-surface'}>
                    <td className="text-text px-4 py-3">
                      {item.name}
                      <span className="text-text-muted block text-[13px]">{categoryName}</span>
                    </td>
                    <td className="text-text px-4 py-3 text-right font-medium tabular-nums">
                      {formatRupees(item.price)}{' '}
                      <span className="text-text-muted">/ {item.unit}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <Tabs defaultValue={groups[0]?.category.slug} className="mt-6">
          <TabsList className="flex-wrap">
            {groups.map(({ category }) => (
              <TabsTrigger key={category.slug} value={category.slug}>
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {groups.map(({ category, items }) => (
            <TabsContent key={category.slug} value={category.slug}>
              <div className="border-border overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-surface-alt">
                    <tr>
                      <th className="text-text px-4 py-3 text-left font-semibold">Item</th>
                      <th className="text-text px-4 py-3 text-right font-semibold">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={item.slug} className={i % 2 === 1 ? 'bg-surface-alt' : 'bg-surface'}>
                        <td className="text-text px-4 py-3">{item.name}</td>
                        <td className="text-text px-4 py-3 text-right font-medium tabular-nums">
                          {formatRupees(item.price)}{' '}
                          <span className="text-text-muted">/ {item.unit}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
