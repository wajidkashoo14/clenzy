import type {
  CouponValidateInput,
  CouponValidateResult,
  OrderPayload,
  PlaceOrderInput,
  PlaceOrderResult,
  SlotsResult,
} from '@clenzy/shared';
import { apiGet, apiPost } from '@/lib/api-client';

export function getSlots(params: {
  type: 'pickup' | 'delivery';
  areaId: string;
  from: string;
  days?: number;
}): Promise<SlotsResult> {
  const query = new URLSearchParams({
    type: params.type,
    areaId: params.areaId,
    from: params.from,
    days: String(params.days ?? 7),
  });
  return apiGet(`/api/v1/slots?${query.toString()}`);
}

export function validateCoupon(input: CouponValidateInput): Promise<CouponValidateResult> {
  return apiPost('/api/v1/coupons/validate', input);
}

export function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  return apiPost('/api/v1/orders', input);
}

export function getOrder(orderNumber: string): Promise<{ order: OrderPayload }> {
  return apiGet(`/api/v1/orders/${orderNumber}`);
}
