# Reference Site Analysis — wewash.co.in

## Research method & limitation

This analysis was compiled **without live interactive access** to wewash.co.in: the domain did not resolve from the research environment, and both the Wayback Machine and a text-proxy fallback were blocked/unreachable in the same session. Findings below come from search-engine indexing of the live site (page titles, meta descriptions, and cached snippets), third-party business listings (Justdial), and cross-referencing multiple independent search queries. Every line is tagged:

- **CONFIRMED** — corroborated by at least one indexed snippet or listing.
- **ASSUMPTION** — standard practice for this business model (pickup/delivery garment care, comparable to Tumble, UClean, Zipush, PoshWash, Urban Company's laundry vertical) but not directly observed on wewash.co.in. **Must be verified against the live site or app before the corresponding feature is built.**

**Action item for the human owner:** before Phase 3 of development, open wewash.co.in (and ideally place a real order, or at least fill the pickup form to the payment step) on a normal browser and either confirm or correct each ASSUMPTION item below. A checklist is at the end of this document.

## 1. Company facts (CONFIRMED)

| Fact                      | Detail                                                                                                                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Brand                     | WeWash                                                                                                                                                                                                                         |
| Domain                    | wewash.co.in                                                                                                                                                                                                                   |
| Positioning               | "India's 1st Ozonated Laundry Service"                                                                                                                                                                                         |
| Core technology claim     | Ozone (O₃)-based cleaning — claimed to kill 99.9% of bacteria/viruses/allergens, uses 50–70% less detergent, "0% chemical residue"                                                                                             |
| City                      | Mumbai                                                                                                                                                                                                                         |
| Physical outlets          | Santacruz West (Juhu Road), Bandra West (Hill Road), Versova/Andheri West (Aram Nagar) — 5+ locations cited in one source                                                                                                      |
| Operating hours           | 9:00 AM – 9:00 PM (one source)                                                                                                                                                                                                 |
| Booking channels          | Web form, phone call, WhatsApp message                                                                                                                                                                                         |
| Fulfillment model         | Doorstep pickup → clean at facility → doorstep delivery                                                                                                                                                                        |
| Express tier              | "2-Hour Express Service," select locations, subject to availability                                                                                                                                                            |
| Service guarantee         | Free re-clean if customer is dissatisfied                                                                                                                                                                                      |
| Specialty stain treatment | In-house chemicals formulated for India-specific stains: henna/mehendi, turmeric, spices, ballpoint ink, old/set-in stains                                                                                                     |
| Payment                   | Online (card/wallet) or cash at pickup/delivery                                                                                                                                                                                |
| Recurring service         | Weekly/bi-weekly pickup schedules exist but appear to be arranged by contacting the business, not a self-serve subscription toggle                                                                                             |
| Promotion                 | New-customer discount (50% off first order) referenced in one listing                                                                                                                                                          |
| B2B line                  | Separate "Commercial Laundry Solutions" — hotel/hospitality linen processing at a dedicated Juhu workshop, no outsourcing, in-house chemical manufacturing supplied PAN-India, SOP + inspection checkpoints per linen category |
| Known page paths          | `/`, `/about-us`, `/business`, `/schedule-pickup`, `/services-2/`, `/services/wash-dryclean` (an internal `/admin` path is also indexed — irrelevant to customer-facing analysis and was not accessed)                         |

## 2. Site structure (partially confirmed)

Confirmed top-level areas, by URL:

- **Home** (`/`)
- **About Us** (`/about-us`)
- **Services** (`/services-2/`, with at least one specific service page at `/services/wash-dryclean` — suggests a `/services/[slug]` pattern for individual service categories)
- **Schedule Pickup** (`/schedule-pickup`) — the primary conversion action, distinct from a browsing/cart flow
- **Business / B2B** (`/business`) — a separate commercial (hotel/hospitality) offering

**ASSUMPTION:** Additional standard pages likely exist but weren't independently indexed in search results: Contact, FAQ, Pricing, Locations, Terms, Privacy, Login/Account. Given the site is built around a lead-capture "Schedule Pickup" form (see below) rather than a full e-commerce cart, it's plausible pricing is not published as a self-serve catalog and is instead confirmed by phone/WhatsApp or shown only after form submission.

## 3. Inferred customer journey

**CONFIRMED shape:** WeWash's primary conversion path is lighter-weight than a full e-commerce flow — the site pushes users toward **"Schedule Pickup"** as a single form/CTA, and explicitly offers phone call and WhatsApp as alternative booking channels. This is a common pattern for local on-demand service businesses: capture contact + rough intent first, finalize items/pricing at pickup (the pickup agent or a follow-up call quotes exact pricing after seeing/weighing the items), rather than requiring the customer to price out every garment online before ordering.

**ASSUMPTION — step-by-step reconstruction** (standard for this business model; verify against the live `/schedule-pickup` form):

1. Customer lands on homepage, sees value props (ozonated cleaning, free pickup/delivery, express option) and a primary CTA.
2. Customer either (a) browses `/services-2/` to see service categories (wash & fold, dry cleaning, shoe/bag cleaning per search snippets) or (b) goes straight to Schedule Pickup.
3. On the schedule-pickup form: enters name, phone, address (or pin code first to check serviceability), selects a rough service type, picks a pickup date/time window.
4. Form submits as a **lead**, not a priced order — WeWash's team confirms exact pricing by phone/WhatsApp/at-pickup, since pricing is item-condition-dependent for dry cleaning.
5. Pickup agent collects items, itemizes and prices them in person or via an internal system.
6. Items are cleaned (ozonated wash / dry-clean per category) at the nearest outlet or the Juhu B2B workshop.
7. Delivery back to the customer's doorstep; payment collected online or as cash on delivery if not prepaid.
8. Customer satisfaction guarantee: if dissatisfied, item is re-cleaned free of charge.

**This differs from a full self-serve cart-and-checkout model** (browse → add item quantities → see live price → cart → address → slot → pay → track). It is plausible WeWash uses the lighter lead-capture model above, OR that a fuller self-serve flow exists behind the "Schedule Pickup" page that wasn't visible in search indexing. **This is the single most important thing to verify live**, because it determines whether Clenzy should build a full e-commerce-style cart (as the user's brief requests: "service selection → item/service selection → quantity → pricing → cart → address → pickup/delivery → payment → order confirmation → tracking") or a lighter lead-capture-then-quote model.

