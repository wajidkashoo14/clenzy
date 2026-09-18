import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Card } from '@/components/ui/Card';
import { Container } from '@/components/layout/Container';
import { brand } from '@/content/brand';
import { getCategories } from '@/lib/catalog-api';
import { formatRupees } from '@/lib/format';
import { renderIcon } from '@/lib/icons';
import { breadcrumbJsonLd, buildMetadata, JsonLd } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: `All Services | ${brand.name}`,
  description:
    'Every laundry, dry-cleaning, and home fabric-care service we offer in Srinagar, with transparent per-item pricing.',
  path: '/services',
});

export default async function ServicesIndexPage() {
  const breadcrumbItems = [{ label: 'Home', href: '/' }, { label: 'Services' }];
  const categories = await getCategories();

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(breadcrumbItems)} />
      <Container className="py-10 lg:py-16">
        <Breadcrumb items={breadcrumbItems} />

        <div className="mt-4 max-w-2xl">
          <h1 className="font-heading text-text text-3xl font-semibold sm:text-4xl">
            Our services
          </h1>
          <p className="text-text-muted mt-3">
            Nine categories covering everything from everyday laundry to specialty pashmina care.
            Every item has a listed price — pick a category to see the full breakdown.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link key={category.slug} href={`/services/${category.slug}`} className="group block">
              <Card interactive padding="lg" className="h-full">
                <span className="bg-primary-soft text-primary flex size-11 items-center justify-center rounded-lg">
                  {renderIcon(category.icon, 'size-5')}
                </span>
                <h2 className="text-text mt-4 text-base font-semibold">{category.name}</h2>
                <p className="text-text-muted mt-1.5 text-sm">{category.description}</p>
                <p className="text-text-muted mt-3 flex items-center justify-between text-sm">
                  <span>
                    {category.itemCount} items · {category.turnaroundHours}h turnaround
                  </span>
                  <span className="text-primary font-medium">
                    From{' '}
                    {category.startingPrice !== undefined && formatRupees(category.startingPrice)}
                  </span>
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </Container>
    </>
  );
}
