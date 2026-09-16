import { CheckCircle2, Package, ShoppingBag, Truck } from 'lucide-react';
import type { ReactNode } from 'react';
import { SectionHeading } from '@/components/marketing/SectionHeading';
import { Stagger, StaggerItem } from '@/components/marketing/Stagger';

const STEPS = [
  {
    icon: ShoppingBag,
    title: 'Choose your items',
    description:
      'Browse the price list and add exactly what you need — no guesswork, no bundled minimums.',
  },
  {
    icon: Package,
    title: 'We pick up',
    description:
      'Pick a slot that works for you. Our agent collects everything from your doorstep.',
  },
  {
    icon: CheckCircle2,
    title: 'We clean, carefully',
    description:
      "Every item is inspected, cleaned to spec, and quality-checked before it's packed.",
  },
  {
    icon: Truck,
    title: 'Delivered back to you',
    description:
      'Track your order in real time and receive it fresh, folded, and ready to put away.',
  },
];

export function HowItWorks(): ReactNode {
  return (
    <section className="border-border bg-surface-alt/50 border-y">
      <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <SectionHeading eyebrow="How it works" title="Four steps, start to finish" />

        <Stagger
          as="ol"
          className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4"
          step={0.1}
        >
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <StaggerItem
                key={step.title}
                as="li"
                /* Dashed connector from this step's number chip to the next
                   one — desktop-only, hidden on the last step. */
                className="lg:before:border-border-strong relative last:before:hidden lg:before:absolute lg:before:top-5 lg:before:left-14 lg:before:hidden lg:before:h-px lg:before:w-[calc(100%-4.5rem)] lg:before:border-t-2 lg:before:border-dashed lg:before:content-[''] lg:last:before:hidden"
              >
                <div className="flex items-center gap-3">
                  <span className="from-primary to-secondary text-text-inverse shadow-glow flex size-10 items-center justify-center rounded-full bg-gradient-to-br text-sm font-semibold tabular-nums">
                    {index + 1}
                  </span>
                  <span className="bg-primary-soft text-primary duration-base flex size-8 items-center justify-center rounded-full transition-transform ease-out hover:scale-110">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                </div>
                <h3 className="text-text mt-4 text-base font-semibold">{step.title}</h3>
                <p className="text-text-muted mt-1.5 text-sm">{step.description}</p>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}
