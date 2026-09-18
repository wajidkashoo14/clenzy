import type { Metadata } from 'next';
import { LegalPageLayout } from '@/components/legal/LegalPageLayout';
import { brand } from '@/content/brand';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: `Privacy Policy | ${brand.name}`,
  description: `How ${brand.name} collects, uses, and protects your personal information.`,
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated="3 September 2026">
      <h2>1. What we collect</h2>
      <p>When you use the website, book a pickup, or contact us, we may collect:</p>
      <ul>
        <li>Your name, phone number, and email address</li>
        <li>Your service area, pickup/delivery address, and preferred time windows</li>
        <li>Order and item details, including photos taken at pickup for quality records</li>
        <li>Messages you send us through the contact, booking, or business enquiry forms</li>
        <li>Basic technical data such as pages visited, used to keep the site working correctly</li>
      </ul>

      <h2>2. How we use it</h2>
      <ul>
        <li>To schedule and fulfil pickups, deliveries, and orders</li>
        <li>To contact you about your order by phone, WhatsApp, SMS, or email</li>
        <li>To respond to enquiries submitted through our forms</li>
        <li>To improve our services and website</li>
        <li>To meet legal and accounting obligations</li>
      </ul>

      <h2>3. Who we share it with</h2>
      <p>We share limited data with service providers who help us operate, including:</p>
      <ul>
        <li>Our payment processor, to process online payments</li>
        <li>Our SMS/OTP provider, for order updates and account verification</li>
        <li>Our cloud database and hosting providers, to store and run the service</li>
        <li>Our analytics provider, only after you consent to non-essential cookies</li>
      </ul>
      <p>We do not sell your personal information to third parties.</p>

      <h2>4. Cookies</h2>
      <p>
        We use essential cookies required for the site and your account to function. Analytics
        cookies are only loaded after you accept them through our cookie consent banner. We do not
        send promotional SMS messages.
      </p>

      <h2>5. Data retention</h2>
      <p>
        We keep order and account data for as long as needed to provide our service and meet
        legal/tax record-keeping requirements. Contact and enquiry form submissions are retained
        until the enquiry is resolved and for a reasonable period after.
      </p>

      <h2>6. Your choices</h2>
      <p>
        You can ask us to access, correct, or delete your personal information, subject to what
        we&rsquo;re legally required to keep, by contacting{' '}
        <a href={`mailto:${brand.email}`} className="hover:text-text underline">
          {brand.email}
        </a>
        .
      </p>

      <h2>7. Security</h2>
      <p>
        We take reasonable technical and organizational measures to protect your data, including
        encrypted connections and access controls on our systems.
      </p>

      <h2>8. Changes to this policy</h2>
      <p>
        We may update this policy as our services change. The &ldquo;last updated&rdquo; date above
        reflects the most recent version.
      </p>

      <h2>9. Contact</h2>
      <p>
        For privacy questions or requests, reach us at{' '}
        <a href={`mailto:${brand.email}`} className="hover:text-text underline">
          {brand.email}
        </a>
        .
      </p>
    </LegalPageLayout>
  );
}
