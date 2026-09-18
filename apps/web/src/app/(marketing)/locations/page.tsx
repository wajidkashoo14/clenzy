import { MapPin } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Card } from '@/components/ui/Card';
import { Container } from '@/components/layout/Container';
import { brand } from '@/content/brand';
import { SERVICE_AREAS } from '@/content/locations';
import { breadcrumbJsonLd, buildMetadata, JsonLd } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: `Areas We Cover in Srinagar | ${brand.name}`,
  description:
    'Free doorstep pickup and delivery across Srinagar — check coverage and turnaround for your area.',
  path: '/locations',
});

export default function LocationsIndexPage() {
  const breadcrumbItems = [{ label: 'Home', href: '/' }, { label: 'Locations' }];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(breadcrumbItems)} />
      <Container className="py-10 lg:py-16">
        <Breadcrumb items={breadcrumbItems} />

        <div className="mt-4 max-w-2xl">
          <h1 className="font-heading text-text text-3xl font-semibold sm:text-4xl">
            Areas we cover
          </h1>
          <p className="text-text-muted mt-3">
            We’re expanding across Srinagar. Don’t see your area yet?{' '}
            <Link href="/contact" className="hover:text-text underline">
              Let us know
            </Link>{' '}
            and we’ll notify you when we launch there.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICE_AREAS.map((area) => (
            <Link key={area.slug} href={`/locations/${area.slug}`} className="block">
              <Card interactive padding="lg" className="h-full">
                <span className="bg-primary-soft text-primary flex size-10 items-center justify-center rounded-lg">
                  <MapPin className="size-4.5" aria-hidden="true" />
                </span>
                <h2 className="text-text mt-3 text-base font-semibold">{area.name}</h2>
                <p className="text-text-muted mt-1 text-[13px]">Pin code {area.pincode}</p>
                <p className="text-text-muted mt-2 text-sm">{area.description}</p>
                {area.expressAvailable && (
                  <span className="bg-accent-soft mt-3 inline-block rounded-full px-2.5 py-1 text-xs font-semibold text-[color-mix(in_srgb,var(--color-accent)_65%,black)]">
                    Express available
                  </span>
                )}
              </Card>
            </Link>
          ))}
        </div>
      </Container>
    </>
  );
}
