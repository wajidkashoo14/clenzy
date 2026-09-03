# Executive Summary & Self-Review — Clenzy

## 1. What is being built

A production-grade laundry, dry-cleaning, and home/fabric-care platform for Srinagar, Kashmir, with a self-serve customer storefront and a full operations back office.

**Customers** browse a transparent per-item price list, build a cart, log in with a phone OTP, save addresses, pick a pickup slot and a delivery slot, apply coupons, pay by UPI/card/net banking/wallet or cash on delivery, track their order through a ten-state lifecycle, receive email and SMS updates, and manage everything from an account dashboard.

**Operations** run the business from an admin dashboard: order queues and daily dispatch rosters, agent assignment, post-inspection re-itemization and price revision, cancellations and refunds, catalog and pricing management, coupons, service areas (including a one-click "pause area" for snow closures), slot capacity, staff, reviews, leads, content, and reports.

**Stack:** Next.js 15 + React 19 + TypeScript + Tailwind (web) · Express 5 + TypeScript + Mongoose (API) · MongoDB Atlas · Razorpay · MSG91 · Resend · Google Maps · Cloudinary · Sentry · Vercel + Railway.

**Differentiator vs. the reference site:** the reference (wewash.co.in) appears to run on a lead-capture-and-quote model (form, phone, or WhatsApp, with pricing confirmed later). Clenzy builds the full self-serve cart-and-checkout flow _while keeping_ an admin-adjustable final price, so ops can still correct the estimate after physically inspecting garments. That's the honest way to offer transparent online pricing in a business where the price genuinely depends on the item.

## 2. Feature list

**Public site:** home with serviceability check · service category index and detail pages · transparent pricing page · locations index and per-area landing pages · how it works · about · contact · B2B/commercial enquiry · offers · FAQ · legal pages · fast-path pickup booking form · blog (V2).

**Commerce:** item catalog with search and quantity selection · persistent guest and user carts · server-computed pricing · coupon engine · pin-code serviceability · pickup and delivery slot selection with capacity limits · express turnaround · Razorpay payments · cash on delivery · order confirmation.

**Accounts:** phone-OTP auth · address book with Maps autocomplete · order history · order detail with invoice · order tracking timeline · re-order · notification centre and preferences · reviews · re-clean requests · cancellation and rescheduling.

**Operations:** dashboard with revenue/order/customer stats and a needs-attention queue · order management with filters, search, and bulk actions · daily pickup/delivery roster · agent assignment and agent task view · itemization and price revision with customer approval · refunds · customer management · catalog and pricing management with CSV import/export · coupon management · service-area management · slot management · staff management · review moderation · lead pipeline · built-in CMS · reports with CSV export · settings · audit log.

**Platform:** email and SMS notifications with per-event channel control · order status lifecycle with role-based transitions · SEO with structured data and local landing pages · analytics and error monitoring · WCAG 2.2 AA accessibility · mobile-first UX.

## 3. Deliverables map

| Deliverable requested          | Where it lives                                       |
| ------------------------------ | ---------------------------------------------------- |
| A. Executive summary           | This document §1                                     |
| B. Feature list                | This document §2                                     |
| C. Functionality parity matrix | `PROJECT_REQUIREMENTS.md` §2                         |
| D. Sitemap                     | `PROJECT_REQUIREMENTS.md` §3                         |
| E. User flows                  | `PROJECT_REQUIREMENTS.md` §5                         |
| F. Admin flows                 | `ADMIN_DASHBOARD.md`                                 |
| G. Design system               | `DESIGN_SYSTEM.md`                                   |
| H. Animation system            | `ANIMATION_SYSTEM.md`                                |
| I. Technology architecture     | `ARCHITECTURE.md`                                    |
| J. Database architecture       | `DATABASE.md`                                        |
| K. API architecture            | `API_SPEC.md`                                        |
| L. Authentication              | `ARCHITECTURE.md` §4, `SECURITY.md` §1–2             |
| M. Payment architecture        | `PAYMENTS_AND_NOTIFICATIONS.md` §1                   |
| N. Notification architecture   | `PAYMENTS_AND_NOTIFICATIONS.md` §3                   |
| O. Third-party integrations    | `INTEGRATIONS.md` §1                                 |
| P. Signup/setup instructions   | `INTEGRATIONS.md` §2                                 |
| Q. Security plan               | `SECURITY.md`                                        |
| R. SEO plan                    | `SEO_AND_PERFORMANCE.md` Part A                      |
| S. Performance plan            | `SEO_AND_PERFORMANCE.md` Part B                      |
| T. Testing plan                | `TESTING.md`                                         |
| U. Deployment plan             | `ARCHITECTURE.md` §6, `DEVELOPMENT_PLAN.md` Phase 15 |
| V. GitHub workflow             | `DEVELOPMENT_PLAN.md` (GitHub workflow section)      |
| W. Development roadmap         | `DEVELOPMENT_PLAN.md`                                |
| X. MVP vs V2 vs V3             | `PROJECT_REQUIREMENTS.md` §8                         |
| Y. Documentation structure     | `AI_CODING_RULES.md` §7                              |
| Z. Master prompt               | `../MASTER_PROMPT.md`                                |

