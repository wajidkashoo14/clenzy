import type { Metadata } from 'next';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/Accordion';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Container } from '@/components/layout/Container';
import { brand } from '@/content/brand';
import { FAQS } from '@/content/faqs';
import { breadcrumbJsonLd, buildMetadata, faqPageJsonLd, JsonLd } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: `Frequently Asked Questions | ${brand.name}`,
  description: 'Answers to common questions about booking, pricing, delivery, and item care.',
  path: '/faq',
});

const CATEGORY_LABELS: Record<string, string> = {
  orders: 'Orders',
  pricing: 'Pricing',
  delivery: 'Pickup & delivery',
  care: 'Item care',
};

export default function FaqPage() {
  const breadcrumbItems = [{ label: 'Home', href: '/' }, { label: 'FAQ' }];
  const categories = Array.from(new Set(FAQS.map((f) => f.category)));

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(breadcrumbItems)} />
      <JsonLd data={faqPageJsonLd(FAQS)} />

      <Container className="py-10 lg:py-16">
        <Breadcrumb items={breadcrumbItems} />

        <div className="mt-4 max-w-2xl">
          <h1 className="font-heading text-text text-3xl font-semibold sm:text-4xl">
            Frequently asked questions
          </h1>
        </div>

        <div className="mt-10 flex flex-col gap-10">
          {categories.map((category) => (
            <div key={category}>
              <h2 className="text-primary text-sm font-semibold tracking-wide uppercase">
                {CATEGORY_LABELS[category] ?? category}
              </h2>
              <Accordion type="single" collapsible className="mt-3 max-w-2xl">
                {FAQS.filter((faq) => faq.category === category).map((faq) => (
                  <AccordionItem key={faq.question} value={faq.question}>
                    <AccordionTrigger>{faq.question}</AccordionTrigger>
                    <AccordionContent>{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      </Container>
    </>
  );
}
