import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { ProcessingContent } from '@/features/checkout/ProcessingContent';
import { brand } from '@/content/brand';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  ...buildMetadata({
    title: `Processing Payment | ${brand.name}`,
    description: 'Confirming your payment.',
    path: '/checkout/processing',
  }),
  robots: { index: false, follow: false },
};

export default async function CheckoutProcessingPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  return (
    <Container className="py-8 lg:py-16">
      <ProcessingContent orderNumber={orderNumber} />
    </Container>
  );
}
