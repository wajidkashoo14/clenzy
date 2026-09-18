import { Building2, CheckCircle2 } from 'lucide-react';
import type { Metadata } from 'next';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Container } from '@/components/layout/Container';
import { B2bEnquiryForm } from '@/components/marketing/B2bEnquiryForm';
import { brand } from '@/content/brand';
import { breadcrumbJsonLd, buildMetadata, JsonLd } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: `Commercial Laundry for Hotels & Guesthouses | ${brand.name}`,
  description:
    'Reliable linen and laundry service for hotels, houseboats, and guesthouses in Srinagar.',
  path: '/business',
});

const POINTS = [
  'Dedicated pickup and delivery schedule for your property',
  'Consistent quality with defined turnaround times',
  'Monthly invoicing available for regular partners',
  'Specialty care for delicate linens and furnishings',
];

/**
 * PLACEHOLDER copy — commercial capacity, pricing model, and real client
 * details need confirmation from the business owner before this claims
 * anything specific. See docs/PROJECT_REQUIREMENTS.md §2 "B2B / commercial".
 */
export default function BusinessPage() {
  const breadcrumbItems = [{ label: 'Home', href: '/' }, { label: 'Business' }];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(breadcrumbItems)} />
      <Container className="py-10 lg:py-16">
        <Breadcrumb items={breadcrumbItems} />

        <div className="mt-4 flex items-start gap-4">
          <span className="bg-primary-soft text-primary flex size-14 shrink-0 items-center justify-center rounded-xl">
            <Building2 className="size-6" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-heading text-text text-3xl font-semibold sm:text-4xl">
              Laundry for hotels, houseboats & guesthouses
            </h1>
            <p className="text-text-muted mt-2 max-w-xl">
              Kashmir’s hospitality businesses need laundry service that’s on time, every time. Tell
              us about your property and we’ll put together a plan.
            </p>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.2fr]">
          <ul className="flex flex-col gap-4">
            {POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <CheckCircle2 className="text-success mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <span className="text-text-muted">{point}</span>
              </li>
            ))}
          </ul>

          <div className="border-border bg-surface rounded-lg border p-6">
            <h2 className="text-text text-lg font-semibold">Get in touch</h2>
            <p className="text-text-muted mt-1 text-sm">Tell us about your property and volume.</p>
            <div className="mt-6">
              <B2bEnquiryForm />
            </div>
          </div>
        </div>
      </Container>
    </>
  );
}
