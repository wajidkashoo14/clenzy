import type { ReactNode } from 'react';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { cn } from '@/lib/cn';
import { formatRupees } from '@/lib/format';

export interface ItemRowProps {
  name: string;
  careNote?: string;
  unit: string;
  /** Paise. */
  unitPrice: number;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
}

/**
 * The highest-traffic component in the product — see docs/DESIGN_SYSTEM.md
 * §5 "Item row (price list / picker)": name + care note on the left, unit
 * price + quantity stepper on the right, 64px min height, primary-soft
 * background + left accent border once quantity > 0. One component, reused
 * in the catalog, the cart drawer, and the cart page (checkout review and
 * admin itemization reuse it too, once those phases land).
 */
export function ItemRow({
  name,
  careNote,
  unit,
  unitPrice,
  quantity,
  onQuantityChange,
  min = 0,
  max = 99,
  disabled,
  className,
}: ItemRowProps): ReactNode {
  return (
    <div
      className={cn(
        'flex min-h-16 items-center justify-between gap-4 border-l-2 border-l-transparent px-4 py-3',
        quantity > 0 && 'bg-primary-soft border-l-primary',
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-text truncate text-sm font-medium">{name}</p>
        {careNote && <p className="text-text-muted text-[13px]">{careNote}</p>}
        <p className="text-text-muted text-[13px]">
          {formatRupees(unitPrice)} / {unit}
        </p>
      </div>

      <QuantityStepper
        value={quantity}
        onChange={onQuantityChange}
        min={min}
        max={max}
        disabled={disabled}
        aria-label={`Quantity for ${name}`}
      />
    </div>
  );
}
