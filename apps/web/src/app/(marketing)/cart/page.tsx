import type { Metadata } from 'next';
import { CartPageContent } from '@/features/cart/CartPageContent';
import { brand } from '@/content/brand';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  ...buildMetadata({
    title: `Your Cart | ${brand.name}`,
    description: 'Review your items before booking a pickup.',
    path: '/cart',
  }),
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return <CartPageContent />;
}
