import type { Metadata } from 'next';
import { CtaBand } from '@/components/marketing/CtaBand';
import { Differentiators } from '@/components/marketing/Differentiators';
import { FaqTeaser } from '@/components/marketing/FaqTeaser';
import { Hero } from '@/components/marketing/Hero';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { Reveal } from '@/components/marketing/Reveal';
import { ServicesGrid } from '@/components/marketing/ServicesGrid';
import { Testimonials } from '@/components/marketing/Testimonials';
import { brand } from '@/content/brand';
import { buildMetadata, JsonLd, localBusinessJsonLd } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: `Laundry & Dry Cleaning in Srinagar | ${brand.name}`,
  description:
    'Free doorstep pickup and delivery for laundry, dry cleaning, and home fabric care in Srinagar. Transparent pricing, no surprises.',
  path: '/',
});

export default function HomePage() {
  return (
    <>
      <JsonLd data={localBusinessJsonLd()} />
      <Hero />
      <Reveal>
        <ServicesGrid />
      </Reveal>
      <Reveal>
        <HowItWorks />
      </Reveal>
      <Reveal>
        <Differentiators />
      </Reveal>
      <Reveal>
        <Testimonials />
      </Reveal>
      <Reveal>
        <FaqTeaser />
      </Reveal>
      <CtaBand />
    </>
  );
}
