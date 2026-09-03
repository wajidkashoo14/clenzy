'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { fadeUp } from '@/lib/motion';

/**
 * Scroll-reveal wrapper — see docs/ANIMATION_SYSTEM.md §4.2. The wrapped
 * content is typically a Server Component; Next.js renders it on the server
 * and passes it here as `children`, so only this thin client boundary opts
 * into the animation — the content itself stays server-rendered.
 */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-15% 0px' }}
      variants={fadeUp}
    >
      {children}
    </motion.div>
  );
}