## 4. Cost and timeline

**Build:** ~10–14 weeks solo with AI assistance, following the 16 phases. Phases 8 (payments), 12 (admin), and 15 (launch) reliably overrun.

**Running cost at launch:** roughly **₹1,500–4,000/month** in fixed SaaS (most services sit inside free tiers), plus variable costs of ~2% per transaction (Razorpay) and ~₹0.20 per SMS. At 500 orders/month with ~8 SMS each, that's ~₹800/month of SMS. Expect fixed costs to rise to ₹6,000–10,000/month once Atlas moves to M10 and Vercel to Pro — both of which should happen before serious traffic.

**Long-lead items that must start immediately** (they block launch, not development): DLT registration for SMS (2–7 working days), Razorpay KYC (2–7 working days), Google Business Profile verification (1–2 weeks).

---

## 5. Self-review — gaps, risks, and problems

Per the brief's final rule, here is an honest critique of this plan.

### 5.1 Weaknesses in this blueprint

| Gap                                                                                                                                                                                                    | Impact                                                                                                                                                                                     | Mitigation                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The reference site could not be browsed live.** DNS failed, and archive/proxy fallbacks were blocked in the research environment. The analysis rests on search-engine indexing and business listings | Moderate. Confirmed facts (services, model, express tier, booking channels, ozonated positioning, outlets) are well corroborated, but the actual checkout and account flows are unverified | Every unverified claim is labeled; a 30-minute live verification checklist is in `01_REFERENCE_SITE_ANALYSIS.md` §6. Complete it before Phase 3. The build doesn't depend on the answer — the brief specified a full cart flow regardless |
| **Business rules are placeholders.** Minimum order, fees, turnaround, cancellation windows, compensation policy, GST posture                                                                           | High if left unresolved — these are commitments to customers, and the damaged-item policy carries legal exposure                                                                           | All flagged in `PROJECT_REQUIREMENTS.md` §7 and stored in `settings` so they're changeable without a deploy. **Get the damaged/lost item policy in writing from the owner, and GST advice from a CA, before launch**                      |
| **No real content yet.** Copy, photography, price list, facility images, logo                                                                                                                          | Blocks Phase 3 finishing and hurts launch quality more than any technical decision will                                                                                                    | Phase 0 collects it. Do not let AI-generated logo art or stock laundry photography ship as final                                                                                                                                          |
| **Ozone/germ-kill claims.** The reference site's "99.9% germ-free / 0% chemical residue" positioning must not be copied unless Clenzy's process actually supports it                                   | Regulatory (ASCI) and reputational risk                                                                                                                                                    | Only claim what the equipment does. Flagged in the parity matrix                                                                                                                                                                          |
| **Design is specified but not visually designed.** Tokens, component specs, and layout rules exist; actual screen comps do not                                                                         | Medium — an implementer will make a hundred small layout decisions                                                                                                                         | Acceptable for an AI-implemented build if the component gallery (Phase 2) is reviewed before pages are built. Consider commissioning comps for home, catalog, and checkout only                                                           |

### 5.2 Architectural risks

