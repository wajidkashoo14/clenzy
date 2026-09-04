'use client';

import type { CouponValidateResult } from '@clenzy/shared';
import { Tag, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { validateCoupon } from '@/features/checkout/api';
import { ApiError } from '@/lib/api-client';
import { formatRupees } from '@/lib/format';

interface CouponStepProps {
  items: { serviceItemId: string; quantity: number }[];
  subtotal: number;
  areaId?: string;
  applied: CouponValidateResult | null;
  onApply: (result: CouponValidateResult) => void;
  onRemove: () => void;
}

/** Inline apply with loading + a removable success chip — see docs/DESIGN_SYSTEM.md §5. */
export function CouponStep({
  items,
  subtotal,
  areaId,
  applied,
  onApply,
  onRemove,
}: CouponStepProps): ReactNode {
  const [code, setCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string>();

  async function handleApply(): Promise<void> {
    if (!code.trim()) return;
    setError(undefined);
    setIsApplying(true);
    try {
      const result = await validateCoupon({ code: code.trim(), items, subtotal, areaId });
      onApply(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not apply this coupon.');
    } finally {
      setIsApplying(false);
    }
  }

  if (applied) {
    return (
      <div className="border-success bg-success-soft flex items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <Badge color="success" dot>
            <Tag className="size-3" aria-hidden="true" />
            {applied.coupon.code}
          </Badge>
          <span className="text-text text-sm">
            {formatRupees(applied.discountAmount)} off applied
          </span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove coupon"
          className="text-text-muted hover:text-text"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Input
            label="Coupon code"
            placeholder="e.g. CLENZY50"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            error={error}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          isLoading={isApplying}
          disabled={!code.trim()}
          onClick={() => void handleApply()}
        >
          Apply
        </Button>
      </div>
      <p className="text-text-muted text-[13px]">Have a code? Apply it here, or skip this step.</p>
    </div>
  );
}
