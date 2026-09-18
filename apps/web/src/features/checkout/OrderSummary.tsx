'use client';

import type { CartEstimateResult } from '@clenzy/shared';
import { ChevronUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { formatRupees } from '@/lib/format';
import { cn } from '@/lib/cn';

interface OrderSummaryProps {
  estimate: CartEstimateResult;
  couponDiscount: number;
  couponCode?: string;
}

/** Sticky sidebar (desktop) / collapsible bottom sheet (mobile) — see docs/DESIGN_SYSTEM.md §5. */
export function OrderSummary({
  estimate,
  couponDiscount,
  couponCode,
}: OrderSummaryProps): ReactNode {
  const [expandedOnMobile, setExpandedOnMobile] = useState(false);
  const grandTotal = estimate.grandTotal - couponDiscount;

  const breakdown = (
    <div className="flex flex-col gap-1.5 text-sm">
      <div className="text-text-muted flex justify-between">
        <span>Subtotal</span>
        <span className="tabular-nums">{formatRupees(estimate.itemsSubtotal)}</span>
      </div>
      {estimate.expressSurcharge > 0 && (
        <div className="text-text-muted flex justify-between">
          <span>Express surcharge</span>
          <span className="tabular-nums">{formatRupees(estimate.expressSurcharge)}</span>
        </div>
      )}
      <div className="text-text-muted flex justify-between">
        <span>Delivery</span>
        <span className="tabular-nums">
          {estimate.deliveryFee === 0 ? 'Free' : formatRupees(estimate.deliveryFee)}
        </span>
      </div>
      {estimate.taxTotal > 0 && (
        <div className="text-text-muted flex justify-between">
          <span>Tax</span>
          <span className="tabular-nums">{formatRupees(estimate.taxTotal)}</span>
        </div>
      )}
      {couponDiscount > 0 && (
        <div className="text-success flex justify-between">
          <span>Coupon{couponCode ? ` (${couponCode})` : ''}</span>
          <span className="tabular-nums">−{formatRupees(couponDiscount)}</span>
        </div>
      )}
      <div className="border-border text-text mt-2 flex justify-between border-t pt-2 text-base font-semibold">
        <span>Total</span>
        <span className="tabular-nums">{formatRupees(grandTotal)}</span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: sticky sidebar. */}
      <div className="border-border sticky top-24 hidden h-fit rounded-lg border p-5 lg:block">
        <h2 className="text-text text-base font-semibold">Order summary</h2>
        <div className="mt-4">{breakdown}</div>
      </div>

      {/* Mobile/tablet: collapsible bottom sheet. */}
      <div className="border-border bg-surface fixed inset-x-0 bottom-0 z-40 border-t lg:hidden">
        <button
          type="button"
          onClick={() => setExpandedOnMobile((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3"
        >
          <span className="text-text text-sm font-semibold">Total {formatRupees(grandTotal)}</span>
          <ChevronUp
            className={cn(
              'text-text-muted size-4 transition-transform',
              expandedOnMobile && 'rotate-180',
            )}
            aria-hidden="true"
          />
        </button>
        {expandedOnMobile && <div className="border-border border-t px-4 py-3">{breakdown}</div>}
      </div>
    </>
  );
}