1. **MongoDB transactions are load-bearing.** Slot capacity and coupon usage depend on them, which makes an Atlas replica set mandatory — a standalone Mongo will appear to work in development and oversell slots in production. _Mitigation:_ the concurrency test in `TESTING.md` §4 is not optional; it is the test that proves the design.

2. **Two deployments instead of one.** Splitting Next.js and Express costs CORS setup, cookie-domain configuration, and a network hop on SSR pages. _This is justified_ (cron jobs, webhook reliability, future WebSockets — see `ARCHITECTURE.md` §2), but it's genuinely more moving parts than a single Next.js app, and cookie/CORS issues across subdomains are the most likely early-phase time sink.

3. **`node-cron` in-process is fragile.** Payment reconciliation, order expiry, notification retries, and pickup reminders all run inside the API process. If it sleeps, scales to zero, or runs on two instances, jobs stop or double-fire. _Mitigation:_ never use a sleeping free tier for the API; if you ever scale beyond one instance, move to an external scheduler immediately.

4. **SMS is a single point of failure for login.** If MSG91 credits run out or DLT templates break, nobody can log in. _Mitigation:_ balance alerts, and build an email-login fallback for customers who have an email on file — this is worth adding in Phase 4 rather than after the first outage.

5. **Price revision after inspection is the hardest UX in the product.** A customer who was quoted ₹800 and is asked for ₹1,100 will either approve, argue, or cancel — and the order is already in your facility. The approval flow, the threshold, and the notification copy all need real care. _This is the feature most likely to generate support load and disputes._

6. **Slot capacity is modeled per area per window, but real capacity is a van and a route.** Fifteen orders spread across Rajbagh and Nishat is not the same as fifteen in one lane. _Acceptable simplification for MVP_, but expect ops to want route-aware capacity by V2.

7. **The admin dashboard is scoped like a product, not a feature.** Phase 12 is realistically three phases of work. Under-scoping it is the classic way these projects launch with a storefront nobody can operate behind.

8. **No offline/poor-connectivity handling beyond retries.** Srinagar has genuine connectivity interruptions. A PWA with a cached shell (V2) would matter more here than in most markets.

### 5.3 Things a coding model is likely to get wrong

Watch for these specifically in review:

- Computing totals on the client "just for the preview" and letting them diverge from the server
- Storing rupees as floats, or mixing paise and rupees between layers
- Marking an order paid in the Razorpay success callback instead of waiting for the webhook
- Mounting the webhook route after `express.json()`, breaking raw-body signature verification
- Forgetting the transaction on order placement, or opening it but not including slot capacity
- Populating live prices into order history instead of using the stored snapshot
- Adding role checks in the UI but not on the endpoint
- Using `localStorage` for tokens because it's easier than cookie plumbing
- Building the pricing page as a client component and losing SEO
- Shipping happy-path-only components with no empty or error states
- Skipping the reduced-motion guard
- Adding npm dependencies not in the docs

### 5.4 Open questions for the owner

Before Phase 7 (checkout) and Phase 8 (payments) can be finished:

1. Every value in `PROJECT_REQUIREMENTS.md` §7 — especially minimum order, delivery fee, express surcharge, and turnaround times.
2. **Damaged/lost item compensation policy** — the highest-liability unknown.
3. GST registration status and whether prices are displayed inclusive or exclusive of tax.
4. Cancellation and refund policy wording (also required for the Razorpay-mandated policy page).
5. Which service categories actually launch — the full home-care set (carpet, sofa, curtain, mattress) implies equipment and staffing the business may not have on day one.
6. Serviceable pin codes at launch, and whether pickup and delivery coverage differ.
7. Whether COD launches enabled, and at what cap.
8. Business name confirmation, plus domain and trademark clearance.

### 5.5 What I'd cut if the timeline compresses

In order, the safest things to defer without damaging launch: the blog · the `/business` B2B page (a phone number and an email address will do) · reviews and moderation (collect Google reviews instead) · the offers page (use banners) · express service (launch with one turnaround tier) · coupons beyond a single hardcoded first-order code · the fast-path lead form. **Do not cut:** transactional integrity, payment verification, the admin order queue, notifications, or the legal pages.
