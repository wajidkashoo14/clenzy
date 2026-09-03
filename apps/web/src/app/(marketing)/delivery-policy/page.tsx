import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPageLayout } from '@/components/legal/LegalPageLayout';
import { brand } from '@/content/brand';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: `Delivery Policy | ${brand.name}`,
  description: `How pickup and delivery works with ${brand.name}, including coverage areas and turnaround times.`,
  path: '/delivery-policy',
});

export default function DeliveryPolicyPage() {
  return (
    <LegalPageLayout title="Delivery Policy" lastUpdated="3 September 2026">
      <h2>1. Coverage area</h2>
      <p>
        We currently offer pickup and delivery within the Srinagar areas listed on our{' '}
        <Link href="/locations" className="hover:text-text underline">
          Locations
        </Link>{' '}
        page. Enter your pin code at checkout or on the homepage to check whether we cover your
        address.
      </p>

      <h2>2. Pickup and delivery windows</h2>
      <p>
        When you book a pickup, you&rsquo;ll choose a time window on the day that works for you. Our
        agent will collect your items during that window. We&rsquo;ll confirm the pickup and
        delivery schedule once your order is placed.
      </p>

      <h2>3. Turnaround times</h2>
      <p>
        Turnaround depends on the service: everyday laundry and wash & iron typically take around 48
        hours, dry cleaning around 72 hours, and specialty care for delicate items like pashmina up
        to 96 hours. Exact turnaround for each service is shown on its{' '}
        <Link href="/services" className="hover:text-text underline">
          service page
        </Link>
        . Express options are available for some categories.
      </p>

      <h2>4. Delivery attempts</h2>
      <p>
        If we&rsquo;re unable to deliver at the scheduled time (for example, you&rsquo;re
        unavailable), we will contact you to reschedule. Your items are held safely at our facility
        until redelivery is arranged.
      </p>

      <h2>5. Delivery charges</h2>
      <p>
        Pickup and delivery are free within our standard coverage areas for orders above a minimum
        value. The exact minimum order value and any delivery fee for smaller orders have not yet
        been finalized by the business owner and will be published here before launch.
      </p>

      <h2>6. Contact</h2>
      <p>
        Questions about pickup, delivery, or coverage can be sent through our{' '}
        <Link href="/contact" className="hover:text-text underline">
          Contact
        </Link>{' '}
        page or to{' '}
        <a href={`mailto:${brand.email}`} className="hover:text-text underline">
          {brand.email}
        </a>
        .
      </p>
    </LegalPageLayout>
  );
}
