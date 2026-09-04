'use client';

import type { AddressPayload, CouponValidateResult, PlaceOrderInput } from '@clenzy/shared';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { AddressForm } from '@/features/addresses/AddressForm';
import { AddressList } from '@/features/addresses/AddressList';
import * as addressesApi from '@/features/addresses/api';
import { placeOrder } from '@/features/checkout/api';
import { CouponStep } from '@/features/checkout/CouponStep';
import { OrderSummary } from '@/features/checkout/OrderSummary';
import { ReviewStep, type PaymentMethod } from '@/features/checkout/ReviewStep';
import { SlotStep, type SlotValue } from '@/features/checkout/SlotStep';
import { StepIndicator } from '@/features/checkout/StepIndicator';
import { ApiError } from '@/lib/api-client';
import { addDaysToDateString, todayInKolkata } from '@/lib/date';
import { toast } from '@/lib/toast';
import { useCartStore } from '@/stores/cartStore';

const STEPS = ['Address', 'Pickup', 'Delivery', 'Coupon', 'Review'];

export function CheckoutWizard(): ReactNode {
  const router = useRouter();
  const lines = useCartStore((state) => state.lines);
  const isExpress = useCartStore((state) => state.isExpress);
  const estimate = useCartStore((state) => state.estimate);

  const [stepIndex, setStepIndex] = useState(0);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const [addresses, setAddresses] = useState<AddressPayload[] | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<AddressPayload | undefined>();

  const [pickupSlot, setPickupSlot] = useState<SlotValue | null>(null);
  const [deliverySlot, setDeliverySlot] = useState<SlotValue | null>(null);

  const [couponResult, setCouponResult] = useState<CouponValidateResult | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('online');
  const [customerNote, setCustomerNote] = useState('');
  const [isPlacing, setIsPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string>();

  useEffect(() => {
    if (lines.length === 0) router.replace('/cart');
  }, [lines.length, router]);

  useEffect(() => {
    void addressesApi.listAddresses().then(({ addresses: loaded }) => {
      setAddresses(loaded);
      const defaultAddress =
        loaded.find((a) => a.isDefault && a.isServiceable) ?? loaded.find((a) => a.isServiceable);
      if (defaultAddress) setSelectedAddressId(defaultAddress.id);
      if (loaded.length === 0) setShowAddressForm(true);
    });
  }, []);

  if (lines.length === 0 || !estimate) return null;

  const selectedAddress = addresses?.find((a) => a.id === selectedAddressId) ?? null;
  const cartItems = lines.map((l) => ({ serviceItemId: l.serviceItemId, quantity: l.quantity }));
  const combinedSubtotal = estimate.itemsSubtotal + estimate.expressSurcharge;
  const today = todayInKolkata();

  function refreshAddresses(next: AddressPayload): void {
    setAddresses((current) => {
      const list = current ?? [];
      const existed = list.some((a) => a.id === next.id);
      const withReplacement = existed
        ? list.map((a) => (a.id === next.id ? next : a))
        : [...list, next];
      return next.isDefault
        ? withReplacement.map((a) => (a.id === next.id ? a : { ...a, isDefault: false }))
        : withReplacement;
    });
    setSelectedAddressId(next.id);
    setShowAddressForm(false);
    setEditingAddress(undefined);
  }

  async function handleDeleteAddress(id: string): Promise<void> {
    await addressesApi.deleteAddress(id);
    setAddresses((current) => (current ?? []).filter((a) => a.id !== id));
    if (selectedAddressId === id) setSelectedAddressId(null);
    toast.success('Address removed');
  }

  async function handlePlaceOrder(): Promise<void> {
    if (!selectedAddress || !pickupSlot || !deliverySlot) return;
    setPlaceError(undefined);
    setIsPlacing(true);
    try {
      const input: PlaceOrderInput = {
        items: cartItems,
        pickupAddressId: selectedAddress.id,
        deliveryAddressId: selectedAddress.id,
        pickupSlot,
        deliverySlot,
        isExpress,
        couponCode: couponResult?.coupon.code,
        paymentMethod,
        customerNote: customerNote || undefined,
        idempotencyKey,
      };
      const { order, payment } = await placeOrder(input);
      // Cleared from the confirmation page, not here — clearing first would empty
      // `lines`, which this component's own guard effect reacts to by redirecting
      // to /cart, racing the navigation below.
      if (order.status === 'PENDING_PAYMENT' && payment) {
        const query = new URLSearchParams({
          razorpayOrderId: payment.razorpayOrderId,
          amount: String(payment.amount),
          keyId: payment.keyId,
        });
        router.push(`/checkout/processing/${order.orderNumber}?${query.toString()}`);
      } else {
        toast.success('Order placed!');
        router.push(`/checkout/confirmation/${order.orderNumber}`);
      }
    } catch (err) {
      setPlaceError(
        err instanceof ApiError ? err.message : 'Could not place your order. Please try again.',
      );
    } finally {
      setIsPlacing(false);
    }
  }

  const canContinue =
    (stepIndex === 0 && Boolean(selectedAddress?.isServiceable)) ||
    (stepIndex === 1 && Boolean(pickupSlot)) ||
    (stepIndex === 2 && Boolean(deliverySlot)) ||
    stepIndex === 3;

  return (
    <div className="grid grid-cols-1 gap-8 pb-24 lg:grid-cols-[1fr_360px] lg:pb-0">
      <div>
        <StepIndicator steps={STEPS} currentIndex={stepIndex} />

        <div className="mt-6">
          {stepIndex === 0 &&
            (showAddressForm ? (
              <AddressForm
                address={editingAddress}
                onSaved={refreshAddresses}
                onCancel={() => {
                  setShowAddressForm(false);
                  setEditingAddress(undefined);
                }}
              />
            ) : addresses === null ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <AddressList
                  addresses={addresses}
                  selectedId={selectedAddressId}
                  onSelect={(id) => {
                    const address = addresses.find((a) => a.id === id);
                    if (address?.isServiceable) setSelectedAddressId(id);
                    else toast.error("We don't deliver to this address yet.");
                  }}
                  onEdit={(address) => {
                    setEditingAddress(address);
                    setShowAddressForm(true);
                  }}
                  onDelete={handleDeleteAddress}
                />
                <Button type="button" variant="secondary" onClick={() => setShowAddressForm(true)}>
                  Add a new address
                </Button>
              </div>
            ))}

          {stepIndex === 1 && selectedAddress?.serviceAreaId && (
            <SlotStep
              type="pickup"
              areaId={selectedAddress.serviceAreaId}
              fromDate={today}
              value={pickupSlot}
              onChange={setPickupSlot}
            />
          )}

          {stepIndex === 2 && selectedAddress?.serviceAreaId && pickupSlot && (
            <SlotStep
              type="delivery"
              areaId={selectedAddress.serviceAreaId}
              fromDate={addDaysToDateString(pickupSlot.date, 1)}
              value={deliverySlot}
              onChange={setDeliverySlot}
            />
          )}

          {stepIndex === 3 && (
            <CouponStep
              items={cartItems}
              subtotal={combinedSubtotal}
              areaId={selectedAddress?.serviceAreaId}
              applied={couponResult}
              onApply={setCouponResult}
              onRemove={() => setCouponResult(null)}
            />
          )}

          {stepIndex === 4 && selectedAddress && pickupSlot && deliverySlot && (
            <ReviewStep
              estimate={estimate}
              couponDiscount={couponResult?.discountAmount ?? 0}
              address={selectedAddress}
              pickupSlot={pickupSlot}
              deliverySlot={deliverySlot}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              customerNote={customerNote}
              onCustomerNoteChange={setCustomerNote}
              onPlaceOrder={() => void handlePlaceOrder()}
              isPlacing={isPlacing}
              placeError={placeError}
            />
          )}
        </div>

        {stepIndex < 4 && (
          <div className="mt-6 flex justify-between">
            <Button
              type="button"
              variant="secondary"
              disabled={stepIndex === 0}
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            >
              Back
            </Button>
            <Button
              type="button"
              disabled={!canContinue}
              onClick={() => setStepIndex((i) => i + 1)}
            >
              Continue
            </Button>
          </div>
        )}
      </div>

      <OrderSummary
        estimate={estimate}
        couponDiscount={couponResult?.discountAmount ?? 0}
        couponCode={couponResult?.coupon.code}
      />
    </div>
  );
}
