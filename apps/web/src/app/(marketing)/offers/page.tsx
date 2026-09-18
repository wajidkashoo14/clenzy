import { Tag } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Container } from '@/components/layout/Container';
import { brand } from '@/content/brand';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: `Offers | ${brand.name}`,
  description: 'Current promotions and discounts.',
  path: '/offers',
});

/**
 * No coupon engine exists yet (docs/DEVELOPMENT_PLAN.md Phase 6/7) — an
 * honest empty state here, not fabricated discount codes.
 */
export default function OffersPage() {
  return (
    <Container className="py-10 lg:py-16">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Offers' }]} />

      <div className="mt-4">
        <EmptyState
          icon={Tag}
          title="No active offers right now"
          description="Check back soon, or follow us for updates when new promotions launch."
        />
        <div className="flex justify-center">
          <Button asChild size="sm" variant="secondary">
            <Link href="/contact">Contact us</Link>
          </Button>
        </div>
      </div>

      <p className="text-text-muted mt-6 text-center text-sm">
        Prefer email? Reach us at{' '}
        <Link href={`mailto:${brand.email}`} className="hover:text-text underline">
          {brand.email}
        </Link>
        .
      </p>
    </Container>
  );
}
