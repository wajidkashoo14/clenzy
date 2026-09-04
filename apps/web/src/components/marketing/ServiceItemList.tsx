'use client';

import type { ServiceItemPayload } from '@clenzy/shared';
import type { ReactNode } from 'react';
import { ItemRow } from '@/components/cart/ItemRow';
import { removeWithUndo } from '@/features/cart/undoRemove';
import { useCartStore } from '@/stores/cartStore';

/** Client boundary for the service-detail page's price table, so it can add to cart. */
export function ServiceItemList({ items }: { items: ServiceItemPayload[] }): ReactNode {
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

  return (
    <div className="border-border divide-border mt-10 divide-y overflow-hidden rounded-lg border">
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
  );
}
