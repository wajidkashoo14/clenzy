# Project Requirements — Clenzy

## 1. Business summary

Clenzy is a direct-to-consumer laundry, dry-cleaning, and home/fabric-care platform. Customers browse a transparent per-item price list, build a cart, choose a pickup slot and a delivery slot, pay online or on delivery, and track their order through a status timeline. Operations staff run the business from an admin dashboard: managing orders, assigning pickups/deliveries, adjusting prices after physical inspection, handling cancellations and refunds, and managing the service catalog, coupons, and serviceable areas.

- **Launch market:** Srinagar, Kashmir (J&K, India). Architecture must support additional cities without code changes — city/area/pin-code serviceability is data, not code.
- **Primary device:** Mobile. Assume 70%+ of traffic is mobile; design mobile-first.
- **Primary language:** English at launch. Copy should be stored in a way that doesn't block adding Urdu/Hindi later (V3), but do **not** build i18n machinery in MVP.
- **Business model:** Clenzy operates its own facility and delivery staff (not a marketplace of third-party partners).

### Brand name confirmation needed

"Clenzy" is the working name (matches the project folder). **Confirm before Phase 2:** `.com`/`.in` domain availability, Indian trademark search (Class 37 — laundry/cleaning services), and social handle availability. All design tokens and components should reference brand via CSS variables and a single `brand.ts` config so a rename is a one-file change.

## 2. Functionality parity matrix

Priority key: **P0** = MVP blocker, **P1** = launch-desirable, **P2** = post-launch (V2), **P3** = V3/future.
Source key: **[C]** = confirmed on reference site, **[A]** = assumption about reference site (see [01_REFERENCE_SITE_ANALYSIS.md](01_REFERENCE_SITE_ANALYSIS.md)), **[+]** = Clenzy enhancement not evidenced on reference site.

