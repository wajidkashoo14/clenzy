'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { fadeUp } from '@/lib/motion';

/**
 * Scroll-reveal wrapper — see docs/ANIMATION_SYSTEM.md §4.2. The wrapped
 * content is typically a Server Component; Next.js renders it on the server
 * and passes it here as `children`, so only this thin client boundary opts
 * into the animation — the content itself stays server-rendered.
 * `delay` (seconds) offsets the entrance, e.g. to let a preceding section
 * land first; the default keeps the original zero-delay behaviour.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-15% 0px' }}
      variants={fadeUp}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}
