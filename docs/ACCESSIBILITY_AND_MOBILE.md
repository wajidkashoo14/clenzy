# Mobile Experience & Accessibility — Clenzy

## PART A — Mobile-first design

Assume 70%+ of traffic and orders come from mobile, mostly mid-range Android on variable connectivity. **Design every screen at 375px first, then expand.** A desktop layout that has been squeezed is not a mobile design.

### 1. Mobile navigation

**Top bar (56px, sticky):** logo (left), cart icon with count (right), hamburger (right). Nothing else — resist adding a search icon or a phone icon here; they belong in the drawer and bottom bar.

**Bottom navigation bar (fixed, 56px + safe-area inset):** Home · Services · Cart (with badge) · Orders · Account. Rationale: thumb-reachable, always visible, and it makes cart and order tracking one tap from anywhere — the two things repeat customers do most. Hidden on `/checkout` so it doesn't compete with the sticky "Place order" CTA, and hidden when the keyboard is open.

**Drawer (hamburger):** slides from the right, full height, with accordion service categories, "Book a pickup" as a full-width primary button, a call/WhatsApp row, locations, pricing, help, and account links. Body scroll locked while open, focus trapped, Escape and backdrop tap close it.

**Sticky action bars:** on catalog pages, a bottom bar showing item count and running total with a "View cart" button appears once the cart is non-empty (slides up, respects safe area). On checkout, the total plus the step's primary action.

### 2. Mobile service selection & catalog

Categories as a two-column grid of tappable cards (not a horizontal carousel — carousels hide content and hurt discovery) · sticky category tab strip when scrolling a long item list, with the active tab auto-scrolled into view · item rows at least 64px tall with the price and stepper on the right, always thumb-reachable · a search field that filters items live and is reachable without scrolling to the top (sticky under the tabs) · quantity steppers with 44×44px hit areas even if the visual button is smaller.

### 3. Mobile cart & checkout

**Cart:** full page, not a drawer, on mobile. Line items with swipe-to-delete (plus a visible delete control, since swipe is undiscoverable on its own) and an undo toast. Summary collapsed to the total with an expand chevron.

**Checkout:** one step per screen, not a long scroll — address → pickup slot → delivery slot → payment. Each step has a visible "Step 2 of 4" and a back control. Slot selection uses a horizontally scrollable date strip plus a vertical list of windows (never a tiny calendar grid). Coupon entry is collapsed behind "Have a coupon?" so it doesn't invite an app-switch to hunt for codes. The primary action is a full-width sticky bottom button showing the amount: "Pay ₹1,299". Keyboard-aware: the focused input must never be hidden behind the sticky bar (`scroll-padding-bottom` and `scrollIntoView` on focus).

