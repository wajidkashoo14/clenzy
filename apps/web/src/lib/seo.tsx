import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { brand } from '@/content/brand';

export interface PageMetaInput {
  title: string;
  description: string;
  path: string;
}

/** Builds title/description/OG/Twitter metadata — see docs/SEO_AND_PERFORMANCE.md §2. */
export function buildMetadata({ title, description, path }: PageMetaInput): Metadata {
  const url = `${brand.siteUrl}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: brand.name,
      locale: 'en_IN',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

interface JsonLdProps {
  data: Record<string, unknown>;
}

/** Renders a JSON-LD `<script>` tag. Import and place once per page. */
export function JsonLd({ data }: JsonLdProps): ReactNode {
  return (
    // JSON-LD requires raw script content; `data` is server-authored, never user input.
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}

export function localBusinessJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'DryCleaningOrLaundry',
    '@id': `${brand.siteUrl}/#business`,
    name: brand.name,
    description: brand.description,
    url: brand.siteUrl,
    telephone: brand.phone,
    email: brand.email,
    priceRange: '₹₹',
    areaServed: { '@type': 'City', name: 'Srinagar' },
    address: brand.outlets.map((outlet) => ({
      '@type': 'PostalAddress',
      streetAddress: outlet.address,
      addressLocality: 'Srinagar',
      addressRegion: 'Jammu and Kashmir',
      addressCountry: 'IN',
    }))[0],
    sameAs: brand.social.map((s) => s.href),
  };
}

export function breadcrumbJsonLd(items: { label: string; href?: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: item.href ? `${brand.siteUrl}${item.href}` : undefined,
    })),
  };
}

export function faqPageJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}

export function serviceJsonLd(input: {
  name: string;
  description: string;
  path: string;
  offers: { name: string; priceRupees: number }[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: input.name,
    description: input.description,
    provider: { '@id': `${brand.siteUrl}/#business` },
    areaServed: { '@type': 'City', name: 'Srinagar' },
    url: `${brand.siteUrl}${input.path}`,
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: input.name,
      itemListElement: input.offers.map((offer) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: offer.name },
        price: offer.priceRupees,
        priceCurrency: 'INR',
      })),
    },
  };
}
