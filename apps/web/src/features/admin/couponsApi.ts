import type { CouponListQuery, CreateCouponInput, UpdateCouponInput } from '@clenzy/shared';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client';

export interface AdminCoupon {
  _id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderValue: number;
  validFrom: string;
  validUntil: string;
  usageLimitTotal?: number;
  usageLimitPerUser: number;
  usedCount: number;
  firstOrderOnly: boolean;
  applicableCategories: string[];
  applicableAreas: string[];
  restrictedToUsers: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCouponRedemption {
  _id: string;
  couponId: string;
  userId: { _id: string; name?: string; phone: string } | null;
  orderId: { _id: string; orderNumber: string } | null;
  discountAmount: number;
  redeemedAt: string;
}

export function listCoupons(
  query: CouponListQuery,
): Promise<{ coupons: AdminCoupon[]; total: number; page: number; pageSize: number }> {
  const params = new URLSearchParams();
  params.set('status', query.status);
  if (query.q) params.set('q', query.q);
  params.set('page', String(query.page));
  params.set('pageSize', String(query.pageSize));
  return apiGet(`/api/v1/admin/coupons?${params.toString()}`);
}
export function getCoupon(id: string): Promise<{ coupon: AdminCoupon }> {
  return apiGet(`/api/v1/admin/coupons/${id}`);
}
export function createCoupon(input: CreateCouponInput): Promise<{ coupon: AdminCoupon }> {
  return apiPost('/api/v1/admin/coupons', input);
}
export function updateCoupon(
  id: string,
  input: UpdateCouponInput,
): Promise<{ coupon: AdminCoupon }> {
  return apiPatch(`/api/v1/admin/coupons/${id}`, input);
}
export function deactivateCoupon(id: string): Promise<{ coupon: AdminCoupon }> {
  return apiDelete(`/api/v1/admin/coupons/${id}`);
}
export function getCouponRedemptions(
  id: string,
): Promise<{ redemptions: AdminCouponRedemption[] }> {
  return apiGet(`/api/v1/admin/coupons/${id}/redemptions`);
}
