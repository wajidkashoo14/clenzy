import { Clock, MapPinned, ShieldCheck, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';

const POINTS = [
  {
    icon: ShieldCheck,
    title: 'Re-clean guarantee',
    description: "Not happy with a result? We'll re-clean it free of charge within 72 hours.",
  },
  {
    icon: Sparkles,
    title: 'Chemistry for Kashmiri fabrics',
    description:
      'Specialist care for pashmina, pheran, and heavy embroidered work — not just standard dry-cleaning.',
  },
  {
    icon: Clock,
    title: 'Transparent turnaround',
    description:
      'Every order shows an expected delivery window upfront, with express options where available.',
  },
  {
    icon: MapPinned,
    title: 'Real Srinagar coverage',
    description: 'Free pickup and delivery across our serviceable areas — check yours in seconds.',
  },
];

export function Differentiators(): ReactNode {
  return (
    <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="text-primary text-sm font-semibold tracking-wide uppercase">Why Clenzy</p>
          <h2 className="font-heading text-text mt-2 text-3xl font-semibold">
            A fabric-care service built for Srinagar, not adapted to it
          </h2>
          <p className="text-text-muted mt-4">
            Most laundry apps treat every city the same. We built ours around what actually needs
            care here — pashmina, phereans, heavy woollens — alongside everyday wash and fold.
          </p>
        </div>

        <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {POINTS.map((point) => {
            const Icon = point.icon;
            return (
              <div key={point.title}>
                <dt className="flex items-center gap-2.5">
                  <span className="bg-primary-soft text-primary flex size-9 items-center justify-center rounded-md">
                    <Icon className="size-4.5" aria-hidden="true" />
                  </span>
                  <span className="text-text text-sm font-semibold">{point.title}</span>
                </dt>
                <dd className="text-text-muted mt-2 text-sm">{point.description}</dd>
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}
