# Design System — Clenzy

## 1. Brand direction

**Positioning statement:** A modern fabric-care technology company that happens to be from Kashmir — not a Kashmir-themed website that happens to do laundry.

The design reads first as **premium, precise, and trustworthy** (think Stripe or Linear's restraint, applied to a consumer service), and second as **quietly Kashmiri** through material, color, and pattern rather than through imagery clichés.

### What we take from Kashmir

| Source                           | How it appears                                                                                 | How it must NOT appear                             |
| -------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Chinar leaf                      | Simplified single-leaf mark; used as a section divider glyph and in the logo's counter-space   | Repeated autumn-leaf photo backgrounds             |
| Kashmiri crewel/sozni embroidery | Line-art vine motif at ~4% opacity as a section-edge texture; SVG stroke animation on the hero | Loud embroidered borders, gold filigree everywhere |
| Snow & mountain light            | The near-white background palette, soft high-key photography, generous whitespace              | Snowfall particle effects, mountain hero photos    |
| Dal Lake                         | Deep muted blue-teal as the secondary color; subtle water-like easing in motion                | Shikara boats, lake photography in the hero        |
| Saffron (Pampore kesar)          | The single warm accent, used sparingly for emphasis and CTAs' hover state                      | Saffron as a large fill color                      |
| Walnut wood & pashmina           | Warm neutral text colors, soft shadows, slightly warm off-white surfaces                       | Wood-texture backgrounds                           |

**Rule of thumb:** on any given screen, Kashmiri motif should be detectable but never the loudest element. If a first-time visitor would describe the site as "traditional," it has gone too far. Target description: _"clean, expensive-feeling, a bit warm."_

### Logo & mark direction

- Wordmark: "Clenzy" set in the heading serif, slightly tightened tracking, lowercase-friendly.
- Mark: a geometric chinar leaf abstracted into three strokes that also read as a droplet. Must work at 24×24 px (favicon) monochrome.
- Clear space: 0.5× the mark's height on all sides. Never place the mark on a busy photo without a solid backing shape.
- Deliverables the coding model should expect to receive (not generate): SVG logo (horizontal, stacked, mark-only), favicon set, OG image template. Until they exist, use a text wordmark placeholder — **do not ship AI-generated logo art without owner approval.**

## 2. Color

All colors are defined as CSS custom properties on `:root` and mapped into Tailwind via `tailwind.config.ts`. **Never hardcode a hex value in a component.**

### Core palette

| Token                    | Hex       | Use                                                                       |
| ------------------------ | --------- | ------------------------------------------------------------------------- |
| `--color-primary`        | `#14524A` | Deodar green. Primary buttons, links, active nav, brand surfaces          |
| `--color-primary-hover`  | `#0F423B` | Hover/pressed state of primary                                            |
| `--color-primary-soft`   | `#E6EFEC` | Tinted backgrounds, selected states, badges                               |
| `--color-secondary`      | `#2C5F7C` | Dal blue. Secondary actions, informational accents, links on dark         |
| `--color-secondary-soft` | `#E8F0F4` | Info banners                                                              |
| `--color-accent`         | `#D98F2B` | Saffron. Sparingly: highlight text, offer badges, focus glow, active step |
| `--color-accent-soft`    | `#FBF0DE` | Offer/promo backgrounds                                                   |
| `--color-bg`             | `#FAF8F4` | Page background — warm off-white, never pure white                        |
| `--color-surface`        | `#FFFFFF` | Cards, sheets, modals                                                     |
| `--color-surface-alt`    | `#F3F0EA` | Alternating sections, table header rows, input backgrounds                |
| `--color-border`         | `#E4DFD6` | Default borders and dividers                                              |
| `--color-border-strong`  | `#CFC8BB` | Input borders, emphasized dividers                                        |
| `--color-text`           | `#20211E` | Primary text                                                              |
| `--color-text-muted`     | `#6B675E` | Secondary text, captions, placeholders                                    |
| `--color-text-inverse`   | `#FAF8F4` | Text on primary/dark surfaces                                             |

### Semantic palette

| Token             | Hex       | Soft variant | Use                                               |
| ----------------- | --------- | ------------ | ------------------------------------------------- |
| `--color-success` | `#2F8F5B` | `#E4F2EA`    | Delivered, payment success, confirmations         |
| `--color-warning` | `#C98A15` | `#FBF1DC`    | Pending payment, action needed, capacity warnings |
| `--color-error`   | `#C13F3F` | `#F8E5E5`    | Failures, destructive actions, validation errors  |
| `--color-info`    | `#2C5F7C` | `#E8F0F4`    | Neutral system messages                           |

### Order-status colors

Each lifecycle state gets a consistent color so the timeline, badges, and admin tables agree:

| Status                                                            | Color         |
| ----------------------------------------------------------------- | ------------- |
| `PENDING_PAYMENT`                                                 | warning       |
| `PLACED`, `CONFIRMED`                                             | secondary     |
| `PICKUP_SCHEDULED`, `PICKED_UP`                                   | secondary     |
| `PROCESSING`, `QUALITY_CHECK`                                     | accent        |
| `READY`, `OUT_FOR_DELIVERY`                                       | primary       |
| `DELIVERED`, `COMPLETED`                                          | success       |
| `CANCELLED`, `PAYMENT_FAILED`, `PICKUP_FAILED`, `DELIVERY_FAILED` | error         |
| `REFUND_PENDING`, `REFUNDED`                                      | muted/neutral |

### Dark mode

**Not in MVP.** Ship light-only, but author every color as a token so dark mode is a token-swap later, not a refactor. Do not scatter `dark:` variants through components now.

### Contrast requirements

`--color-primary` on `--color-bg` = ~9:1, `--color-text` on `--color-bg` = ~15:1, `--color-text-muted` on `--color-bg` = ~5.3:1 — all pass WCAG AA. **`--color-accent` (#D98F2B) on white is ~2.6:1 and must never be used for body text or small text** — it is for large display text, icons ≥24px, borders, and fills only. Text on accent fills must be `--color-text`, not white.

## 3. Typography

| Role                      | Font                                              | Source                                    | Fallback stack                                     |
| ------------------------- | ------------------------------------------------- | ----------------------------------------- | -------------------------------------------------- |
| Headings / display        | **Fraunces** (variable, optical size + soft axis) | Google Fonts, self-hosted via `next/font` | `Georgia, 'Times New Roman', serif`                |
| Body / UI                 | **Inter** (variable)                              | Google Fonts, self-hosted via `next/font` | `system-ui, -apple-system, 'Segoe UI', sans-serif` |
| Numerals in tables/prices | Inter with `font-variant-numeric: tabular-nums`   | —                                         | —                                                  |

Rationale: Fraunces gives warmth and craft (aligning with textile heritage) without looking traditional; Inter is neutral, dense, and excellent for forms, price tables, and small UI. Two families only — a third would dilute the system. Self-host both via `next/font` so there is zero layout shift and no request to Google at runtime.

### Type scale (fluid, `clamp()`)

| Token      | Mobile → Desktop | Weight | Line height | Letter spacing | Use                                 |
| ---------- | ---------------- | ------ | ----------- | -------------- | ----------------------------------- |
| `display`  | 36px → 60px      | 600    | 1.05        | -0.02em        | Hero headline (Fraunces)            |
| `h1`       | 30px → 44px      | 600    | 1.12        | -0.02em        | Page titles (Fraunces)              |
| `h2`       | 24px → 32px      | 600    | 1.2         | -0.01em        | Section headings (Fraunces)         |
| `h3`       | 20px → 24px      | 600    | 1.3         | -0.01em        | Card titles, subsections (Fraunces) |
| `h4`       | 17px → 18px      | 600    | 1.4         | 0              | Inline headings (Inter)             |
| `body-lg`  | 17px → 18px      | 400    | 1.65        | 0              | Lead paragraphs                     |
| `body`     | 15px → 16px      | 400    | 1.6         | 0              | Default                             |
| `body-sm`  | 14px             | 400    | 1.55        | 0              | Secondary text                      |
| `caption`  | 12px → 13px      | 500    | 1.4         | 0.01em         | Labels, meta, timestamps            |
| `overline` | 12px             | 600    | 1.2         | 0.08em         | Uppercase eyebrow labels            |
| `price`    | 16px → 18px      | 600    | 1.2         | 0              | Prices — always tabular-nums        |

Weights used: 400, 500, 600 only (plus 700 for the logo wordmark). Never use more than three weights per screen. Body copy never goes below 14px. Measure (line length) capped at 68 characters for prose blocks.

## 4. Spacing, radius, elevation

- **Spacing scale (4px base):** 0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128. Use Tailwind's default scale; do not invent arbitrary values.
- **Section rhythm:** mobile 56–64px vertical padding, desktop 96–120px.
- **Container:** max-width 1200px, 16px gutters mobile / 24px tablet / 32px desktop.
- **Radius:** `sm` 6px (badges, inputs' inner elements), `md` 10px (buttons, inputs), `lg` 16px (cards), `xl` 24px (modals, sheets, feature panels), `full` 999px (pills, avatars). Consistency matters more than the exact numbers — one radius family everywhere.
- **Elevation** (soft, warm-tinted, never pure black):
  - `shadow-sm`: `0 1px 2px rgba(32,33,30,0.05)`
  - `shadow-md`: `0 4px 12px rgba(32,33,30,0.07)`
  - `shadow-lg`: `0 12px 32px rgba(32,33,30,0.10)`
  - `shadow-focus`: `0 0 0 3px rgba(217,143,43,0.35)` (saffron focus ring)
- **Borders before shadows.** Default cards use a 1px `--color-border` and `shadow-sm`; reserve `shadow-lg` for overlays and hover-lifted cards.

## 5. Component specifications

Every component must implement **all five states**: default, hover, focus-visible, active/pressed, disabled — plus loading and error where applicable.

### Buttons

| Variant     | Appearance                                            | Use                                        |
| ----------- | ----------------------------------------------------- | ------------------------------------------ |
| `primary`   | Filled `--color-primary`, inverse text                | The one main action per screen             |
| `secondary` | Surface fill, 1px `--color-border-strong`, text color | Alternative actions                        |
| `ghost`     | Transparent, text color, tinted hover                 | Tertiary/nav actions                       |
| `danger`    | Filled `--color-error`                                | Destructive (cancel order, delete address) |
| `link`      | Underline-on-hover text button                        | Inline actions                             |

Sizes: `sm` 36px, `md` 44px (default), `lg` 52px height. **Minimum touch target 44×44px on mobile.** Horizontal padding 16/20/24px. States: hover darkens 8%, active darkens 12% + `scale(0.98)`, focus-visible gets `shadow-focus`, disabled = 45% opacity + `cursor: not-allowed`. Loading = spinner replaces label text, width locked to prevent layout jump, button disabled and `aria-busy="true"`.

### Inputs & forms

- Height 44px (`md`), radius `md`, 1px `--color-border-strong`, `--color-surface-alt` fill, 12–14px horizontal padding.
- Label always visible above the input (never placeholder-only — placeholders disappear and fail accessibility).
- Focus: border → `--color-primary` + `shadow-focus`.
- Error: border → `--color-error`, error message below in 13px error color, prefixed with an icon, and linked via `aria-describedby`; input gets `aria-invalid="true"`.
- Helper text sits below in muted 13px.
- Required fields marked with a visible `*` and `aria-required`.
- Specialized inputs to build: phone (with `+91` prefix, 10-digit mask), OTP (6 separate boxes with paste support and auto-advance/backspace handling), pin code (6-digit numeric with inline serviceability check + loading spinner), quantity stepper (−/+ with a typable number, clamped 0–99), date picker (native on mobile, custom on desktop), textarea (auto-grow, character counter for notes).

### Dropdowns / selects

Use Radix UI Select/Popover primitives (accessible by default) styled with Tailwind. Custom trigger matching input styling; menu with `--color-surface`, `shadow-lg`, radius `md`, 8px padding, 40px item height, hover = `--color-primary-soft`, selected = check icon + soft fill. Keyboard: arrows, type-ahead, Escape, Enter. On mobile <640px, render as a bottom sheet instead of a floating menu.

### Cards

- **Base card:** `--color-surface`, 1px border, radius `lg`, 20–24px padding, `shadow-sm`.
- **Service card:** icon/illustration (56px), title (h3), one-line description, "from ₹X" price hint, arrow affordance. Hover (desktop only): `translateY(-4px)` + `shadow-lg` + border tint to primary. Entire card is one link — never nest interactive elements inside a link.
- **Item row (price list / picker):** left = item name + optional care note, right = unit price + quantity stepper. 64px min height. When quantity > 0: row gets `--color-primary-soft` background and a left accent border. This row is the highest-traffic component in the product — build it once, reuse it in catalog, cart, checkout review, and admin itemization.
- **Pricing card (plans/packages):** vertical, optional "Popular" ribbon in accent, price in `display` size, feature checklist, single CTA.
- **Order card (dashboard):** order number + status badge + item count + total + slot summary + primary action. Status badge color from the status color map.
- **Stat card (admin):** label (overline), value (h1, tabular), delta vs. previous period with up/down arrow in success/error color, optional sparkline.

### Navigation

- **Desktop header:** 72px tall, sticky, transparent over the hero then solidifying to `--color-surface` with border + `shadow-sm` after 40px of scroll. Left: logo. Center: Services (mega-menu), Pricing, How it works, Locations, Business. Right: phone link, cart icon with count badge, account/login button.
- **Services mega-menu:** two columns of categories with icons + a promoted panel. Opens on hover (desktop) with 120ms intent delay; Escape and click-outside close it; full keyboard support.
- **Mobile header:** 56px, logo + cart + hamburger. Drawer slides from the right, full height, with accordion service list, prominent "Book a pickup" CTA, phone/WhatsApp row, and account links. Body scroll locked while open; focus trapped; Escape closes.
- **Mobile bottom bar** (see [ACCESSIBILITY_AND_MOBILE.md](ACCESSIBILITY_AND_MOBILE.md)): Home · Services · Cart · Orders · Account. Hidden during checkout to avoid competing CTAs.
- **Breadcrumbs** on service/location/blog pages, with `BreadcrumbList` schema.

### Footer

Four columns on desktop, stacked accordions on mobile: Services (links to each category) · Company (about, how it works, business, blog, contact) · Support (FAQ, track order, re-clean policy, refund policy) · Reach us (address of each outlet, phone, WhatsApp, email, hours, social). Bottom bar: copyright, Terms, Privacy, Refund, GST/registration details when available. Include the chinar-vine line motif at 4% opacity as a top edge.

### Modals & sheets

Radix Dialog. Desktop: centered, max-width 480/640px, radius `xl`, `shadow-lg`, backdrop `rgba(32,33,30,0.45)` with 4px blur. Mobile <640px: bottom sheet, rounded top corners, drag-to-dismiss, safe-area padding. Focus trapped, Escape closes, focus returns to the trigger, `aria-modal` + labelled title. Never nest modals.

### Toasts

Top-right desktop / top-center mobile (below the header), auto-dismiss 4s (errors 6s, or sticky if actionable), max 3 stacked, swipe-to-dismiss on mobile, `role="status"` for success/info and `role="alert"` for errors. Variants: success, error, warning, info, plus a "loading→resolved" variant for optimistic actions.

### Badges & status indicators

- **Badge:** pill, 12px semibold, soft background + strong text of the same hue, optional 6px leading dot.
- **Status pill (orders):** dot + label, colors from the status map, plus an icon for colorblind accessibility — never rely on color alone.
- **Step indicator (checkout):** numbered circles connected by a line; completed = filled primary + check, current = accent ring, upcoming = muted. Mobile shows "Step 2 of 4" text plus a progress bar.
- **Order timeline:** vertical on mobile, horizontal on desktop; each node has icon, status label, timestamp, and optional detail (agent name/phone). Completed nodes filled, current node pulsing (respecting reduced-motion), future nodes outlined.

### Tables (admin)

Sticky header, 48px rows, zebra `--color-surface-alt`, hover row tint, sortable column headers with direction indicators, per-row action menu, checkbox multi-select with a bulk-action bar, sticky first column on horizontal scroll, and a mandatory `overflow-x: auto` wrapper. **On screens <768px, tables become stacked cards, not horizontally scrolling grids.** Every table needs: loading (skeleton rows), empty (illustration + CTA), error (retry), and filtered-empty ("no results for these filters — clear filters") states.

### Checkout components

Address card (selectable radio card with label chip, edit/delete, "Deliver here" selected state) · slot grid (date chips row + time-window cards showing "3 left" or "Fully booked") · coupon input (inline apply with loading, success chip showing discount, removable) · order summary (sticky sidebar desktop / collapsible bottom sheet mobile showing total collapsed, full breakdown expanded) · payment method selector (radio cards with method logos) · sticky mobile CTA bar with total + "Place order".

## 6. Iconography & illustration

- **Icons:** Lucide React, 1.5px stroke, 20px default / 24px touch targets. One icon set only.
- **Service illustrations:** commission or generate a consistent set of simple line illustrations with a single accent fill, drawn in the same 1.5px stroke language as the icons. Placeholder = Lucide icon in a `--color-primary-soft` rounded square until real art exists.
- **Photography:** real photos of actual garments/facility/staff, high-key and warm. Avoid generic stock laundry imagery. Every photo needs a real `alt` description.
- **Pattern asset:** one SVG chinar-vine line motif, used at 3–6% opacity as section edges and empty-state backdrops. Ship as a single inline-able SVG component, not a raster image.

## 7. Responsive strategy

| Breakpoint                  | Tailwind | Width       | Layout rules                                                                                       |
| --------------------------- | -------- | ----------- | -------------------------------------------------------------------------------------------------- |
| Mobile                      | (base)   | 320–639px   | Single column, bottom nav, sticky CTA bar, sheets instead of modals, stacked tables, 16px gutters  |
| Large mobile / small tablet | `sm`     | 640–767px   | Two-column service grid, wider cards, still bottom nav                                             |
| Tablet                      | `md`     | 768–1023px  | Two-column layouts, drawer nav becomes optional, tables become real tables, 24px gutters           |
| Laptop                      | `lg`     | 1024–1279px | Full desktop nav with mega-menu, three-column grids, sticky checkout sidebar, hover states enabled |
| Desktop                     | `xl`     | 1280–1535px | Container caps at 1200px, four-column footer, richer whitespace                                    |
| Large desktop               | `2xl`    | ≥1536px     | Container stays 1200px (content does not stretch); only background/decorative elements expand      |

Rules: mobile-first CSS (never `max-width` queries) · never hide content on mobile that exists on desktop, restructure it instead · hover effects only inside `@media (hover: hover)` · test at 320px, 375px, 414px, 768px, 1024px, 1440px · respect `env(safe-area-inset-*)` for iOS notches on all fixed elements.

## 8. Content & voice

Calm, precise, and human. Short sentences. No exclamation marks in UI copy. Prices always as `₹1,299` with Indian digit grouping. Dates as `Tue, 12 Mar · 9–11 AM`. Never say "Oops!" in an error — say what happened and what to do next. Error messages name the fix ("This coupon needs a ₹499 minimum — add ₹120 more to use it"), never just the failure.

## 9. Design tokens implementation note

Author tokens once in `apps/web/src/styles/tokens.css` as CSS custom properties, then reference them in `tailwind.config.ts` (e.g. `colors: { primary: 'var(--color-primary)' }`). Components use Tailwind classes only. This makes rebranding and future dark mode a token-file change rather than a component-wide find-and-replace.
