import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPageLayout } from '@/components/legal/LegalPageLayout';
import { brand } from '@/content/brand';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: `Refund & Cancellation Policy | ${brand.name}`,
  description: `${brand.name}'s policy on order cancellations, rescheduling, and refunds.`,
  path: '/refund-policy',
});

export default function RefundPolicyPage() {
  return (
    <LegalPageLayout title="Refund & Cancellation Policy" lastUpdated="3 September 2026">
      <h2>1. Cancelling an order</h2>
      <p>
        You can cancel an order free of charge at any time before it&rsquo;s picked up, from your
        order page or by contacting us. If you&rsquo;ve already paid online, a cancellation before
        pickup is refunded in full.
      </p>
      <p>
        Once your items have been picked up, cancellation isn&rsquo;t self-serve — contact support
        and we&rsquo;ll review the request. Depending on how far along the order is, a partial
        refund may apply.
      </p>

      <h2>2. Rescheduling</h2>
      <p>
        You can reschedule your pickup (before it happens) or delivery (before it&rsquo;s out for
        delivery) up to two times per order, subject to slot availability. Rescheduling
        doesn&rsquo;t require a refund or new payment.
      </p>

      <h2>3. Failed pickup or delivery</h2>
      <p>
        If our agent can&rsquo;t complete a pickup or delivery (for example, you&rsquo;re
        unavailable or the address is incorrect), we&rsquo;ll notify you with an easy way to
        reschedule. After repeated failed attempts, the order may be automatically cancelled and any
        prepaid amount refunded per this policy.
      </p>

      <h2>4. Refund timelines</h2>
      <p>
        Approved refunds are issued to your original payment method and typically reach your bank or
        wallet within 5–7 business days, though your bank may take longer to reflect the credit.
      </p>

      <h2>5. Re-clean requests</h2>
      <p>
        If you&rsquo;re not satisfied with how an item was cleaned, you can request a free re-clean
        within 72 hours of delivery. This isn&rsquo;t a refund — we&rsquo;ll re-process the item at
        no extra cost.
      </p>

      <h2>6. Damaged or lost items</h2>
      <p>
        If an item is damaged or lost while in our care, we&rsquo;ll review the case and offer
        compensation under our damage/loss policy. The exact compensation structure (fixed amount,
        multiple of service cost, or item value) has not yet been finalized by the business owner
        and will be published here before launch.
      </p>

      <h2>7. How to request a refund or raise an issue</h2>
      <p>
        Contact us through the{' '}
        <Link href="/contact" className="hover:text-text underline">
          Contact
        </Link>{' '}
        page, WhatsApp, or{' '}
        <a href={`mailto:${brand.email}`} className="hover:text-text underline">
          {brand.email}
        </a>{' '}
        with your order details, and our team will follow up.
      </p>
    </LegalPageLayout>
  );
}
