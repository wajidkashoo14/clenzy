import { OrderDetailContent } from '@/features/admin/OrderDetailContent';

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrderDetailContent id={id} />;
}
