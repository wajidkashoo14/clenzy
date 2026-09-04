import type { Metadata } from 'next';
import { OrderTrackingContent } from '@/features/orders/OrderTrackingContent';

export const metadata: Metadata = {
  title: 'Track Order',
  robots: { index: false, follow: false },
};

export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  return <OrderTrackingContent orderNumber={orderNumber} />;
}
