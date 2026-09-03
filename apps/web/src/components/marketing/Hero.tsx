'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { PincodeInput, type PincodeCheckStatus } from '@/components/ui/PincodeInput';
import { checkPincodeServiceable } from '@/content/locations';
import { transitions } from '@/lib/motion';

/**
 * The headline and primary CTA render at full opacity immediately — no
 * animation — since this is the LCP element. Only supporting elements
 * (subcopy, trust badges, the pin-code field) fade+rise in, staggered.
 * See docs/ANIMATION_SYSTEM.md §4.3.
 */
export function Hero(): ReactNode {
  const [pincode, setPincode] = useState('');
  const [status, setStatus] = useState<PincodeCheckStatus>('idle');
  const [matchedAreaName, setMatchedAreaName] = useState<string | null>(null);

  function handleCheck(value: string): void {
    setStatus('loading');
    setTimeout(() => {
      const area = checkPincodeServiceable(value);
      if (area) {
        setMatchedAreaName(area.name);
        setStatus('success');
      } else {
        setStatus('error');
      }
    }, 500);
  }

  return (
    <section className="border-border bg-surface-alt/50 border-b">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
        <div>
          <h1 className="font-heading text-text text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Fabric care that treats your clothes like they’re yours.
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
            className="border-border bg-surface mt-10 max-w-sm rounded-lg border p-4 shadow-sm"
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
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...transitions.enter, delay: 0.15 }}
          className="from-primary-soft to-secondary-soft relative hidden aspect-square items-center justify-center rounded-2xl bg-gradient-to-br lg:flex"
          aria-hidden="true"
        >
          {/* TODO(content): replace with real facility/product photography once available — see docs/DESIGN_SYSTEM.md §1 */}
          <span className="font-heading text-primary/40 text-2xl font-medium">Clenzy</span>
        </motion.div>
      </div>
    </section>
  );
}
