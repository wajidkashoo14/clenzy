import type { PaymentRetryResult, PaymentStatusResult, PaymentVerifyInput } from '@clenzy/shared';
import { apiGet, apiPost } from '@/lib/api-client';

export function verifyPayment(input: PaymentVerifyInput): Promise<{ verified: boolean }> {
  return apiPost('/api/v1/payments/verify', input);
}

export function getPaymentStatus(orderNumber: string): Promise<PaymentStatusResult> {
  return apiGet(`/api/v1/payments/status/${orderNumber}`);
}

export function retryPayment(orderNumber: string): Promise<PaymentRetryResult> {
  return apiPost(`/api/v1/payments/retry/${orderNumber}`, {});
}

/** Dev-only — see apps/api/src/services/devPaymentSimulator.service.ts. 404s in production or once real Razorpay keys are configured. */
export function simulatePayment(
  orderNumber: string,
  outcome: 'success' | 'failure',
): Promise<{ orderStatus: string; paymentStatus: string }> {
  return apiPost('/api/v1/dev/simulate-payment', { orderNumber, outcome });
}
