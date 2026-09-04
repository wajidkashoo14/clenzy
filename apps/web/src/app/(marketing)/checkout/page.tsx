import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { CheckoutWizard } from '@/features/checkout/CheckoutWizard';
import { brand } from '@/content/brand';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  ...buildMetadata({
    title: `Checkout | ${brand.name}`,
    description: 'Confirm your address, pickup and delivery slots, and place your order.',
    path: '/checkout',
  }),
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <Container className="py-8 lg:py-12">
      <h1 className="font-heading text-text mb-6 text-2xl font-semibold sm:text-3xl">Checkout</h1>
      <CheckoutWizard />
    </Container>
  );
}