| Reference Functionality                  | What It Does                                | Our Version                                                                                                                                                                                     | Priority             | Required Technology/Service                   | Implementation Notes                                                                                                                                                      |
| ---------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Marketing homepage **[C]**               | Communicates value props, drives to booking | Home page with hero, service grid, how-it-works, differentiators, coverage, testimonials, FAQ teaser, CTA band                                                                                  | P0                   | Next.js SSG + Tailwind + Framer Motion        | Statically generated; content sourced from DB-backed CMS collections so ops can edit without deploys                                                                      |
| Ozonated-cleaning tech story **[C]**     | Differentiator narrative                    | Our own process/technology story page + homepage section. **Do not copy WeWash's ozone claims** — only claim what Clenzy's actual equipment does. Business owner must supply real process facts | P0                   | Static content                                | Making an unverified "kills 99.9% of germs" claim is a legal/ASCI risk. Flag to owner                                                                                     |
| Service catalog **[C]**                  | Lists service categories                    | `/services` index + `/services/[slug]` detail pages for each category                                                                                                                           | P0                   | Next.js ISR, MongoDB                          | Categories: laundry (wash & fold), wash & iron, dry cleaning, steam ironing, shoe cleaning, bag cleaning, carpet, sofa, curtain, mattress, pheran/pashmina specialty care |
| Per-item price list **[A]**              | Shows what things cost                      | Public, filterable price list at `/pricing`, plus inline pricing inside the item picker                                                                                                         | P0                   | MongoDB `serviceItems`                        | Prices are DB rows, never hardcoded. See [DATABASE.md](DATABASE.md)                                                                                                       |
| "Schedule Pickup" lead form **[C]**      | Captures name/phone/address/slot            | Kept as a **fast-path CTA** ("Book a pickup in 30 seconds") that creates a `lead`, alongside the full cart flow                                                                                 | P1                   | MongoDB `leads`, SMS notify                   | Real value: converts users unwilling to itemize. Ops calls back to itemize                                                                                                |
| Cart with quantities **[A/+]**           | Build an order of items                     | Full cart: add/remove items, quantity steppers, live subtotal, persisted for logged-out users (localStorage) and merged on login                                                                | P0                   | Zustand + localStorage + server cart on login | See flow §5                                                                                                                                                               |
| Serviceability check **[A]**             | Confirms they deliver to you                | Pin-code/area check on homepage hero and enforced at checkout                                                                                                                                   | P0                   | MongoDB `serviceAreas`                        | Out-of-area → capture email/phone for "notify me when we launch here"                                                                                                     |
| Pickup & delivery slot selection **[C]** | Choose when                                 | Date + time-window pickers for pickup and delivery, with capacity limits per slot                                                                                                               | P0                   | MongoDB `slotTemplates` + capacity counters   | Slots generated from admin-configured templates, not hardcoded                                                                                                            |
| Express / 2-hour service **[C]**         | Faster turnaround for a fee                 | "Express" turnaround option per order with surcharge, availability restricted by area + cutoff time                                                                                             | P1                   | Order field + pricing rule                    | Clenzy version: express = same-day/next-day rather than 2-hour, given Srinagar logistics. **Confirm with owner**                                                          |
| Phone booking **[C]**                    | Call to order                               | Click-to-call in header/footer/mobile bottom bar; ops can create orders manually in admin                                                                                                       | P0                   | `tel:` links + admin manual order creation    |                                                                                                                                                                           |
| WhatsApp booking **[C]**                 | Message to order                            | WhatsApp deep link (`wa.me`) + WhatsApp Business API for outbound order notifications                                                                                                           | P1 (link) / P2 (API) | Gupshup/Interakt WhatsApp BSP                 | Link is free and P0-cheap; the API costs money — see [INTEGRATIONS.md](INTEGRATIONS.md)                                                                                   |
| Authentication **[A]**                   | Customer accounts                           | Phone-OTP-first login/signup (India standard), optional email/password, JWT access+refresh in httpOnly cookies                                                                                  | P0                   | MSG91 OTP + custom JWT                        | See [SECURITY.md](SECURITY.md)                                                                                                                                            |
| Address management **[A]**               | Save home/work addresses                    | CRUD addresses, label (Home/Work/Other), map pin + landmark, default address, serviceability validation on save                                                                                 | P0                   | Google Maps Places + Geocoding                | Landmark field matters a lot in Indian addressing                                                                                                                         |
| Checkout **[A]**                         | Review + pay                                | Single-page checkout: address → pickup slot → delivery slot → coupon → payment method → review → place order                                                                                    | P0                   | Next.js + Express                             | See flow §5                                                                                                                                                               |
| Online payment **[C]**                   | Card/UPI/wallet/netbanking                  | Razorpay Checkout with server-side order creation and webhook-based verification                                                                                                                | P0                   | Razorpay                                      | **Never trust client-side payment success.** See [PAYMENTS_AND_NOTIFICATIONS.md](PAYMENTS_AND_NOTIFICATIONS.md)                                                           |
| Cash on delivery **[C]**                 | Pay at pickup/delivery                      | COD as a payment method, with per-order COD eligibility rules (e.g., cap by order value, disable for repeat no-shows)                                                                           | P0                   | Order field                                   |                                                                                                                                                                           |
| Coupons / first-order discount **[C]**   | Promotional discounts                       | Full coupon engine: %/flat, min order, max discount, expiry, usage limits, per-customer limits, first-order-only, service/category restrictions                                                 | P1                   | MongoDB `coupons`                             |                                                                                                                                                                           |
| Order confirmation **[A]**               | Reassurance + reference                     | Confirmation page with order number, itemized summary, slots, and next-steps; plus email/SMS                                                                                                    | P0                   | —                                             |                                                                                                                                                                           |
| Order tracking **[A]**                   | Where's my order                            | Status timeline page with 10-state lifecycle, ETA, assigned agent name/phone when out for pickup/delivery                                                                                       | P0                   | Polling (MVP) → WebSocket (V2)                | See [PAYMENTS_AND_NOTIFICATIONS.md](PAYMENTS_AND_NOTIFICATIONS.md) §Order lifecycle                                                                                       |
| Order history **[A]**                    | Past orders                                 | Paginated list in customer dashboard with filters, re-order button                                                                                                                              | P0                   | —                                             | "Re-order" is high-value for a repeat-purchase business                                                                                                                   |
| Notifications **[A]**                    | Keep customer informed                      | Email + SMS at key milestones; WhatsApp in V2; in-app notification center                                                                                                                       | P0 (email+SMS)       | Resend + MSG91                                | Cost-controlled matrix in [PAYMENTS_AND_NOTIFICATIONS.md](PAYMENTS_AND_NOTIFICATIONS.md)                                                                                  |
| Re-clean guarantee **[C]**               | Free re-clean if unhappy                    | "Request re-clean" action on delivered orders within N days, creating a linked re-clean order at ₹0                                                                                             | P1                   | Order relation field                          | **Confirm N (days) with owner**                                                                                                                                           |
| Reviews / testimonials **[A]**           | Social proof                                | Post-delivery rating (1–5) + optional comment, admin-moderated before appearing on site                                                                                                         | P1                   | MongoDB `reviews`                             | Only allow reviews from customers with a DELIVERED order — prevents fake reviews                                                                                          |
| FAQs **[A]**                             | Reduce support load                         | FAQ page with categories + accordion, admin-editable, FAQPage schema.org markup                                                                                                                 | P1                   | MongoDB `faqs`                                |                                                                                                                                                                           |
| Contact **[A]**                          | Reach the business                          | Contact page: form, phone, WhatsApp, email, outlet addresses + embedded map, hours                                                                                                              | P0                   | Form → DB + email notify                      |                                                                                                                                                                           |
| About / brand story **[C]**              | Trust                                       | About page: story, process, facility, team, quality standards                                                                                                                                   | P1                   | Static/CMS                                    |                                                                                                                                                                           |
| Locations / outlets **[C]**              | Where they operate                          | `/locations` index + `/locations/[area]` pages (Srinagar areas) — major local-SEO asset                                                                                                         | P1                   | MongoDB `serviceAreas`                        | See [SEO_AND_PERFORMANCE.md](SEO_AND_PERFORMANCE.md)                                                                                                                      |
| B2B / commercial **[C]**                 | Hotel/hospitality line                      | `/business` page with an enquiry form (not a self-serve flow)                                                                                                                                   | P1                   | Form → DB + email                             | Kashmir has a large hotel/houseboat/guesthouse market — genuinely valuable here                                                                                           |
| Blog **[A]**                             | SEO + trust                                 | `/blog` + `/blog/[slug]`, admin-authored                                                                                                                                                        | P2                   | MongoDB `posts`                               | Deprioritized: content is a marketing-effort cost, not just a build cost                                                                                                  |
| Legal pages **[A]**                      | Compliance                                  | Terms, Privacy, Refund & Cancellation, Shipping/Delivery policy                                                                                                                                 | P0                   | Static                                        | Razorpay **requires** these pages to exist to approve an account                                                                                                          |
| Recurring/subscription pickup **[C]**    | Weekly/bi-weekly plans                      | Subscription plans with auto-scheduled pickups                                                                                                                                                  | P2                   | Razorpay Subscriptions or manual scheduling   | Reference site handles this manually; don't build self-serve subscriptions in MVP                                                                                         |
| Referral program **[+]**                 | Growth loop                                 | Give ₹X / get ₹X referral codes                                                                                                                                                                 | P2                   | Coupon engine extension                       |                                                                                                                                                                           |
| Loyalty wallet/credits **[+]**           | Retention + refunds                         | Store credit balance usable at checkout; also the cheapest refund mechanism                                                                                                                     | P2                   | MongoDB `walletTransactions`                  | Useful for goodwill compensation without gateway refund fees                                                                                                              |
| Live chat support **[+]**                | Support                                     | WhatsApp link in MVP; embedded chat widget later                                                                                                                                                | P2                   | —                                             | Don't pay for a chat SaaS at launch                                                                                                                                       |
| Native mobile apps **[+]**               | App-store presence                          | PWA (installable, offline-capable shell) in V2; native apps V3 only if data justifies                                                                                                           | P3                   | —                                             |                                                                                                                                                                           |

