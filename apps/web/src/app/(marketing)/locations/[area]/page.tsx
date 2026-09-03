import { MapPin } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/layout/Container';
import { brand } from '@/content/brand';
import { getServiceAreaBySlug, SERVICE_AREAS } from '@/content/locations';
import { breadcrumbJsonLd, buildMetadata, JsonLd } from '@/lib/seo';

interface PageProps {
  params: Promise<{ area: string }>;
}

export function generateStaticParams() {
  return SERVICE_AREAS.map((area) => ({ area: area.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { area: slug } = await params;
  const area = getServiceAreaBySlug(slug);
  if (!area) return {};

  return buildMetadata({
    title: `Laundry Service in ${area.name}, Srinagar | ${brand.name}`,
    description: `Free doorstep pickup and delivery for laundry and dry cleaning in ${area.name}, Srinagar (${area.pincode}). ${area.description}`,
    path: `/locations/${area.slug}`,
  });
}

export default async function LocationDetailPage({ params }: PageProps) {
  const { area: slug } = await params;
  const area = getServiceAreaBySlug(slug);
  if (!area) notFound();

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Locations', href: '/locations' },
    { label: area.name },
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(breadcrumbItems)} />
      <Container className="py-10 lg:py-16">
        <Breadcrumb items={breadcrumbItems} />

        <div className="mt-4 flex items-start gap-4">
          <span className="bg-primary-soft text-primary flex size-14 shrink-0 items-center justify-center rounded-xl">
            <MapPin className="size-6" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-heading text-text text-3xl font-semibold sm:text-4xl">
              Laundry & Dry Cleaning in {area.name}
            </h1>
            <p className="text-text-muted mt-2 max-w-xl">{area.description}</p>
          </div>
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="border-border bg-surface rounded-lg border p-4">
            <dt className="text-text-muted text-[13px]">Pin code</dt>
            <dd className="text-text mt-1 font-medium tabular-nums">{area.pincode}</dd>
          </div>
          <div className="border-border bg-surface rounded-lg border p-4">
            <dt className="text-text-muted text-[13px]">Pickup & delivery</dt>
            <dd className="text-text mt-1 font-medium">Free</dd>
          </div>
          <div className="border-border bg-surface rounded-lg border p-4">
            <dt className="text-text-muted text-[13px]">Express service</dt>
            <dd className="text-text mt-1 font-medium">
              {area.expressAvailable ? 'Available' : 'Not yet'}
            </dd>
          </div>
          <div className="border-border bg-surface rounded-lg border p-4">
            <dt className="text-text-muted text-[13px]">Nearby landmarks</dt>
            <dd className="text-text mt-1 font-medium">{area.landmarks.join(', ')}</dd>
          </div>
        </dl>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/book">Book a pickup in {area.name}</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/pricing">See prices</Link>
          </Button>
        </div>
      </Container>
    </>
  );
}
