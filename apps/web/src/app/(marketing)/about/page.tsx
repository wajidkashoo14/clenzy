import type { Metadata } from 'next';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Container } from '@/components/layout/Container';
import { brand } from '@/content/brand';
import { breadcrumbJsonLd, buildMetadata, JsonLd } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: `About Us | ${brand.name}`,
  description: `The story behind ${brand.name} — a fabric-care service built for Srinagar.`,
  path: '/about',
});

/**
 * PLACEHOLDER copy — the real founding story, facility details, and team
 * information need to come from the business owner (docs/DEVELOPMENT_PLAN.md
 * Phase 0). Nothing on this page should be treated as a factual claim.
 */
export default function AboutPage() {
  const breadcrumbItems = [{ label: 'Home', href: '/' }, { label: 'About' }];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(breadcrumbItems)} />
      <Container className="py-10 lg:py-16">
        <Breadcrumb items={breadcrumbItems} />

        <div className="mt-4 max-w-2xl">
          <h1 className="font-heading text-text text-3xl font-semibold sm:text-4xl">
            About {brand.name}
          </h1>
          <p className="text-text-muted mt-4 text-lg">
            {brand.name} started with a simple observation: fabric care in Srinagar deserved better
            than being an afterthought. Pashmina, phereans, and heavy woollens need real expertise —
            not the same standard cycle used for everyday laundry.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div>
            <p className="font-heading text-primary text-3xl font-semibold">2</p>
            <p className="text-text-muted mt-1 text-sm">Outlets across Srinagar</p>
          </div>
          <div>
            <p className="font-heading text-primary text-3xl font-semibold">9</p>
            <p className="text-text-muted mt-1 text-sm">Service categories</p>
          </div>
          <div>
            <p className="font-heading text-primary text-3xl font-semibold">72h</p>
            <p className="text-text-muted mt-1 text-sm">Typical turnaround</p>
          </div>
        </div>

        <div className="prose-sm text-text-muted mt-12 max-w-2xl">
          <h2 className="font-heading text-text text-xl font-semibold">How we work</h2>
          <p className="mt-3">
            Every order is inspected before cleaning, matched to the right process for that fabric,
            and quality-checked before it goes back out. If something isn’t right, we re-clean it —
            free, within 72 hours of delivery.
          </p>
          <h2 className="font-heading text-text mt-8 text-xl font-semibold">Our facility</h2>
          <p className="mt-3">
            {/* TODO(content): replace with real facility description and photography once available. */}
            Our processing facility handles both everyday laundry and specialty fabric care, with
            separate workflows for delicate items like pashmina and embroidered work.
          </p>
        </div>
      </Container>
    </>
  );
}
