import type { CartEstimateInput, CartEstimateResult } from '@clenzy/shared';
import { apiPost } from '@/lib/api-client';

export function estimateCart(input: CartEstimateInput): Promise<CartEstimateResult> {
  return apiPost('/api/v1/cart/estimate', input);
}
