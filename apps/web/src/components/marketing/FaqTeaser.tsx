import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/Accordion';
import { Button } from '@/components/ui/Button';
import { FAQS } from '@/content/faqs';

export function FaqTeaser(): ReactNode {
  const preview = FAQS.slice(0, 4);

  return (
    <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
        <div>
          <p className="text-primary text-sm font-semibold tracking-wide uppercase">FAQ</p>
          <h2 className="font-heading text-text mt-2 text-3xl font-semibold">Common questions</h2>
          <p className="text-text-muted mt-3">Can’t find what you’re looking for?</p>
          <Button asChild variant="secondary" className="mt-4">
            <Link href="/faq">View all FAQs</Link>
          </Button>
        </div>

        <Accordion type="single" collapsible>
          {preview.map((faq) => (
            <AccordionItem key={faq.question} value={faq.question}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