## 3. Sitemap

### Public / marketing

| Route                                                      | Purpose                                                                                                                                             | Rendering  | Reasoning                                                      |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------- |
| `/`                                                        | Homepage                                                                                                                                            | SSG + ISR  | Primary landing + conversion                                   |
| `/services`                                                | Service category index                                                                                                                              | SSG + ISR  | Discovery hub, internal-link hub for SEO                       |
| `/services/[slug]`                                         | Category detail (laundry, dry-cleaning, ironing, shoe-cleaning, carpet-cleaning, curtain-cleaning, sofa-cleaning, mattress-cleaning, pashmina-care) | SSG + ISR  | One page per commercial keyword; each ranks separately         |
| `/pricing`                                                 | Full transparent price list                                                                                                                         | SSG + ISR  | Trust-builder and a top-searched query in this category        |
| `/book`                                                    | Fast-path pickup booking (lead form)                                                                                                                | Client     | For users who won't itemize; mirrors reference site's core CTA |
| `/locations`                                               | Coverage index                                                                                                                                      | SSG        | Local-SEO hub                                                  |
| `/locations/[area]`                                        | e.g. Rajbagh, Lal Chowk, Hyderpora, Bemina, Sanat Nagar, Nishat, Dalgate                                                                            | SSG        | Ranks "laundry service in <area> Srinagar"                     |
| `/about`                                                   | Brand story, facility, standards                                                                                                                    | SSG        | Trust                                                          |
| `/how-it-works`                                            | Process explainer                                                                                                                                   | SSG        | Reduces friction for first-timers                              |
| `/business`                                                | B2B/commercial enquiry                                                                                                                              | SSG + form | Hotels, houseboats, guesthouses, hospitals                     |
| `/offers`                                                  | Active promotions                                                                                                                                   | ISR        | Campaign landing target                                        |
| `/faq`                                                     | FAQs                                                                                                                                                | SSG + ISR  | Support deflection + FAQ schema                                |
| `/contact`                                                 | Contact + outlets                                                                                                                                   | SSG        | NAP consistency for local SEO                                  |
| `/blog`, `/blog/[slug]`                                    | Content marketing                                                                                                                                   | SSG + ISR  | V2                                                             |
| `/terms`, `/privacy`, `/refund-policy`, `/delivery-policy` | Legal                                                                                                                                               | SSG        | Required by Razorpay onboarding                                |

