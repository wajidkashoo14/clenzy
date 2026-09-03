/**
 * Motion tokens for Framer Motion (the `motion` package) — the JS-side
 * counterpart to the CSS custom properties in styles/tokens.css. See
 * docs/ANIMATION_SYSTEM.md §3. Reference these constants in every animated
 * component rather than writing raw duration/easing values inline.
 */
import type { Easing, Transition } from 'motion/react';

export { useReducedMotion } from 'motion/react';

/** Seconds — Framer's `duration` is in seconds, unlike the CSS `ms` tokens. */
export const duration = {
  instant: 0.1,
  fast: 0.16,
  base: 0.24,
  slow: 0.36,
  slower: 0.52,
} as const;

export const easing = {
  standard: [0.4, 0, 0.2, 1] as Easing,
  out: [0.16, 1, 0.3, 1] as Easing,
  in: [0.7, 0, 0.84, 0] as Easing,
} as const;

export const spring = {
  stiffness: 320,
  damping: 30,
  mass: 0.8,
} as const;

export const stagger = {
  tight: 0.04,
  loose: 0.08,
} as const;

export const transitions = {
  standard: { duration: duration.base, ease: easing.standard } satisfies Transition,
  enter: { duration: duration.base, ease: easing.out } satisfies Transition,
  exit: { duration: duration.fast, ease: easing.in } satisfies Transition,
  spring: { type: 'spring', ...spring } satisfies Transition,
} as const;

/** Variants for the small fade+rise used on scroll reveals and page content. */
export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: transitions.enter },
};
