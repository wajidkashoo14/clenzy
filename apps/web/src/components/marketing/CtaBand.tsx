import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';

/**
 * 2026 refresh: deep brand-ink band with an ambient aurora glow, sitting
 * directly above the ink footer — the two dark surfaces read as one grounded
 * close to the page. Decoration is aria-hidden; copy and CTA are unchanged.
 */
export function CtaBand(): ReactNode {
  return (
    <section className="bg-ink-mesh border-border relative overflow-hidden border-t">
      {/* Drifting glow — decorative only */}
      <div
        className="from-primary/50 animate-aurora pointer-events-none absolute -top-24 right-1/4 size-96 rounded-full bg-gradient-to-br to-transparent blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto flex max-w-[1200px] flex-col items-start gap-6 px-4 py-14 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-20">
        <div>
          <h2 className="font-heading text-on-ink text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            Ready for your first pickup?
          </h2>
          <p className="text-on-ink/70 mt-2">Book in under a minute — no app download needed.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg" variant="secondary" className="bg-surface">
            <Link href="/book">
              Book a pickup
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
