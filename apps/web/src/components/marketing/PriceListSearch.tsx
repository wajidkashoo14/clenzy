'use client';

import type { PricingGroupPayload, ServiceItemPayload } from '@clenzy/shared';
import { Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { ItemRow } from '@/components/cart/ItemRow';
import { removeWithUndo } from '@/features/cart/undoRemove';
import { useCartStore } from '@/stores/cartStore';

/**
 * Search overrides the category-tabbed browse view with a single flat,
 * matched-items table — the "item picker" search task from
 * docs/DEVELOPMENT_PLAN.md Phase 5, now with the quantity-stepper "add to
 * cart" affordance from Phase 6 (deferred there originally since there was
 * no cart yet for it to act on).
 */
export function PriceListSearch({ groups }: { groups: PricingGroupPayload[] }): ReactNode {
  const [query, setQuery] = useState('');
  const trimmedQuery = query.trim().toLowerCase();
  const lines = useCartStore((state) => state.lines);
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);

  function quantityFor(itemId: string): number {
    return lines.find((l) => l.serviceItemId === itemId)?.quantity ?? 0;
  }

  function handleQuantityChange(item: ServiceItemPayload, quantity: number): void {
    const current = quantityFor(item.id);
    if (quantity <= 0) {
      const line = lines.find((l) => l.serviceItemId === item.id);
      if (line) removeWithUndo(line);
      return;
    }
    if (current === 0) {
      addItem(
        { serviceItemId: item.id, name: item.name, unit: item.unit, careNote: item.careNote },
        quantity,
      );
    } else {
      updateQuantity(item.id, quantity);
    }
  }

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
            <div className="divide-border divide-y">
              {searchResults.map(({ item, categoryName }) => (
                <div key={item.id}>
                  <p className="text-text-muted bg-surface-alt px-4 pt-2 text-[11px] font-medium tracking-wide uppercase">
                    {categoryName}
                  </p>
                  <ItemRow
                    name={item.name}
                    careNote={item.careNote}
                    unit={item.unit}
                    unitPrice={item.price}
                    quantity={quantityFor(item.id)}
                    max={item.maxQuantity}
                    onQuantityChange={(quantity) => handleQuantityChange(item, quantity)}
                  />
                </div>
              ))}
            </div>
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
              <div className="border-border divide-border divide-y overflow-hidden rounded-lg border">
                {items.map((item) => (
                  <ItemRow
                    key={item.slug}
                    name={item.name}
                    careNote={item.careNote}
                    unit={item.unit}
                    unitPrice={item.price}
                    quantity={quantityFor(item.id)}
                    max={item.maxQuantity}
                    onQuantityChange={(quantity) => handleQuantityChange(item, quantity)}
                  />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
