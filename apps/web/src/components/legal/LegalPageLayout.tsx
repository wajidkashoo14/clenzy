import type { ReactNode } from 'react';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Container } from '@/components/layout/Container';
import { brand } from '@/content/brand';
import { breadcrumbJsonLd, JsonLd } from '@/lib/seo';

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

/**
 * Shared shell for the four legal pages (Terms, Privacy, Refund & Cancellation,
 * Delivery). Every page rendered here is a DRAFT — see the banner below — not
 * reviewed legal advice. Required before Razorpay onboarding approval per
 * docs/INTEGRATIONS.md §2.2 step 3.
 */
export function LegalPageLayout({ title, lastUpdated, children }: LegalPageLayoutProps): ReactNode {
  const breadcrumbItems = [{ label: 'Home', href: '/' }, { label: title }];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(breadcrumbItems)} />
      <Container className="py-10 lg:py-16">
        <Breadcrumb items={breadcrumbItems} />

        <div className="mt-4 max-w-2xl">
          <h1 className="font-heading text-text text-3xl font-semibold sm:text-4xl">{title}</h1>
          <p className="text-text-muted mt-2 text-sm">Last updated: {lastUpdated}</p>
        </div>

        <div
          role="note"
          className="border-warning bg-warning-soft text-text mt-6 max-w-2xl rounded-lg border p-4 text-sm"
        >
          <p className="font-semibold">Draft — pending legal review</p>
          <p className="text-text-muted mt-1">
            This page is a working template built from {brand.name}&rsquo;s current product design
            (see docs/PROJECT_REQUIREMENTS.md). It has not been reviewed by a lawyer and must not be
            treated as final or legally binding until the business owner confirms every policy below
            and has it reviewed by qualified counsel in India.
          </p>
        </div>

        <div className="prose-sm text-text-muted [&_h2]:font-heading [&_h2]:text-text mt-8 max-w-2xl [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:mt-1.5 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>
      </Container>
    </>
  );
}
