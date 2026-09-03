import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPageLayout } from '@/components/legal/LegalPageLayout';
import { brand } from '@/content/brand';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: `Terms & Conditions | ${brand.name}`,
  description: `The terms governing use of ${brand.name}'s website and laundry, dry-cleaning, and fabric-care services.`,
  path: '/terms',
});

export default function TermsPage() {
  return (
    <LegalPageLayout title="Terms & Conditions" lastUpdated="3 September 2026">
      <h2>1. Who these terms apply to</h2>
      <p>
        These terms apply to anyone who uses the {brand.name} website, places an order, or contacts
        us through our forms. By using the site or placing an order, you agree to these terms.
      </p>

      <h2>2. Our services</h2>
      <p>
        {brand.name} offers pickup-and-delivery laundry, wash & iron, dry cleaning, and specialty
        fabric care within our serviceable areas of Srinagar. Service availability, turnaround
        times, and pricing for each category are shown on the{' '}
        <Link href="/services" className="hover:text-text underline">
          Services
        </Link>{' '}
        page and are subject to change.
      </p>

      <h2>3. Placing an order</h2>
      <p>
        You can book a pickup through the website. We&rsquo;ll confirm the exact price and schedule
        when our team arrives to collect your items and inspects them. If the confirmed itemization
        changes the total by more than a defined threshold, we&rsquo;ll ask you to approve the
        revised total before we continue processing.
      </p>

      <h2>4. Cancellations and rescheduling</h2>
      <ul>
        <li>You can cancel free of charge any time before your order is picked up.</li>
        <li>
          Once items have been picked up, cancellation requires contacting support and is subject to
          approval.
        </li>
        <li>
          Pickup or delivery can be rescheduled up to two times per order, subject to slot
          availability.
        </li>
      </ul>

      <h2>5. Payment</h2>
      <p>
        Payment is accepted via UPI, card, netbanking, or wallet through our payment partner, or
        cash on delivery where available. Prices shown are inclusive of applicable taxes unless
        stated otherwise.
      </p>

      <h2>6. Refunds</h2>
      <p>
        See our{' '}
        <Link href="/refund-policy" className="hover:text-text underline">
          Refund & Cancellation Policy
        </Link>{' '}
        for full details on how and when refunds are issued.
      </p>

      <h2>7. Care and liability</h2>
      <p>
        We inspect items before cleaning and use processes matched to the fabric and garment type.
        If an item isn&rsquo;t cleaned to your satisfaction, we offer a free re-clean within a set
        window after delivery. Our liability for lost or damaged items is limited to a compensation
        policy that the business owner has not yet finalized — this section will be updated before
        launch.
      </p>

      <h2>8. Account and conduct</h2>
      <p>
        If you create an account, you&rsquo;re responsible for keeping your login credentials secure
        and for activity under your account. You agree not to misuse the site, submit false
        information, or attempt to disrupt our systems.
      </p>

      <h2>9. Changes to these terms</h2>
      <p>
        We may update these terms from time to time. Continued use of the site after a change means
        you accept the updated terms.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions about these terms can be sent to{' '}
        <a href={`mailto:${brand.email}`} className="hover:text-text underline">
          {brand.email}
        </a>{' '}
        or through our{' '}
        <Link href="/contact" className="hover:text-text underline">
          Contact
        </Link>{' '}
        page.
      </p>
    </LegalPageLayout>
  );
}
