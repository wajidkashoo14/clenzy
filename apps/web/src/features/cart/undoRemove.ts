import { toast } from '@/lib/toast';
import { useCartStore, type CartLine } from '@/stores/cartStore';

/** Removal always offers Undo, per docs/DEVELOPMENT_PLAN.md Phase 6 ("removal with undo"). */
export function removeWithUndo(line: CartLine): void {
  useCartStore.getState().removeItem(line.serviceItemId);
  toast.info(`Removed ${line.name}`, {
    action: {
      label: 'Undo',
      onClick: () => useCartStore.getState().addItem(line, line.quantity),
    },
  });
}
