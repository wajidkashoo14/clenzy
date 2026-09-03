import { Star } from 'lucide-react';
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
        <div className="max-w-xl">
          <p className="text-primary text-sm font-semibold tracking-wide uppercase">
            What to expect
          </p>
          <h2 className="font-heading text-text mt-2 text-3xl font-semibold">
            Illustrative examples — real reviews coming soon
          </h2>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {EXAMPLE_QUOTES.map((item) => (
            <div key={item.quote} className="border-border bg-surface rounded-lg border p-5">
              <div className="text-accent flex gap-0.5" aria-hidden="true">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} className="size-3.5 fill-current" />
                ))}
              </div>
              <p className="text-text mt-3 text-sm">“{item.quote}”</p>
              <p className="text-text-muted mt-3 text-[13px]">{item.context}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
