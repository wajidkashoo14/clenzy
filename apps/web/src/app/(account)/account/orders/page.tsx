import type { Metadata } from 'next';
import { OrderHistoryContent } from '@/features/orders/OrderHistoryContent';

export const metadata: Metadata = {
  title: 'Your Orders',
  robots: { index: false, follow: false },
};

export default function OrderHistoryPage() {
  return <OrderHistoryContent />;
}
