import { CheckCircle2, Package, ShoppingBag, Truck } from 'lucide-react';
import type { ReactNode } from 'react';

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
        <div className="max-w-xl">
          <p className="text-primary text-sm font-semibold tracking-wide uppercase">How it works</p>
          <h2 className="font-heading text-text mt-2 text-3xl font-semibold">
            Four steps, start to finish
          </h2>
        </div>

        <ol className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className="relative">
                <div className="flex items-center gap-3">
                  <span className="bg-primary text-text-inverse flex size-10 items-center justify-center rounded-full text-sm font-semibold tabular-nums">
                    {index + 1}
                  </span>
                  <Icon className="text-primary size-5" aria-hidden="true" />
                </div>
                <h3 className="text-text mt-4 text-base font-semibold">{step.title}</h3>
                <p className="text-text-muted mt-1.5 text-sm">{step.description}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
