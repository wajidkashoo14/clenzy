/**
 * Motion tokens for Framer Motion (the `motion` package) — the JS-side
 * counterpart to the CSS custom properties in styles/tokens.css. See
 * docs/ANIMATION_SYSTEM.md §3. Reference these constants in every animated
 * component rather than writing raw duration/easing values inline.
 */
import type { Easing, Transition, Variants } from 'motion/react';

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
  /** 2026 refresh — smooth deceleration for entrances (matches --ease-soft). */
  soft: [0.22, 1, 0.36, 1] as Easing,
  /** 2026 refresh — gentle overshoot for playful micro-interactions (matches --ease-spring). */
  spring: [0.34, 1.56, 0.64, 1] as Easing,
} as const;

export const spring = {
  stiffness: 320,
  damping: 30,
  mass: 0.8,
} as const;

/** A softer, slightly bouncier spring for pills/chips/lifts. */
export const springSoft = {
  type: 'spring',
  stiffness: 260,
  damping: 22,
  mass: 0.9,
} as const;

export const stagger = {
  tight: 0.04,
  loose: 0.08,
} as const;

export const transitions = {
  standard: { duration: duration.base, ease: easing.standard } satisfies Transition,
  enter: { duration: duration.base, ease: easing.out } satisfies Transition,
  enterSoft: { duration: duration.slow, ease: easing.soft } satisfies Transition,
  exit: { duration: duration.fast, ease: easing.in } satisfies Transition,
  spring: { type: 'spring', ...spring } satisfies Transition,
  springSoft: { ...springSoft } satisfies Transition,
} as const;

/** Variants for the small fade+rise used on scroll reveals and page content. */
export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: transitions.enter },
};

/** Fade+rise with a longer travel and softer easing — for hero/section entrances. */
export const fadeUpSoft: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: transitions.enterSoft },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitions.enterSoft },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: transitions.springSoft },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -24 },
  visible: { opacity: 1, x: 0, transition: transitions.enterSoft },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: transitions.enterSoft },
};

/**
 * Parent variant for stagger groups — put on the container, pair children
 * with one of the item variants above (typically `fadeUp`). `delayChildren`
 * lets a section wait for its heading before the items cascade in.
 */
export const staggerContainer = (
  step: number = stagger.loose,
  delayChildren: number = 0,
): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: step, delayChildren } },
});
