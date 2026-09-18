import { Suspense } from 'react';
import { OrdersListContent } from '@/features/admin/OrdersListContent';

export default function AdminOrdersPage() {
  return (
    <Suspense>
      <OrdersListContent />
    </Suspense>
  );
}
