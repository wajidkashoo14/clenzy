'use client';

import type { AddressPayload, CartEstimateResult } from '@clenzy/shared';
import { CreditCard, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { formatRupees, formatSlotDate, formatSlotWindow } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { SlotValue } from '@/features/checkout/SlotStep';

export type PaymentMethod = 'cod' | 'online';

interface ReviewStepProps {
  estimate: CartEstimateResult;
  couponDiscount: number;
  address: AddressPayload;
  pickupSlot: SlotValue;
  deliverySlot: SlotValue;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  customerNote: string;
  onCustomerNoteChange: (note: string) => void;
  onPlaceOrder: () => void;
  isPlacing: boolean;
  placeError?: string;
}

const PAYMENT_OPTIONS: {
  value: PaymentMethod;
  label: string;
  description: string;
  icon: typeof Wallet;
  disabled: boolean;
}[] = [
  {
    value: 'cod',
    label: 'Cash on delivery',
    description: 'Pay when your order is delivered.',
    icon: Wallet,
    disabled: false,
  },
  {
    value: 'online',
    label: 'Pay online',
    description: 'Card, UPI, netbanking — coming soon.',
    icon: CreditCard,
    disabled: true,
  },
];

export function ReviewStep({
  estimate,
  couponDiscount,
  address,
  pickupSlot,
  deliverySlot,
  paymentMethod,
  onPaymentMethodChange,
  customerNote,
  onCustomerNoteChange,
  onPlaceOrder,
  isPlacing,
  placeError,
}: ReviewStepProps): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="text-text text-sm font-semibold">Items</h3>
        <div className="border-border divide-border mt-2 divide-y rounded-lg border">
          {estimate.items.map((item) => (
            <div key={item.serviceItemId} className="flex justify-between px-4 py-2.5 text-sm">
              <span className="text-text">
                {item.name} × {item.quantity}
              </span>
              <span className="text-text-muted tabular-nums">{formatRupees(item.lineTotal)}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-text text-sm font-semibold">Deliver to</h3>
        <p className="text-text-muted mt-1 text-sm">
          {address.contactName} — {address.line1}, {address.area}, {address.city} –{' '}
          {address.pincode}
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <h3 className="text-text text-sm font-semibold">Pickup</h3>
          <p className="text-text-muted mt-1 text-sm">
            {formatSlotDate(pickupSlot.date)}, {formatSlotWindow(pickupSlot.window)}
          </p>
        </div>
        <div>
          <h3 className="text-text text-sm font-semibold">Delivery</h3>
          <p className="text-text-muted mt-1 text-sm">
            {formatSlotDate(deliverySlot.date)}, {formatSlotWindow(deliverySlot.window)}
          </p>
        </div>
      </section>

      <section>
        <h3 className="text-text mb-2 text-sm font-semibold">Payment method</h3>
        <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Payment method">
          {PAYMENT_OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = paymentMethod === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={option.disabled}
                onClick={() => onPaymentMethodChange(option.value)}
                className={cn(
                  'border-border-strong flex items-center gap-3 rounded-lg border p-3.5 text-left',
                  selected ? 'border-primary bg-primary-soft' : 'bg-surface',
                  option.disabled && 'cursor-not-allowed opacity-45',
                )}
              >
                <Icon className="text-text-muted size-5 shrink-0" aria-hidden="true" />
                <div className="flex-1">
                  <p className="text-text text-sm font-medium">{option.label}</p>
                  <p className="text-text-muted text-[13px]">{option.description}</p>
                </div>
                {option.disabled && <Badge color="neutral">Coming soon</Badge>}
              </button>
            );
          })}
        </div>
      </section>

      <Textarea
        label="Note for our team"
        placeholder="Optional — e.g. gate code, special instructions"
        value={customerNote}
        maxLength={500}
        onChange={(e) => onCustomerNoteChange(e.target.value)}
      />

      {placeError && <p className="text-error text-sm">{placeError}</p>}

      <Button size="lg" isLoading={isPlacing} onClick={onPlaceOrder} className="mb-16 lg:mb-0">
        Place order — {formatRupees(estimate.grandTotal - couponDiscount)}
      </Button>
    </div>
  );
}
