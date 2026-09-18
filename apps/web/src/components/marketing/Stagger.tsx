'use client';

import { motion, type HTMLMotionProps } from 'motion/react';
import type { JSX, ReactNode } from 'react';
import { fadeUp, staggerContainer } from '@/lib/motion';

/**
 * Scroll-triggered stagger group — the container orchestrates while each
 * `StaggerItem` cascades in with the shared fade+rise. Like `Reveal`, the
 * wrapped content is typically Server-Component markup passed as children,
 * so only this thin boundary is client-side. `as` keeps list semantics
 * intact when wrapping `<li>` children (e.g. an `<ol>` of steps).
 */
export function Stagger({
  children,
  className,
  as = 'div',
  step,
  delayChildren = 0,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  /** Seconds between items — defaults to lib/motion's loose stagger. */
  step?: number;
  /** Seconds before the cascade starts (e.g. wait for the heading). */
  delayChildren?: number;
} & Omit<HTMLMotionProps<'div'>, 'children' | 'variants'>): ReactNode {
  const Tag = motion[as as 'div'];
  return (
    <Tag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-10% 0px' }}
      variants={staggerContainer(step, delayChildren)}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function StaggerItem({
  children,
  className,
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}): ReactNode {
  const Tag = motion[as as 'div'];
  return (
    <Tag className={className} variants={fadeUp}>
      {children}
    </Tag>
  );
}
