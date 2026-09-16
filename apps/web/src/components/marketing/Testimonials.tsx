import { Star } from 'lucide-react';
import { SectionHeading } from '@/components/marketing/SectionHeading';
import { Stagger, StaggerItem } from '@/components/marketing/Stagger';
import type { ReactNode } from 'react';

/**
 * PLACEHOLDER — these are illustrative example quotes, not real customer
 * reviews, and are deliberately NOT attributed to specific fabricated names
 * to avoid ever reading as genuine testimonials if this ships as-is. Replace
 * with real reviews once the review system (docs/DEVELOPMENT_PLAN.md
 * Phase 9+) is live — see docs/PROJECT_REQUIREMENTS.md's rule against
 * fabricated reviews presented as genuine.
 */
const EXAMPLE_QUOTES = [
  {
    quote: 'The pickup slot actually matched when they showed up — small thing, but it matters.',
    context: 'Example quote — Rajbagh area',
  },
  {
    quote:
      'My pashmina needed real care, not a standard dry-clean cycle. This is the first place that got that right.',
    context: 'Example quote — Lal Chowk area',
  },
  {
    quote: 'Price was exactly what I was quoted. No surprise add-ons at delivery.',
    context: 'Example quote — Nishat area',
  },
];

export function Testimonials(): ReactNode {
  return (
    <section className="border-border bg-surface-alt/50 border-y">
      <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <SectionHeading
          eyebrow="What to expect"
          title="Illustrative examples — real reviews coming soon"
        />

        <Stagger className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {EXAMPLE_QUOTES.map((item) => (
            <StaggerItem key={item.quote} className="h-full">
              <figure className="border-border bg-surface duration-base relative h-full rounded-xl border p-5 shadow-sm transition-[transform,box-shadow] ease-out hover:-translate-y-1 hover:shadow-lg">
                {/* Decorative oversized quote mark */}
                <span
                  className="font-heading text-accent/25 absolute top-2 right-4 text-6xl leading-none select-none"
                  aria-hidden="true"
                >
                  ”
                </span>
                <div className="text-accent flex gap-0.5" aria-hidden="true">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} className="size-3.5 fill-current" />
                  ))}
                </div>
                <blockquote className="text-text mt-3 text-sm">“{item.quote}”</blockquote>
                <figcaption className="text-text-muted mt-3 text-[13px]">{item.context}</figcaption>
              </figure>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
