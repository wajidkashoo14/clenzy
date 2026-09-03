import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { LeadForm } from '@/components/marketing/LeadForm';
import { brand } from '@/content/brand';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: `Book a Pickup | ${brand.name}`,
  description: 'Request a laundry or dry-cleaning pickup in under a minute.',
  path: '/book',
});

export default function BookPage() {
  return (
    <Container className="py-10 lg:py-16">
      <div className="mx-auto max-w-lg">
        <div className="text-center">
          <h1 className="font-heading text-text text-3xl font-semibold sm:text-4xl">
            Book a pickup
          </h1>
          <p className="text-text-muted mt-3">
            Tell us a little about what you need — we’ll confirm the exact price and schedule when
            we arrive.
          </p>
        </div>

        <div className="border-border bg-surface mt-10 rounded-lg border p-6">
          <LeadForm />
        </div>
      </div>
    </Container>
  );
}
