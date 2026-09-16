'use client';

import type { PincodeCheckResult } from '@clenzy/shared';
import { CheckCircle2, Clock, MapPin, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { PincodeInput, type PincodeCheckStatus } from '@/components/ui/PincodeInput';
import { apiGet } from '@/lib/api-client';
import { transitions } from '@/lib/motion';

const TRUST_POINTS = [
  { icon: CheckCircle2, label: 'Free pickup & delivery' },
  { icon: ShieldCheck, label: 'Re-clean guarantee' },
  { icon: Clock, label: 'Transparent pricing' },
] as const;

/**
 * The headline and primary CTA render at full opacity immediately — no
 * animation — since this is the LCP element. Only supporting elements
 * (subcopy, trust badges, the pin-code field) fade+rise in, staggered.
 * See docs/ANIMATION_SYSTEM.md §4.3.
 *
 * 2026 refresh: ambient aurora mesh + drifting blobs behind the content, a
 * gradient-highlighted phrase in the headline, and the flat placeholder
 * panel replaced with a decorative (aria-hidden) order-card composition with
 * floating chips — no imagery required, nothing functional.
 */
export function Hero(): ReactNode {
  const [pincode, setPincode] = useState('');
  const [status, setStatus] = useState<PincodeCheckStatus>('idle');
  const [matchedAreaName, setMatchedAreaName] = useState<string | null>(null);

  async function handleCheck(value: string): Promise<void> {
    setStatus('loading');
    try {
      const result = await apiGet<PincodeCheckResult>(`/api/v1/areas/check?pincode=${value}`);
      if (result.serviceable) {
        setMatchedAreaName(result.area.area);
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  return (
    <section className="bg-hero-mesh border-border relative overflow-hidden border-b">
      {/* Drifting ambient blobs — decorative only, behind all content */}
      <div
        className="bg-primary-soft/60 animate-aurora pointer-events-none absolute -top-32 -left-32 size-[28rem] rounded-full blur-3xl"
        aria-hidden="true"
      />
      <div
        className="bg-secondary-soft/50 animate-aurora pointer-events-none absolute top-1/3 -right-40 size-[26rem] rounded-full blur-3xl [animation-delay:-8s]"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
        <div>
          <h1 className="font-heading text-text text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            <span className="text-gradient-brand">Fabric care</span> that treats your clothes like
            they’re yours.
          </h1>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...transitions.enter, delay: 0.1 }}
          >
            <p className="text-text-muted mt-5 max-w-lg text-lg">
              Doorstep laundry, dry-cleaning, and home fabric care in Srinagar. Transparent pricing,
              careful handling, free pickup and delivery.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/book">Book a pickup</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/pricing">See prices</Link>
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...transitions.enter, delay: 0.18 }}
            className="border-border bg-surface/70 mt-10 max-w-sm rounded-xl border p-4 shadow-md backdrop-blur-sm"
          >
            <PincodeInput
              value={pincode}
              onChange={(value) => {
                setPincode(value);
                if (status !== 'idle') setStatus('idle');
              }}
              onComplete={handleCheck}
              status={status}
              label="Check if we deliver to you"
              successMessage={
                matchedAreaName ? `We deliver to ${matchedAreaName}` : 'We deliver to this area'
              }
            />
          </motion.div>

          <motion.ul
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...transitions.enter, delay: 0.26 }}
            className="mt-6 flex flex-wrap gap-x-5 gap-y-2"
          >
            {TRUST_POINTS.map((point) => (
              <li key={point.label} className="text-text-muted flex items-center gap-1.5 text-sm">
                <point.icon className="text-success size-4" aria-hidden="true" />
                {point.label}
              </li>
            ))}
          </motion.ul>
        </div>

        {/* Decorative composition in place of the old flat placeholder panel —
            TODO(content): replace with real facility/product photography once
            available — see docs/DESIGN_SYSTEM.md §1 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...transitions.enter, delay: 0.15 }}
          className="relative hidden aspect-square lg:block"
          aria-hidden="true"
        >
          <div className="from-primary-soft via-surface to-secondary-soft border-border absolute inset-0 rounded-[2.5rem] border bg-gradient-to-br shadow-lg" />

          {/* Center order card */}
          <div className="border-border bg-surface/90 absolute top-1/2 left-1/2 w-64 -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-5 shadow-xl backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="from-primary to-secondary text-text-inverse shadow-glow flex size-10 items-center justify-center rounded-xl bg-gradient-to-br">
                <Sparkles className="size-5" />
              </span>
              <div>
                <p className="text-text text-sm font-semibold">Pickup scheduled</p>
                <p className="text-text-muted text-xs">Today, 4–6 PM</p>
              </div>
            </div>
            <div className="border-border mt-4 border-t pt-3">
              <p className="text-text-muted text-xs">Wash &amp; fold × 6 · Dry-clean × 2</p>
              <p className="text-primary mt-1 text-sm font-semibold">Ready in 48 hours</p>
            </div>
          </div>

          {/* Floating chips */}
          <div className="border-border bg-surface/90 animate-float absolute top-10 right-8 flex items-center gap-2 rounded-full border px-4 py-2 shadow-md backdrop-blur">
            <MapPin className="text-primary size-4" />
            <span className="text-text text-xs font-medium">Doorstep pickup</span>
          </div>
          <div className="border-border bg-surface/90 animate-float absolute bottom-12 left-6 flex items-center gap-2 rounded-full border px-4 py-2 shadow-md backdrop-blur [animation-delay:-3.5s]">
            <ShieldCheck className="text-success size-4" />
            <span className="text-text text-xs font-medium">Careful handling</span>
          </div>
          <div className="bg-accent-soft text-accent animate-float absolute top-24 left-10 flex size-12 items-center justify-center rounded-2xl shadow-sm [animation-delay:-5s]">
            <Sparkles className="size-5" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
