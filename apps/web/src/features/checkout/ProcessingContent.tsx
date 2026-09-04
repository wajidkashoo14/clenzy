'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import {
  getPaymentStatus,
  retryPayment,
  simulatePayment,
  verifyPayment,
} from '@/features/payments/api';
import { ApiError } from '@/lib/api-client';
import { formatRupees } from '@/lib/format';

const POLL_INTERVAL_MS = 2000;

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description?: string;
  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: { ondismiss?: () => void };
  theme?: { color?: string };
}

let razorpayScriptPromise: Promise<void> | null = null;
function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  razorpayScriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error('Could not load the payment gateway. Check your connection.'));
    document.body.appendChild(script);
  });
  return razorpayScriptPromise;
}

interface GatewayParams {
  razorpayOrderId: string;
  amount: number;
  keyId: string;
}

export function ProcessingContent({ orderNumber }: { orderNumber: string }): ReactNode {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRealGateway = Boolean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);

  const [gateway, setGateway] = useState<GatewayParams | null>(() => {
    const razorpayOrderId = searchParams.get('razorpayOrderId');
    const amount = searchParams.get('amount');
    const keyId = searchParams.get('keyId');
    return razorpayOrderId && amount && keyId
      ? { razorpayOrderId, amount: Number(amount), keyId }
      : null;
  });
  const [phase, setPhase] = useState<'opening' | 'waiting' | 'failed' | 'error'>('opening');
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isRetrying, setIsRetrying] = useState(false);
  const checkoutOpenedRef = useRef(false);

  // Poll for the authoritative (webhook-confirmed) status — this is what actually redirects,
  // whether the signal came from the real Checkout modal, the dev simulator, or a webhook alone.
  useEffect(() => {
    let cancelled = false;
    const timer = setInterval(() => {
      getPaymentStatus(orderNumber)
        .then((status) => {
          if (cancelled) return;
          if (status.paymentStatus === 'paid') {
            clearInterval(timer);
            router.replace(`/checkout/confirmation/${orderNumber}`);
          } else if (status.paymentStatus === 'failed') {
            setPhase('failed');
          }
        })
        .catch(() => {
          // Transient network hiccup — the next tick tries again.
        });
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [orderNumber, router]);

  // Open real Razorpay Checkout once, when a gateway order is available and a real key is configured.
  useEffect(() => {
    if (!isRealGateway || !gateway || checkoutOpenedRef.current) return;
    checkoutOpenedRef.current = true;

    loadRazorpayScript()
      .then(() => {
        if (!window.Razorpay) throw new Error('Payment gateway failed to load.');
        const checkout = new window.Razorpay({
          key: gateway.keyId,
          amount: gateway.amount,
          currency: 'INR',
          order_id: gateway.razorpayOrderId,
          name: 'Clenzy',
          description: `Order ${orderNumber}`,
          handler: (response) => {
            setPhase('waiting');
            verifyPayment({
              orderNumber,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }).catch(() => {
              // Advisory only — the poller above is what actually confirms payment.
            });
          },
          modal: { ondismiss: () => setPhase('waiting') },
          theme: { color: '#0f5c4c' },
        });
        checkout.open();
        setPhase('waiting');
      })
      .catch((err: unknown) => {
        setPhase('error');
        setErrorMessage(err instanceof Error ? err.message : 'Could not open the payment gateway.');
      });
  }, [isRealGateway, gateway, orderNumber]);

  async function handleRetry(): Promise<void> {
    setIsRetrying(true);
    try {
      const fresh = await retryPayment(orderNumber);
      setGateway({
        razorpayOrderId: fresh.razorpayOrderId,
        amount: fresh.amount,
        keyId: fresh.keyId,
      });
      checkoutOpenedRef.current = false;
      setPhase('opening');
      setErrorMessage(undefined);
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError ? err.message : 'Could not start a new payment attempt.',
      );
    } finally {
      setIsRetrying(false);
    }
  }

  async function handleSimulate(outcome: 'success' | 'failure'): Promise<void> {
    try {
      await simulatePayment(orderNumber, outcome);
      // The poller above picks up the resulting state on its next tick.
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Simulation failed.');
    }
  }

  if (phase === 'failed') {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <XCircle className="text-error size-14" aria-hidden="true" />
        <div>
          <h1 className="text-text text-xl font-semibold">Payment failed</h1>
          <p className="text-text-muted mt-1 text-sm">Your order is saved — try paying again.</p>
        </div>
        <Button size="lg" isLoading={isRetrying} onClick={() => void handleRetry()}>
          Try again
        </Button>
        {errorMessage && <p className="text-error text-sm">{errorMessage}</p>}
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <XCircle className="text-error size-14" aria-hidden="true" />
        <p className="text-text-muted text-sm">{errorMessage}</p>
        <Button size="lg" isLoading={isRetrying} onClick={() => void handleRetry()}>
          Try again
        </Button>
      </div>
    );
  }

  if (!isRealGateway) {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center gap-4 py-16 text-center">
        <Spinner />
        <div>
          <h1 className="text-text text-lg font-semibold">Waiting for payment</h1>
          <p className="text-text-muted mt-1 text-sm">
            No live payment gateway is configured — use the simulator below to test this flow.
          </p>
        </div>
        {gateway && (
          <p className="text-text-muted text-[13px]">
            Gateway order <span className="font-mono">{gateway.razorpayOrderId}</span> —{' '}
            {formatRupees(gateway.amount)}
          </p>
        )}
        <div className="mt-2 flex gap-3">
          <Button variant="secondary" onClick={() => void handleSimulate('success')}>
            <CheckCircle2 className="size-4" aria-hidden="true" />
            Simulate success
          </Button>
          <Button variant="secondary" onClick={() => void handleSimulate('failure')}>
            <XCircle className="size-4" aria-hidden="true" />
            Simulate failure
          </Button>
        </div>
        {!gateway && (
          <Button isLoading={isRetrying} onClick={() => void handleRetry()}>
            Get a payment to simulate
          </Button>
        )}
        {errorMessage && <p className="text-error text-sm">{errorMessage}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <Spinner />
      <p className="text-text-muted text-sm">
        {phase === 'opening' ? 'Opening the payment window…' : 'Waiting for payment confirmation…'}
      </p>
      {phase === 'waiting' && !gateway && (
        <Button isLoading={isRetrying} onClick={() => void handleRetry()}>
          Resume payment
        </Button>
      )}
    </div>
  );
}
