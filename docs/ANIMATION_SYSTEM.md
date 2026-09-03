# Animation System — Clenzy

## 1. Principles

1. **Motion must carry meaning.** Every animation answers one of: _where did this come from?_, _what changed?_, _is something happening?_, _did that work?_ If it answers none, delete it.
2. **Fast by default.** UI feedback 120–200ms; entrances 250–400ms; only celebratory moments exceed 500ms. A user who notices the duration is waiting on you.
3. **Animate compositor-friendly properties only:** `transform` and `opacity`. Never animate `width`, `height`, `top`, `left`, `margin`, or `box-shadow` in a loop or on scroll.
4. **One focal motion at a time.** If two things animate simultaneously on entry, stagger them — don't run them in parallel at equal weight.
5. **Reduced motion is a first-class path,** not a fallback. Under `prefers-reduced-motion: reduce`, transforms/parallax/looping motion are disabled; opacity fades ≤150ms and instant state changes remain so the interface still communicates state.
6. **Never block interaction on animation.** Content is interactive the moment it renders, even mid-transition.
7. **Never animate on the critical path.** LCP element must not fade in — it renders immediately at final opacity. Hero _supporting_ elements may animate; the hero headline must not.

## 2. Technology choices

| Tech                                   | Use for                                                                                                                                               | Why                                                                                                                                                            |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CSS transitions/animations**         | Hover, focus, active, small state changes, skeletons, spinners                                                                                        | Zero JS cost. Default choice — reach for this first                                                                                                            |
| **Framer Motion (`motion` for React)** | Component enter/exit, layout transitions, shared-element transitions, page transitions, gesture-driven sheets, staggered lists, cart/drawer animation | Declarative, handles exit animations (which CSS cannot), excellent `AnimatePresence` and `layout` support, tree-shakeable via `LazyMotion`                     |
| **GSAP + ScrollTrigger**               | **Only** the hero's chinar-vine SVG stroke draw and one scroll-pinned "how it works" sequence on desktop                                              | Genuinely better at SVG path/timeline sequencing. Load it dynamically on those routes only — it must never enter the shared bundle                             |
| **Lenis**                              | Smooth scroll on desktop only                                                                                                                         | Improves the feel of long marketing pages. **Disabled on mobile** (fights native momentum scrolling and hurts input latency) and disabled under reduced-motion |
| **Not using**                          | Lottie, Three.js, particle libraries                                                                                                                  | Weight and maintenance cost far exceed the value here                                                                                                          |

Bundle discipline: import Framer Motion via `LazyMotion` + `domAnimation` features; use the `m` component rather than `motion` in shared components. GSAP and Lenis are dynamically imported and desktop-gated.

## 3. Motion tokens

Define once and reference everywhere (`apps/web/src/lib/motion.ts`):

| Token              | Value                                                      | Use                                                      |
| ------------------ | ---------------------------------------------------------- | -------------------------------------------------------- |
| `duration.instant` | 100ms                                                      | Color/opacity micro-feedback                             |
| `duration.fast`    | 160ms                                                      | Hover, focus, button press                               |
| `duration.base`    | 240ms                                                      | Most enter/exit, dropdowns, toasts                       |
| `duration.slow`    | 360ms                                                      | Sheets, drawers, modals, page content                    |
| `duration.slower`  | 520ms                                                      | Success celebrations, timeline reveals                   |
| `ease.standard`    | `cubic-bezier(0.4, 0, 0.2, 1)`                             | Default for state changes                                |
| `ease.out`         | `cubic-bezier(0.16, 1, 0.3, 1)`                            | Entrances — decisive arrival                             |
| `ease.in`          | `cubic-bezier(0.7, 0, 0.84, 0)`                            | Exits                                                    |
| `ease.spring`      | Framer spring `{ stiffness: 320, damping: 30, mass: 0.8 }` | Gestural/physical elements: sheets, steppers, cart badge |
| `stagger.tight`    | 40ms                                                       | List items, item rows                                    |
| `stagger.loose`    | 80ms                                                       | Cards in a grid, hero sub-elements                       |

## 4. Animation catalogue

Each entry: **What · Why · Trigger · Duration/Easing · Mobile · Performance.**

### 4.1 Page transitions

- **What:** Outgoing content fades to 0 and shifts up 8px; incoming fades in from 12px below. Route-level only; the header/nav persists and never re-animates.
- **Why:** Signals a context change and hides the perceptual gap during data fetch, so navigation feels continuous rather than jumpy.
- **Trigger:** Next.js App Router navigation, via `AnimatePresence` in a client transition wrapper (`template.tsx`).
- **Duration/Easing:** out 140ms `ease.in`, in 260ms `ease.out`, with a 40ms overlap.
- **Mobile:** Same but 200ms, translate reduced to 8px.
- **Performance:** Transform/opacity only. Never delay the incoming page's data fetch behind the animation. Under reduced motion: 100ms crossfade, no translate.

### 4.2 Scroll reveals (marketing pages)