**Input types matter:** `type="tel"` `inputMode="numeric"` for phone and OTP and pin code · `type="email"` `inputMode="email"` · `autoComplete` on everything (`tel`, `one-time-code` for OTP — this enables Android's auto-fill from SMS, `postal-code`, `street-address`, `name`) · never `type="number"` for phone numbers (spinners, and it strips leading zeros).

### 4. Mobile order tracking

Vertical timeline, current status prominent at the top with the expected next step and time · large tap targets for "Call agent" and "Reschedule" · pull-to-refresh · poll every 30 seconds while the page is visible, stop when hidden (`visibilitychange`) to save battery and data.

### 5. Touch & gesture rules

Minimum touch target 44×44px, with at least 8px between adjacent targets · no hover-dependent functionality anywhere (a tooltip that only appears on hover is invisible on touch) · gestures used: swipe-to-delete in cart, drag-to-dismiss on sheets, pull-to-refresh on order pages · **never** implement swipe navigation between checkout steps (conflicts with browser back-swipe) · give every gesture a visible non-gesture equivalent · use `:active` states so taps feel immediate; suppress the 300ms delay with `touch-action: manipulation`.

### 6. Mobile performance & resilience

Reduced animation distances and durations · no GSAP or Lenis on mobile · images sized for actual mobile viewport widths, never desktop-sized · skeleton screens rather than spinners · **handle flaky connectivity**: retry failed requests with backoff, keep the cart in `localStorage` so it survives a reload, show an explicit offline banner, and make the order-placement request idempotent so a retry on a dropped connection never creates a duplicate order.

### 7. Responsive behaviour summary

| Element        | Mobile                        | Desktop                                     |
| -------------- | ----------------------------- | ------------------------------------------- |
| Navigation     | Top bar + drawer + bottom bar | Full horizontal nav with mega-menu          |
| Cart           | Full page                     | Slide-over drawer                           |
| Checkout       | One step per screen           | Two-column: form left, sticky summary right |
| Modals         | Bottom sheets                 | Centered dialogs                            |
| Tables (admin) | Stacked cards                 | Real tables                                 |
| Order timeline | Vertical                      | Horizontal                                  |
| Service grid   | 2 columns                     | 3–4 columns                                 |
| Filters        | Bottom sheet                  | Inline sidebar                              |

---

## PART B — Accessibility (target: WCAG 2.2 AA)

Accessibility is not a post-launch audit item. Most of it costs nothing if done from the first component and is expensive to retrofit.

### 8. Semantic HTML first

Use `<button>` for actions and `<a>` for navigation — never a `<div>` with an onClick (it isn't focusable, isn't keyboard-operable, and isn't announced) · one `<main>`, plus `<header>`, `<nav>`, `<footer>`, `<section>` with accessible names · a single `<h1>` per page with no skipped heading levels · real `<ul>`/`<li>` for lists · `<table>` with `<th scope>` for tabular data.

### 9. Keyboard navigation

Everything interactive must be reachable and operable by keyboard, in a logical DOM order · a visible "Skip to main content" link as the first focusable element · **focus is never trapped except intentionally in modals**, where Escape closes and focus returns to the trigger · dropdowns support arrows, Home/End, type-ahead, and Escape · custom components follow the WAI-ARIA Authoring Practices patterns · no positive `tabindex` values, ever · after a route change, move focus to the new page's `<h1>` so screen-reader users aren't stranded at the top of the document.

**Focus indicators:** visible on every focusable element, using `:focus-visible` with a 3px saffron ring at ≥3:1 contrast against the adjacent background. Never `outline: none` without a designed replacement — this is the single most common accessibility regression.

### 10. Screen readers

Meaningful `alt` on informative images; `alt=""` on decorative ones · icon-only buttons get `aria-label` ("Add shirt to cart", not "Add") · `aria-live="polite"` regions for cart total changes, serviceability results, and slot availability updates; `aria-live="assertive"`/`role="alert"` for errors · loading states announced (`aria-busy`, plus a visually hidden "Loading orders") · form errors linked via `aria-describedby` with `aria-invalid` · dynamic content changes announced rather than silently swapped · `aria-current="step"` on the active checkout step and `aria-current="page"` in navigation.

Test with a real screen reader: NVDA on Windows, VoiceOver on iOS. The iOS test matters most given the audience.

### 11. Forms

Every input has a visible `<label>` (placeholders are not labels — they vanish on input and fail contrast) · required fields marked visually and with `aria-required` · errors appear inline next to the field, are announced, and describe the fix ("Enter a 10-digit mobile number") rather than the failure ("Invalid") · validate on blur and on submit, not on every keystroke · on submit failure, move focus to the first invalid field and summarize errors at the top of the form · group related inputs with `<fieldset>`/`<legend>` (e.g. address, payment method) · never rely on colour alone to indicate an error state — pair it with an icon and text.

**WCAG 2.2 specifics to honour:** no drag-only interactions without a click alternative (2.5.7) · targets at least 24×24px, and 44px for primary actions (2.5.8) · focus never obscured by sticky headers/footers (2.4.11) — add `scroll-margin-top` on focusable elements · don't require re-entering information already provided in the same flow (3.3.7) — pre-fill from saved addresses and profile · authentication must not depend on a cognitive test (3.3.8) — OTP paste must work, and never block paste on any field.

### 12. Colour & contrast

Body text ≥4.5:1, large text (≥24px or ≥19px bold) and UI components ≥3:1 · **`--color-accent` (#D98F2B) fails on white for small text — never use it for body copy** (see [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) §2) · status is never communicated by colour alone: every status badge carries an icon and a text label · check the whole UI in greyscale · verify against a colour-blindness simulator.

### 13. Motion & cognitive accessibility

`prefers-reduced-motion` fully respected (the global guard in [ANIMATION_SYSTEM.md](ANIMATION_SYSTEM.md) §5, plus `useReducedMotion()` in Framer components) · nothing auto-plays, flashes, or auto-advances · no time limits on forms — and if an OTP expires, say so clearly and make resending trivial · plain-language copy, short sentences, no jargon · errors and prices always explicit, never implied.

### 14. Testing & tooling

`eslint-plugin-jsx-a11y` in CI (fail the build on errors) · `@axe-core/react` in development to surface violations in the console · `@axe-core/playwright` assertions in E2E tests on the critical journeys (home, catalog, cart, checkout, order tracking) · manual keyboard-only pass on the full booking flow before every release · Lighthouse Accessibility score of 100 as a CI gate · at least one manual screen-reader pass through the complete order flow before launch.

**Automated tools catch roughly a third of real issues.** The keyboard-only and screen-reader passes are what actually verify the product works.
