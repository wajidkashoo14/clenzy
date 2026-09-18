import type { Metadata } from 'next';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Container } from '@/components/layout/Container';
import { PriceListSearch } from '@/components/marketing/PriceListSearch';
import { brand } from '@/content/brand';
import { getPricingGroups } from '@/lib/catalog-api';
import { breadcrumbJsonLd, buildMetadata, JsonLd } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: `Laundry & Dry Cleaning Price List — Srinagar | ${brand.name}`,
  description:
    'Transparent, per-item pricing for laundry, dry cleaning, and home fabric care in Srinagar. No hidden charges.',
  path: '/pricing',
});

export default async function PricingPage() {
  const breadcrumbItems = [{ label: 'Home', href: '/' }, { label: 'Pricing' }];
  const groups = await getPricingGroups();

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(breadcrumbItems)} />
      <Container className="py-10 lg:py-16">
        <Breadcrumb items={breadcrumbItems} />

        <div className="mt-4 max-w-2xl">
          <h1 className="font-heading text-text text-3xl font-semibold sm:text-4xl">Price list</h1>
          <p className="text-text-muted mt-3">
            Every price, upfront. Final totals are confirmed after our team inspects your items at
            pickup.
          </p>
        </div>

        <PriceListSearch groups={groups} />
      </Container>
    </>
  );
}