- **What:** Sections rise 16px and fade in as they enter the viewport; children stagger at 60ms.
- **Why:** Directs reading order down a long marketing page and gives each section a moment of focus.
- **Trigger:** Framer `whileInView` with `viewport={{ once: true, margin: '-15% 0px' }}` — animates once, never on scroll-back.
- **Duration/Easing:** 400ms `ease.out`.
- **Mobile:** Distance reduced to 10px, stagger to 40ms; sections trigger earlier (`-8%`) since the viewport is short.
- **Performance:** IntersectionObserver-backed (no scroll listeners). Cap at ~6 concurrently animating elements. **Above-the-fold content must never use this** — it would delay LCP and cause a flash of empty page.

### 4.3 Hero

- **What:** Three-layer entrance. (1) Headline and primary CTA render immediately at full opacity — **no animation**. (2) Supporting elements (subcopy, pin-code field, trust badges) fade+rise with an 80ms stagger starting at 100ms. (3) The chinar-vine SVG behind the composition draws its stroke over 1.6s (`stroke-dashoffset`) and settles at 5% opacity; a very slow 20s parallax drift follows.
- **Why:** The value proposition must be readable instantly (LCP + trust); the decorative layer establishes brand character without delaying comprehension.
- **Trigger:** Mount for layers 1–2; GSAP timeline on load for layer 3.
- **Duration/Easing:** Layer 2 320ms `ease.out`; layer 3 1.6s `power2.out`.
- **Mobile:** Layer 3 is a **static** SVG at final state — no draw, no parallax, no GSAP loaded at all. Saves ~30KB and avoids scroll jank on low-end Android.
- **Performance:** SVG is inline (no network request), path count kept under 12. LCP element is the headline text and carries no animation. Reduced motion: everything renders at final state.

### 4.4 Card hover (desktop only)

- **What:** `translateY(-4px)`, shadow `sm`→`lg`, border tints toward primary, arrow icon slides 4px right.
- **Why:** Confirms the whole card is clickable and creates depth hierarchy.
- **Trigger:** `@media (hover: hover)` CSS hover.
- **Duration/Easing:** 160ms `ease.standard`; exit 120ms.
- **Mobile:** No hover state; instead an active/pressed state of `scale(0.985)` for 100ms on touch.
- **Performance:** Pure CSS. Pre-declare the shadow on a pseudo-element and animate its opacity rather than animating `box-shadow` directly.

### 4.5 Buttons

- **What:** Hover darkens fill (120ms); press `scale(0.98)` (80ms); focus-visible ring scales in from 0.9 (120ms); loading swaps the label for a spinner with the width locked.
- **Why:** Immediate tactile confirmation; the width lock prevents layout shift that would otherwise feel broken.
- **Trigger:** CSS pseudo-classes; loading driven by request state.
- **Mobile:** Press scale only (no hover). Do not add ripple effects.
- **Performance:** Pure CSS; no JS listeners.

### 4.6 Navigation

- **What:** Header solidifies (background opacity + border + shadow) after 40px of scroll. Mega-menu fades and rises 8px over 200ms with 120ms hover intent. Mobile drawer slides in from the right on a spring with a backdrop fade; drawer links stagger in at 30ms.
- **Why:** A transparent header maximizes hero impact, then becomes legible over content. Hover intent prevents accidental menu flicker.
- **Trigger:** Throttled scroll (via `useScroll`/rAF, never a raw scroll listener); pointer enter/leave; drawer open state.
- **Duration/Easing:** Header 200ms `ease.standard`; menu 200ms `ease.out`; drawer `ease.spring`.
- **Mobile:** Drawer is the primary pattern; ensure it animates at 60fps by animating `transform: translateX()` on a `will-change: transform` element that is removed after the transition.
- **Performance:** Header state is a class toggle, not a per-frame style write.

### 4.7 Service & item selection

- **What:** Tapping "Add" on an item row: the row background fills with `--color-primary-soft` (160ms), the button morphs into a quantity stepper via Framer `layout`, and a small chip flies from the row to the cart icon (400ms, arcing) while the cart badge scales 1→1.25→1 and increments.
- **Why:** The fly-to-cart is the clearest possible confirmation that the tap registered and where the item went — it prevents the double-tap-then-duplicate problem on slow connections.
- **Trigger:** Add/quantity-change click.
- **Duration/Easing:** Morph 240ms `ease.spring`; fly 400ms `ease.out`; badge pop 300ms spring.
- **Mobile:** Keep it — this is the highest-value animation in the product. Shorten fly to 320ms. Ensure the flying element is `position: fixed` and `pointer-events: none`.
- **Performance:** One flying element at a time (cancel any in-flight one). Under reduced motion: skip the fly, just increment the badge and show a toast.

### 4.8 Cart

- **What:** Cart drawer slides from the right (desktop) or up as a sheet (mobile) on a spring. Line items animate in with a 40ms stagger. Removing an item collapses its height and fades out (`AnimatePresence` + `layout`). The total counts up when it changes (200ms numeric tween).
- **Why:** Removal needs an exit animation so the list doesn't visibly "jump"; the counting total draws attention to the number that changed.
- **Trigger:** Drawer open/close, item mutations.
- **Duration/Easing:** Drawer `ease.spring`; item exit 200ms `ease.in`; total 200ms.
- **Mobile:** Bottom sheet with drag-to-dismiss (`dragConstraints` + velocity-based dismissal threshold).
- **Performance:** Framer `layout` animations are expensive with many items — cap the animated list to ~20 items and disable layout animation beyond that.