### Auth

| Route                     | Purpose                                                                         |
| ------------------------- | ------------------------------------------------------------------------------- |
| `/login`                  | Phone OTP (primary) / email+password (secondary)                                |
| `/signup`                 | Registration — in practice merged into `/login` since OTP auto-creates accounts |
| `/forgot-password`        | Email-password reset flow only (OTP users don't need it)                        |
| `/reset-password/[token]` | Token-based reset                                                               |

### Commerce (auth required at checkout, not before)

| Route                               | Purpose                                                              |
| ----------------------------------- | -------------------------------------------------------------------- |
| `/cart`                             | Cart review, quantity edit, coupon preview                           |
| `/checkout`                         | Address → slots → coupon → payment → review                          |
| `/checkout/processing`              | Payment-pending interstitial (polls server for webhook confirmation) |
| `/order/confirmation/[orderNumber]` | Success page                                                         |
| `/order/failed`                     | Payment failure with retry                                           |

### Customer dashboard (auth required)

| Route                                 | Purpose                                                                |
| ------------------------------------- | ---------------------------------------------------------------------- |
| `/account`                            | Overview: active order card, quick re-order, saved addresses           |
| `/account/orders`                     | Order history, filters, pagination                                     |
| `/account/orders/[orderNumber]`       | Order detail + itemization + invoice download                          |
| `/account/orders/[orderNumber]/track` | Status timeline (can be merged into detail page — recommended for MVP) |
| `/account/addresses`                  | Address CRUD                                                           |
| `/account/profile`                    | Name, phone, email, password, notification preferences                 |
| `/account/notifications`              | In-app notification center                                             |
| `/account/wallet`                     | Store credit (V2)                                                      |
| `/account/support`                    | Raise/track support tickets (V2; MVP = WhatsApp/phone link)            |

### Admin (role-gated, same Next.js app under `/admin`)

See [ADMIN_DASHBOARD.md](ADMIN_DASHBOARD.md) for the full spec. Routes: `/admin`, `/admin/orders`, `/admin/orders/[id]`, `/admin/customers`, `/admin/customers/[id]`, `/admin/services`, `/admin/services/items`, `/admin/pricing`, `/admin/coupons`, `/admin/areas`, `/admin/slots`, `/admin/staff`, `/admin/reviews`, `/admin/leads`, `/admin/content/*`, `/admin/reports`, `/admin/settings`.

### Utility

`/404`, `/500`, `/offline` (PWA, V2), `/sitemap.xml`, `/robots.txt`, `/opengraph-image`.

## 4. Roles

| Role         | Can do                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `guest`      | Browse, build a cart, check serviceability, submit lead/contact/B2B forms                                                             |
| `customer`   | Everything guest can + place orders, manage addresses, track orders, review, request re-clean/cancellation                            |
| `agent`      | Field staff: see assigned pickups/deliveries, mark picked up / delivered, capture item counts and photos at pickup                    |
| `staff`      | Facility/ops: advance order statuses through processing, adjust itemization and price (subject to approval rules), add internal notes |
| `admin`      | Everything staff can + manage catalog, pricing, coupons, areas, slots, content, refunds, and view reports                             |
| `superadmin` | Everything admin can + manage admin users/roles, view audit log, change platform settings                                             |

## 5. Customer user flow (detailed)

### 5.1 Happy path

**Step 1 — Land.** Homepage hero states the offer (premium fabric care, free pickup & delivery in Srinagar) with two CTAs: "Book a pickup" (fast path) and "See prices" (browse path). A pin-code/area field in the hero checks serviceability immediately.
_Validation:_ pin code must be 6 digits and match `serviceAreas`. _Out-of-area state:_ replace CTA with "We're not in your area yet — get notified" email capture, and still allow browsing.

**Step 2 — Choose service.** `/services` grid → category page. Each category page explains the process, turnaround, care standards, and shows its item list with prices and an "Add" control.

**Step 3–5 — Select items, quantity, see price.** The item picker is the core commerce UI: searchable item list grouped by category, each row = item name + unit price + quantity stepper. Running total is pinned (bottom bar on mobile, sticky sidebar on desktop).
_Validation:_ quantity 1–99 per item; item must be active and available in the customer's area.
_Empty state:_ "No items yet — pick from the list to start your order."
_Note shown to the user:_ "Final price is confirmed after our team inspects your items at pickup. You'll be notified of any change before we proceed." — this is essential honesty for garment care and matches how the industry actually works.

**Step 6 — Cart.** Review items, edit quantities, remove, see subtotal, estimated delivery fee, express toggle, and coupon field. Cart persists in localStorage for guests and syncs to server on login.
_Validation:_ cart must meet minimum order value before checkout is enabled. _Empty state:_ illustrated empty cart with "Browse services" CTA.

**Step 7 — Auth.** Checkout requires login. Phone OTP: enter number → 6-digit OTP → verified → account auto-created if new (name captured after). Guest cart merges into the user's server-side cart on login.
_Failure states:_ OTP incorrect (3 attempts, then 60s cooldown), OTP expired (5 min), SMS delivery failure (offer "call me instead" fallback / retry), rate-limited number.

**Step 8 — Address.** Choose a saved address or add new: Google Places autocomplete + map pin + house/flat, building, area, landmark, pin code, label. Serviceability is re-validated server-side.
_Failure state:_ address outside service area → block with an explanation and offer the nearest serviceable alternative or notify-me capture.

**Step 9 — Pickup slot.** Date picker (next N days, configurable) + time windows (e.g. 9–11, 11–1, 2–4, 4–6, 6–8). Slots show remaining capacity; full slots are disabled with "Fully booked."
_Validation:_ cannot pick a slot whose cutoff has passed; same-day pickup only before the daily cutoff time.

**Step 10 — Delivery slot.** Earliest selectable delivery date = pickup date + turnaround days for the slowest item in the cart (or express turnaround if express selected). Customer picks date + window.
_Validation:_ server recomputes and rejects impossible combinations rather than trusting the client.

**Step 11 — Coupon.** Apply code → server validates (existence, active window, min order, usage limits, per-customer limit, first-order-only, applicable services) and returns the recalculated total.
_Failure states:_ invalid code, expired, min-order not met (tell them how much more to add), already used, not applicable to these items.

**Step 12 — Review.** Full breakdown: items, subtotal, express surcharge, delivery fee, coupon discount, taxes (see §7 GST), grand total, both slots, address, payment method.

**Step 13 — Pay.** Choose online (Razorpay: UPI/card/netbanking/wallet) or COD.

- Online: server creates a Razorpay order → client opens Checkout → on client success the UI goes to `/checkout/processing` and **polls the server**, which only marks the order paid after verifying the webhook/signature server-side.
- COD: order is placed immediately with `paymentStatus: PENDING`.
  _Failure states:_ payment failed (retry with same order), payment abandoned (order stays `PENDING_PAYMENT` and expires after 30 min via a cleanup job), duplicate payment (detected by idempotency key; auto-flag for refund).

**Step 14 — Confirmation.** Order number, summary, what happens next, add-to-calendar for the pickup slot, plus email + SMS.

**Step 15–16 — Track & be notified.** Status timeline; notifications at each milestone (see notification matrix).

**Step 17 — Completion.** Delivered → auto-transitions to `COMPLETED` after N days (configurable, default 3) if no re-clean/complaint is raised.

**Step 18 — Review.** Post-delivery prompt (in-app + one email) for a 1–5 rating and comment; admin-moderated before publishing.

### 5.2 Non-happy paths (all must be built)

| Scenario                            | Behavior                                                                                                                                                                                                                   |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cancellation by customer**        | Allowed self-serve until `PICKED_UP`. After pickup, requires contacting support (creates a cancellation request for admin approval). Prepaid + cancelled before pickup → full refund. **Confirm exact policy with owner.** |
| **Rescheduling**                    | Customer can reschedule pickup (before `PICKED_UP`) or delivery (before `OUT_FOR_DELIVERY`), max 2 times per order, subject to slot capacity                                                                               |
| **Failed pickup**                   | Agent marks `PICKUP_FAILED` with reason (customer unavailable / wrong address / items not ready). Auto-notify customer with a one-tap reschedule link. After 2 failures, order is auto-cancelled                           |
| **Failed delivery**                 | Same pattern; items return to facility and are held. After N failed attempts, storage policy applies. **Confirm with owner**                                                                                               |
| **Payment failure**                 | Order held as `PENDING_PAYMENT`, retry link valid 30 min, then auto-expire; cart is preserved                                                                                                                              |
| **Price revision after inspection** | Ops updates itemization → if the new total exceeds the original by more than X% (default 10%), the customer must approve via a link before processing continues; otherwise it proceeds and the customer is notified        |
| **Damaged/lost item**               | Admin marks item as damaged/lost, records compensation per policy, triggers partial refund or wallet credit. **Compensation policy must be defined by owner**                                                              |
| **Re-clean request**                | Available N days after delivery; creates a linked zero-value order with `type: RECLEAN`                                                                                                                                    |
| **Out-of-service area**             | Blocked at address save and at checkout, with "notify me" capture                                                                                                                                                          |
| **Below minimum order**             | Checkout blocked with a clear "Add ₹X more" message; alternatively allow with a small-order fee — **owner decision**                                                                                                       |
| **Slot capacity exhausted**         | Slot shown disabled; if capacity is consumed between page load and submit, server rejects and prompts re-selection                                                                                                         |

## 6. Recommended enhancements (not on the reference site)

These are additive, clearly separated per brief rule 19. None are MVP.

1. **Re-order in one tap** from order history (P1 — cheap, high retention value for a repeat-purchase business).
2. **Store-credit wallet** (P2) — doubles as the cheapest refund/goodwill mechanism.
3. **Referral codes** (P2).
4. **Pickup-photo record** — agent photographs items at pickup (P2). Strongly recommended: it is the single best defense against "you damaged my garment" disputes.
5. **PWA install + push notifications** (P2) — much cheaper than SMS at volume.
6. **Kashmir-specific specialty care line** — pheran, pashmina/shahtoosh-adjacent shawls, namda/gabba rugs, carpets (P1 for content, P2 for full workflow). This is genuine local product-market fit the reference site has no equivalent for.
7. **Winter/chillai-kalan seasonal packages** — heavy-woolens bundle pricing (P2).
8. **B2B portal** for hotels/houseboats with monthly invoicing (P3).

## 7. Business logic — decisions required from the owner

The coding model **must not invent** these values. They belong in the `settings` collection and admin UI, but the launch values must come from the business owner. Placeholder defaults are given so development isn't blocked.

| Rule                              | Placeholder default                                                                                                   | Needs owner confirmation                                                                                  |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Minimum order value               | ₹299                                                                                                                  | ✅                                                                                                        |
| Delivery fee                      | Free above ₹499, else ₹49                                                                                             | ✅                                                                                                        |
| Pickup fee                        | Free                                                                                                                  | ✅                                                                                                        |
| Express surcharge                 | +40% of item subtotal, min ₹99                                                                                        | ✅                                                                                                        |
| Standard turnaround               | Laundry 48h, dry clean 72h, home care 72–96h                                                                          | ✅                                                                                                        |
| Express turnaround                | 24h                                                                                                                   | ✅                                                                                                        |
| Daily cutoff for same-day pickup  | 4:00 PM                                                                                                               | ✅                                                                                                        |
| Slot windows                      | 9–11, 11–1, 2–4, 4–6, 6–8                                                                                             | ✅                                                                                                        |
| Slot capacity                     | 15 orders per window                                                                                                  | ✅                                                                                                        |
| Cancellation window (free)        | Any time before `PICKED_UP`                                                                                           | ✅                                                                                                        |
| Refund SLA                        | 5–7 business days to source                                                                                           | ✅                                                                                                        |
| Re-clean window                   | 72 hours after delivery                                                                                               | ✅                                                                                                        |
| Price-revision approval threshold | >10% increase requires customer approval                                                                              | ✅                                                                                                        |
| COD maximum order value           | ₹5,000                                                                                                                | ✅                                                                                                        |
| Damaged/lost item compensation    | Up to 10× the cleaning charge for that item, capped                                                                   | ✅ **High legal exposure — get this in writing**                                                          |
| Unclaimed items policy            | Held 30 days after N failed deliveries                                                                                | ✅                                                                                                        |
| GST                               | Laundry/dry-cleaning services attract GST; whether Clenzy must register depends on turnover threshold and state rules | ✅ **Consult a CA. Build tax as a configurable per-item rate from day one — retrofitting tax is painful** |
| Service days                      | Mon–Sat, closed Sunday?                                                                                               | ✅                                                                                                        |
| Serviceable pin codes at launch   | Srinagar city core                                                                                                    | ✅                                                                                                        |

## 8. MVP vs V2 vs V3

### MVP (launch)

Public site (home, services + detail pages, pricing, locations, about, how-it-works, contact, business, FAQ, legal) · pin-code serviceability · item catalog + cart · phone-OTP auth · address management · pickup/delivery slots · coupons · Razorpay online payment + COD · order placement · order status lifecycle + tracking · email + SMS notifications · customer dashboard (orders, addresses, profile) · admin dashboard (orders, customers, catalog, pricing, coupons, areas, slots, staff, basic reports) · SEO fundamentals · analytics + error monitoring.

### V2

WhatsApp notifications · reviews + moderation · blog/CMS · wallet & store credit · referrals · re-order · PWA + push · pickup photos · agent mobile view · subscriptions/recurring pickups · advanced reports & exports · support tickets · live order tracking over WebSockets.

### V3

Native apps · multi-city + multi-facility routing · B2B portal with invoicing · route optimization for agents · loyalty tiers · Urdu/Hindi localization · inventory/barcode tagging of garments · AI-based garment recognition at pickup.

**Explicitly not in MVP** (avoid over-engineering): microservices, GraphQL, Redis caching, Kubernetes, event sourcing, native apps, multi-language, real-time WebSockets, third-party partner marketplace.