**Recommendation for Clenzy (stated up front, revisit after live verification):** Build the **full self-serve cart-and-checkout flow** described in the brief regardless of exactly what WeWash does today. A transparent, self-serve price list is better UX, is what modern competitors (UClean, Tumble) do, and is explicitly what the user asked to build ("functionality parity" is a floor, not a ceiling — the brief also says "if the reference website has a useful feature you haven't mentioned, include it," and a transparent cart is a strict UX improvement over phone-quoted pricing). Keep an **admin-adjustable final price** field on each order (see [DATABASE.md](DATABASE.md)) so ops can still correct the self-serve estimate after visually inspecting items at pickup, mirroring WeWash's real-world pricing model without forcing the customer through a phone call to get a number.

## 4. Functionality behind forms/login (ASSUMPTION — unverifiable without an account)

Not independently confirmed: what a logged-in customer dashboard contains, whether order tracking has live status updates, what notification channels fire post-order, whether there's a referral program, and what the admin/ops tooling looks like internally. All of `docs/PROJECT_REQUIREMENTS.md`'s functionality matrix, the admin dashboard spec, and the order lifecycle are therefore designed from first principles for this business model, not copied from an observed implementation — this is consistent with the brief's instruction to "recreate equivalent functionality with an original design" rather than clone an unseen backend.

## 5. Explicitly NOT invented

Per the brief's rule 19 ("do not invent features the reference site clearly does not have"), the following are **excluded** from the parity matrix as core/MVP items because there's no evidence WeWash has them, and they're listed only under "Recommended Enhancements" in [PROJECT_REQUIREMENTS.md](PROJECT_REQUIREMENTS.md) instead:

- Loyalty/points program
- Multi-city marketplace of third-party laundry partners (WeWash appears to run its own facilities, not a partner marketplace like some competitors)
- Native mobile apps (no confirmed WeWash consumer app was found — a Play Store listing under a similar name turned out to belong to an unrelated European company, WeWash GmbH/Bosch)

## 6. Live-verification checklist

Before or during Phase 3, someone should visit wewash.co.in on a normal connection and confirm/correct:

- [ ] Does `/schedule-pickup` show live, self-serve pricing per item, or is it a lead-capture form with pricing confirmed later?
- [ ] Exact service categories and sub-items (the brief lists laundry, dry cleaning, ironing, shoe cleaning, carpet cleaning, curtain cleaning, sofa cleaning — confirm which of these WeWash actually offers vs. which are Clenzy additions)
- [ ] Is there a customer login/account area, and if so what's in it (order history, saved addresses, saved payment methods)?
- [ ] Is there a real-time order tracking page/status timeline?
- [ ] What SMS/email/WhatsApp messages, if any, does a real order trigger?
- [ ] Coupon/promo code mechanics beyond the "50% off first order" claim
- [ ] Whether a mobile app actually exists for the India service (distinct from the unrelated Bosch/WeWash GmbH app)
- [ ] Full price list for common items (shirt, trouser, saree, suit, bedsheet, etc.)
- [ ] Minimum order value, delivery fee, and express-service surcharge amounts
- [ ] Cancellation/rescheduling policy text (footer or FAQ)
- [ ] Serviceable pin codes/areas beyond the three known outlets