### 4.9 Checkout transitions

- **What:** Steps slide horizontally (forward: new step in from +24px, old out to −24px; reverse mirrored). The step indicator's progress line grows and the completed circle stamps its check with a spring. The sticky total bar animates its number on every change.
- **Why:** Directionality tells the user whether they advanced or went back — critical for not losing orientation in a multi-step form.
- **Trigger:** Step change.
- **Duration/Easing:** 280ms `ease.out`; check stamp 300ms spring.
- **Mobile:** Same, reduced to 16px translate. Auto-scroll to the top of the new step and move focus to its heading.
- **Performance:** Only two steps mounted at a time. **Never animate the payment iframe/modal** — Razorpay owns that surface.

### 4.10 Order tracking

- **What:** On load, timeline nodes reveal sequentially (80ms stagger) with the connecting line drawing between them; the current node has a slow 2s pulse ring; a completed step animates its check.
- **Why:** The sequential reveal communicates the process order; the pulse shows the order is live, not stale.
- **Trigger:** Mount; and on status change detected via polling.
- **Duration/Easing:** Reveal 300ms `ease.out` staggered; line draw 400ms; pulse 2s infinite `ease-in-out`.
- **Mobile:** Vertical timeline, same motion; the pulse is the only looping animation permitted in the product.
- **Performance:** The pulse uses `transform: scale` + `opacity` on a pseudo-element. Under reduced motion it becomes a static ring. Stop the pulse when the tab is hidden (`visibilitychange`) to save battery.

### 4.11 Loading states

- **What:** Skeletons (a 1.4s shimmer sweeping a subtle gradient) for content areas; a 16px spinner for buttons; a 2px top progress bar for route transitions.
- **Why:** Skeletons preserve layout and reduce perceived wait; a spinner alone in an empty page feels slower.
- **Trigger:** Suspense boundaries / request state.
- **Duration/Easing:** Shimmer 1.4s linear infinite.
- **Mobile:** Identical. Skeletons must match the real content's dimensions exactly or they cause CLS on swap.
- **Performance:** Animate `transform: translateX` of a gradient overlay, not `background-position`. Reduced motion: static grey blocks, no shimmer.

### 4.12 Success moments

- **What:** Order placed → a circle scales in with a spring, the checkmark path draws (300ms), and the order number fades up. **No confetti.**
- **Why:** Marks a genuine milestone and gives the page a beat before the user reads the details. Confetti would undercut the premium tone.
- **Trigger:** Order confirmation page mount.
- **Duration/Easing:** Circle 400ms spring; check draw 300ms `ease.out`; content 300ms staggered after.
- **Mobile:** Same; keep the sequence under 900ms total.
- **Performance:** Inline SVG stroke animation. Reduced motion: static check icon.

### 4.13 Micro-interactions

| Interaction           | Motion                                                                    | Duration              |
| --------------------- | ------------------------------------------------------------------------- | --------------------- |
| Quantity stepper      | Number slides up/down by direction; button presses scale                  | 160ms                 |
| Toast enter/exit      | Slide 12px + fade; exit slides right (desktop) / up (mobile)              | 240 / 180ms           |
| Accordion (FAQ)       | Height auto via Framer `layout` or Radix CSS vars + chevron rotates 180°  | 240ms `ease.standard` |
| Coupon applied        | Field collapses into a success chip; discount row slides into the summary | 260ms                 |
| Pin-code check        | Inline spinner → check or cross with a 4px shake on failure               | 200ms                 |
| Form validation error | Field shakes 3px twice; message fades in below                            | 220ms                 |
| Tab/filter switch     | Active pill slides between options via Framer `layoutId`                  | 220ms spring          |
| Copy order number     | Icon morphs to a check, reverts after 1.5s                                | 150ms                 |
| Image load            | Blur-up from Next.js `placeholder="blur"`                                 | 300ms                 |
| Status badge change   | Old badge fades out, new fades in with a brief soft-color pulse           | 300ms                 |

## 5. Global rules for the implementer

```
/* Required global reduced-motion guard — in globals.css */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Plus a `useReducedMotion()` check in every Framer Motion component that translates or scales; Lenis and GSAP must not initialize at all when it's set.

**Performance budget:** the marketing homepage must stay above 55fps during scroll on a mid-range Android (test with Chrome DevTools 4× CPU throttling). Animation-related JS (Framer + Lenis) must stay under 45KB gzipped on the shared bundle; GSAP loads only on the two routes that need it. If a scroll animation drops frames, delete it — no scroll animation is worth a janky page.

**Anti-patterns — do not build these:** scroll-hijacking that overrides normal scrolling · full-page loaders/preloaders · text that animates in word-by-word or letter-by-letter · parallax on more than one element per page · anything that animates on every scroll event rather than once · auto-playing carousels · animated numbers that make prices hard to read at a glance during checkout · hover effects that shift layout and cause the pointer to leave the element.
