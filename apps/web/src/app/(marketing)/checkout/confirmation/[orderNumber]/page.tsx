import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { ConfirmationContent } from '@/features/checkout/ConfirmationContent';
import { brand } from '@/content/brand';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  ...buildMetadata({
    title: `Order Confirmed | ${brand.name}`,
    description: 'Your Clenzy order is confirmed.',
    path: '/checkout/confirmation',
  }),
  robots: { index: false, follow: false },
};

export default async function CheckoutConfirmationPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  return (
    <Container className="py-8 lg:py-16">
      <ConfirmationContent orderNumber={orderNumber} />
    </Container>
  );
}
