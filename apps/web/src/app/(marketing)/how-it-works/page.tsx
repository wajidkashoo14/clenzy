import { CheckCircle2, Package, ShoppingBag, Truck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/layout/Container';
import { brand } from '@/content/brand';
import { breadcrumbJsonLd, buildMetadata, JsonLd } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: `How It Works | ${brand.name}`,
  description:
    'From booking a pickup to delivery — how our laundry and dry-cleaning service works, step by step.',
  path: '/how-it-works',
});

const STEPS = [
  {
    icon: ShoppingBag,
    title: 'Choose your items',
    description:
      'Browse the price list by category and add exactly what you need. The total you see is our best estimate.',
    detail:
      'Our team confirms the final price after inspecting your items at pickup — if it changes by more than a small margin, we check with you before starting work.',
  },
  {
    icon: Package,
    title: 'Schedule a pickup',
    description: 'Pick a date and a 2-hour window that works for you.',
    detail: 'Slots fill up — book early in the day for same-day pickup where available.',
  },
  {
    icon: CheckCircle2,
    title: 'We clean, carefully',
    description:
      'Every item is inspected, matched to the right cleaning process, and quality-checked.',
    detail: 'Delicate items like pashmina and embroidered work follow a separate, gentler process.',
  },
  {
    icon: Truck,
    title: 'Delivered back to you',
    description: 'Track your order and receive it fresh, folded, and ready to put away.',
    detail: 'Pay online at checkout or in cash on delivery — your choice.',
  },
];

export default function HowItWorksPage() {
  const breadcrumbItems = [{ label: 'Home', href: '/' }, { label: 'How it works' }];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(breadcrumbItems)} />
      <Container className="py-10 lg:py-16">
        <Breadcrumb items={breadcrumbItems} />

        <div className="mt-4 max-w-2xl">
          <h1 className="font-heading text-text text-3xl font-semibold sm:text-4xl">
            How it works
          </h1>
          <p className="text-text-muted mt-3">
            From booking to delivery, here’s exactly what happens.
          </p>
        </div>

        <ol className="mt-12 flex flex-col gap-10">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className="flex gap-5">
                <div className="flex flex-col items-center">
                  <span className="bg-primary text-text-inverse flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums">
                    {index + 1}
                  </span>
                  {index < STEPS.length - 1 && (
                    <span className="bg-border mt-2 w-px flex-1" aria-hidden="true" />
                  )}
                </div>
                <div className="pb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="text-primary size-5" aria-hidden="true" />
                    <h2 className="text-text text-lg font-semibold">{step.title}</h2>
                  </div>
                  <p className="text-text-muted mt-2">{step.description}</p>
                  <p className="text-text-muted mt-2 text-sm">{step.detail}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/book">Book a pickup</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/faq">Read the FAQ</Link>
          </Button>
        </div>
      </Container>
    </>
  );
}
