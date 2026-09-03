import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';

export function CtaBand(): ReactNode {
  return (
    <section className="bg-primary">
      <div className="mx-auto flex max-w-[1200px] flex-col items-start gap-6 px-4 py-14 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-16">
        <div>
          <h2 className="font-heading text-text-inverse text-2xl font-semibold sm:text-3xl">
            Ready for your first pickup?
          </h2>
          <p className="text-text-inverse/80 mt-2">
            Book in under a minute — no app download needed.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg" variant="secondary" className="bg-surface">
            <Link href="/book">Book a pickup</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
