import { Clock, MapPinned, ShieldCheck, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { SectionHeading } from '@/components/marketing/SectionHeading';
import { Stagger, StaggerItem } from '@/components/marketing/Stagger';

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
        <SectionHeading
          eyebrow="Why Clenzy"
          title="A fabric-care service built for Srinagar, not adapted to it"
          description="Most laundry apps treat every city the same. We built ours around what actually needs care here — pashmina, phereans, heavy woollens — alongside everyday wash and fold."
        />

        <Stagger as="dl" className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {POINTS.map((point) => {
            const Icon = point.icon;
            return (
              <StaggerItem key={point.title} as="div" className="group">
                <dt className="flex items-center gap-2.5">
                  <span className="from-primary-soft to-secondary-soft text-primary ring-primary/10 duration-base flex size-9 items-center justify-center rounded-xl bg-gradient-to-br ring-1 transition-transform ease-out group-hover:scale-110">
                    <Icon className="size-4.5" aria-hidden="true" />
                  </span>
                  <span className="text-text text-sm font-semibold">{point.title}</span>
                </dt>
                <dd className="text-text-muted mt-2 text-sm">{point.description}</dd>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}
