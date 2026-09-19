import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/Accordion';
import { SectionHeading } from '@/components/marketing/SectionHeading';
import { Button } from '@/components/ui/Button';
import { getFaqs } from '@/lib/content-api';

export async function FaqTeaser(): Promise<ReactNode> {
  const faqs = await getFaqs();
  const preview = faqs.slice(0, 4);

  return (
    <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
        <div>
          <SectionHeading eyebrow="FAQ" title="Common questions" />
          <p className="text-text-muted mt-3">Can’t find what you’re looking for?</p>
          <Button asChild variant="secondary" className="mt-4">
            <Link href="/faq">View all FAQs</Link>
          </Button>
        </div>

        <Accordion type="single" collapsible>
          {preview.map((faq) => (
            <AccordionItem key={faq._id} value={faq._id}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>
                {/* answer is rich text, sanitized server-side on write — see packages/shared/src/schemas/adminContent.ts */}
                <div dangerouslySetInnerHTML={{ __html: faq.answer }} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
