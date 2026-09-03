# Development Plan — Clenzy

Sixteen phases. Build them **in order**. Each phase ends with a working, deployable increment — never a half-finished layer. Do not start a phase until the previous phase's Definition of Done is fully met.

Realistic solo-developer estimate with AI assistance: **10–14 weeks to MVP launch.** Phases 8 (payments), 12 (admin), and 15 (deployment/launch) consistently take longer than expected.

---

## PHASE 0 — Research & business setup _(parallel with everything; start now)_

**Objective:** unblock the long-lead external dependencies before they block the build.
**Tasks:** confirm the brand name, buy the domain · start **DLT registration** and **Razorpay KYC** (both take days) · claim and verify Google Business Profile · confirm every business rule in [PROJECT_REQUIREMENTS.md](PROJECT_REQUIREMENTS.md) §7 with the owner · gather real content (facility photos, service descriptions, the actual price list, outlet addresses, hours) · verify the reference-site assumptions in [01_REFERENCE_SITE_ANALYSIS.md](01_REFERENCE_SITE_ANALYSIS.md) §6 · consult a CA on GST.
**External services:** DLT, Razorpay, domain registrar, Google Business Profile.
**Definition of done:** every value in the business-rules table has a confirmed number; Razorpay KYC submitted; DLT registration submitted; real price list in hand.

---

## PHASE 1 — Project setup

**Objective:** a running monorepo skeleton deployed to staging on day one, so deployment is never a late surprise.
**Tasks:** `git init`, GitHub repo, branch protection · npm workspaces with `apps/web`, `apps/api`, `packages/shared` · TypeScript strict mode everywhere · ESLint + Prettier + Husky + lint-staged · Next.js 15 app scaffolded, Tailwind configured · Express 5 + TypeScript scaffolded with `/health` · Mongoose connection with retry, Atlas dev cluster · Zod-validated env config that crashes on missing values · error-handling middleware, `AppError` class, request-id and logging (pino) · `.env.example` · GitHub Actions CI (typecheck, lint, build) · deploy web to Vercel and api to Railway.
**Dependencies:** none.
**Testing:** CI green; `/health` reachable in production; the deployed web app can call the deployed API.
**Definition of done:** both apps deploy automatically from `main`; a developer can clone, `npm install`, and run both locally with one command.

---

## PHASE 2 — Design system

**Objective:** every UI primitive exists before any page is built, so pages are assembled rather than improvised.
**Tasks:** `tokens.css` with all colors/spacing/radius/shadow custom properties, wired into `tailwind.config.ts` · fonts via `next/font` · `lib/motion.ts` tokens · build `components/ui/`: Button (5 variants × 3 sizes × all states), Input, Textarea, Select, Checkbox, Radio, Switch, OTPInput, QuantityStepper, PincodeInput, DatePicker, Card, Badge, StatusPill, Modal/Sheet, Toast system, Tabs, Accordion, Tooltip, Skeleton, Spinner, EmptyState, ErrorState, Pagination, Breadcrumb, Avatar, Table · layout components: Container, Header, Footer, MobileNav, BottomBar · reduced-motion guard in `globals.css` · a `/dev/components` gallery page (dev-only) showing every component in every state.
**Dependencies:** Phase 1.
**Testing:** component unit tests for interactive primitives; axe clean on the gallery; keyboard operation verified on Modal, Select, Tabs, Accordion.
**Definition of done:** the gallery renders every component in every state; no page in later phases needs a new primitive built from scratch.

---

## PHASE 3 — Public marketing website

**Objective:** the full public site, statically generated, with placeholder catalog data.
**Tasks:** Home (hero + pin-code check + services grid + how-it-works + differentiators + coverage + testimonials + FAQ teaser + CTA) · `/services` and `/services/[slug]` · `/pricing` · `/how-it-works` · `/about` · `/locations` and `/locations/[area]` · `/contact` with a working form · `/business` with an enquiry form · `/faq` · `/offers` · **legal pages (Terms, Privacy, Refund & Cancellation, Delivery)** · `/book` fast-path lead form · 404/500 pages · scroll reveals and hero animation per [ANIMATION_SYSTEM.md](ANIMATION_SYSTEM.md) · responsive at every breakpoint.
**Dependencies:** Phase 2.
**External services:** Cloudinary (images).
**Testing:** Lighthouse ≥90 mobile on home and a service page; axe clean; visual check at 320/375/768/1024/1440.
**Definition of done:** every public page renders with real copy; legal pages published (needed for Razorpay); forms submit to real endpoints.

---

## PHASE 4 — Authentication

**Objective:** working phone-OTP auth end to end, plus admin email login.
**Tasks:** `users`, `refreshTokens`, `otpRequests` models · MSG91 adapter in `integrations/` · OTP request/verify with hashing, expiry, attempt limits, rate limiting · JWT access+refresh with rotation and reuse detection · httpOnly cookie handling and the Next.js refresh proxy · `requireAuth` and `requireRole` middleware · email+password login for staff/admin, bcrypt cost 12 · forgot/reset password · frontend: login page, OTP input with paste + autofill, auth store, protected-route middleware, session restore.
**Dependencies:** Phases 1–2. **DLT approval required for real SMS** — if it hasn't landed, build against a console-logging fake adapter and swap it in later (this is exactly why the adapter layer exists).
**Testing:** the full auth integration suite from [TESTING.md](TESTING.md) §4; rate limits verified; reuse detection verified.
**Definition of done:** a user can log in with a real OTP on a real phone; sessions survive refresh; admin can log in with email; all auth tests pass.

---

## PHASE 5 — Service catalog & pricing

**Objective:** the catalog is real data, and the public site consumes it.
**Tasks:** `serviceCategories`, `serviceItems`, `priceHistory` models · public catalog endpoints with caching · seed script with the real price list from Phase 0 · item picker UI (search, category tabs, item rows, quantity steppers) · `/pricing` page from live data · ISR wiring plus on-demand revalidation · `serviceAreas` model, pin-code check endpoint, and the hero serviceability widget.
**Dependencies:** Phases 3–4.
**Testing:** catalog endpoints; pricing page reflects DB values; serviceability check for in- and out-of-area pin codes.
**Definition of done:** changing a price in the database changes the public site within the revalidation window; no price is hardcoded anywhere.

---

## PHASE 6 — Cart

**Objective:** a reliable cart for both guests and logged-in users.
**Tasks:** Zustand cart store with `localStorage` persistence · `POST /cart/estimate` returning the server-computed breakdown (client never calculates) · cart page and drawer · quantity editing, removal with undo · minimum-order enforcement in the UI · guest→user merge on login · add-to-cart animation and cart badge · empty state.
**Dependencies:** Phase 5.
**Testing:** cart store unit tests including merge conflicts; estimate endpoint pricing tests; persistence across reload.
**Definition of done:** cart survives reload and login; every total displayed came from the server.

---

## PHASE 7 — Checkout (no payment yet)

**Objective:** the complete order-placement flow, ending at a COD order.
**Tasks:** `addresses` model + CRUD + Google Places autocomplete + map pin + serviceability validation · `slotTemplates`/`slotCapacity` models, slot availability endpoint, cutoff logic · `coupons` + validation endpoint · checkout UI (address → pickup slot → delivery slot → coupon → review), one step per screen on mobile · `orders` model and `POST /orders` **inside a transaction** with server-side re-pricing, capacity decrement, and coupon increment · idempotency keys · order confirmation page.
**Dependencies:** Phase 6.
**External services:** Google Maps.
**Testing:** the full order-placement integration suite including the **20-concurrent-orders capacity test**; every failure path returns the right code and writes nothing.
**Definition of done:** a COD order can be placed end to end; concurrency test passes; no partial writes on any failure.

---

## PHASE 8 — Payments

**Objective:** prepaid orders, verified server-side. **Budget more time than feels necessary.**
**Tasks:** Razorpay adapter · `payments` and `webhookEvents` models · server-side Razorpay order creation for the exact computed amount · Razorpay Checkout on the frontend, loaded only on this route · `/checkout/processing` polling page · **webhook endpoint with raw-body signature verification, mounted before `express.json()`** · idempotent event processing · payment-failed retry flow · abandoned-order expiry cron · **payment reconciliation cron** · refund service (full and partial), admin-only · payment status on order pages.
**Dependencies:** Phase 7; Razorpay test keys (KYC not required for test mode).
**Testing:** the entire payment checklist in [TESTING.md](TESTING.md) §6 — every item, including tampering and duplicate webhooks.
**Definition of done:** a prepaid order completes via webhook confirmation; a tampered amount is rejected; duplicate webhooks process once; refunds work; the reconciliation job recovers an order whose webhook never arrived.

---

## PHASE 9 — Order lifecycle & management

**Objective:** orders can move through their full life, with rules enforced.
**Tasks:** the status transition map and a single `changeStatus()` service that all callers use · status history · customer actions: cancel, reschedule, approve price revision, request re-clean · slot release and coupon reversal on cancellation · admin order list/detail with status updates, agent assignment, itemization editing, internal notes · the price-revision approval flow · agent endpoints and a mobile-friendly agent task view · order tracking page with the timeline.
**Dependencies:** Phase 8.
**Testing:** every legal and illegal transition; permission matrix per role; cancellation side effects.
**Definition of done:** an order can be driven from `PLACED` to `COMPLETED` by admin and agent actions, and every illegal transition is rejected server-side.

---

## PHASE 10 — Notifications

**Objective:** customers are informed at the right moments, at controlled cost.
**Tasks:** `notifications` model · `NotificationService` with template registry and channel resolution · Resend adapter + React Email templates · MSG91 transactional adapter with DLT template ids · trigger hooks on each lifecycle event per the matrix · preference handling and admin channel toggles · retry cron with backoff · in-app notification center and unread badge · pickup-reminder scheduled job.
**Dependencies:** Phase 9; DLT templates approved.
**Testing:** each event fires the correct channel set; opt-outs respected; retries work; failures don't break the request path.
**Definition of done:** placing a real order delivers a real SMS and email; the notification matrix is fully implemented and toggleable.

---

## PHASE 11 — Customer dashboard

**Objective:** the account area.
**Tasks:** `/account` overview with the active-order card · order history with filters and pagination · order detail with itemization and invoice PDF · **re-order** · address management UI · profile and notification preferences · notification center · review submission after delivery.
**Dependencies:** Phases 9–10.
**Testing:** ownership enforcement (user A cannot see user B's orders); pagination; all empty and loading states.
**Definition of done:** a customer can manage everything about their orders without contacting support.

---

## PHASE 12 — Admin dashboard

**Objective:** ops can run the business from the platform. **This is a large phase — treat it as three.**
**12a — Operations:** dashboard stats and charts, needs-attention queue, order list/detail/filters/search, today's roster, agent assignment, manual order creation.
**12b — Catalog & config:** categories, items, pricing grid with CSV import/export, coupons, service areas with pause toggle, slot templates and capacity, staff management.
**12c — Content & reports:** FAQs, banners, testimonials, review moderation, leads pipeline, reports with CSV export, settings, audit log viewer.
**Dependencies:** Phases 9–11.
**Testing:** RBAC on every endpoint (customer token → 403); audit logs written on every mutation; admin usable at 375px for order and roster screens.
**Definition of done:** the owner can run a full day of operations — including changing prices, pausing an area, and issuing a refund — without a developer.

---

## PHASE 13 — SEO & analytics

**Objective:** the site is discoverable and measurable.
**Tasks:** `generateMetadata` on every route · JSON-LD builders (LocalBusiness, Service, FAQPage, BreadcrumbList, Organization) · dynamic sitemap and robots · dynamic OG images · GA4 with consent gating and ecommerce events · Search Console verification and sitemap submission · unique content on each location page · internal linking pass · Vercel Analytics.
**Dependencies:** Phase 3 (and content from Phase 0).
**Testing:** Rich Results Test on each schema type; no duplicate titles; Lighthouse SEO 100; sitemap covers every public route and excludes private ones.
**Definition of done:** every public page has unique metadata and valid structured data; GA4 records a test purchase event.

---

## PHASE 14 — Testing, hardening & accessibility

**Objective:** close the gaps before real customers arrive.
**Tasks:** raise coverage to target on the critical areas · Playwright critical journeys · Lighthouse CI and bundle budgets in the pipeline · full security checklist from [SECURITY.md](SECURITY.md) §11 · OWASP ZAP baseline scan · manual keyboard and screen-reader passes · real-device testing on low-end Android and iPhone · load test on slot concurrency · fix everything found.
**Dependencies:** Phases 1–13.
**Definition of done:** every box in the security checklist is ticked; critical E2E journeys pass; Lighthouse targets met; no serious axe violations.

---

## PHASE 15 — Production deployment & launch

**Objective:** live, monitored, and recoverable.
**Tasks:** production Atlas cluster (M10+ with backups) with a restricted IP allowlist · production env vars everywhere · **Razorpay live keys and live webhook** · DNS, SSL, `www` redirect · Sentry with source maps and alerts · uptime monitoring · backup job verified **by performing a restore** · seed production catalog, areas, slots, and settings · create the real admin account and rotate the seed credentials · **place a real ₹1 order end to end, then refund it** · Google Business Profile live · soft launch to a small group before promoting.
**Dependencies:** Phase 14; Razorpay KYC approved.
**Definition of done:** a real customer can place a real paid order and receive real notifications; monitoring alerts work; a tested backup exists; the owner has admin access and knows how to use it.

---

# GitHub workflow

## Branches

- **`main`** — always deployable, protected, auto-deploys to production. No direct pushes, ever.
- **`develop`** — integration branch, auto-deploys to staging.
- **`feature/<phase>-<slug>`** — e.g. `feature/08-razorpay-webhooks`. Branch from `develop`.
- **`fix/<slug>`**, **`hotfix/<slug>`** — hotfixes branch from `main` and merge to both `main` and `develop`.

Keep branches short-lived (under ~3 days). Long-lived branches produce painful merges and hide broken work.

## Commits

Conventional Commits: `feat(checkout): add coupon validation`, `fix(payments): verify webhook signature on raw body`, `docs(api): document refund endpoint`. Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`. One logical change per commit; commit messages explain **why**, not what.

## Pull requests

Every change goes through a PR into `develop`. The PR description states what changed, which phase and doc section it implements, how it was tested, and anything the reviewer should look at closely. Required to merge: CI green (typecheck, lint, tests, build, bundle budget, security scan), a passing preview deployment, and at least one review — **including when an AI wrote the code; a human reads every diff that touches payments, auth, or data models.**

Keep PRs small — under ~400 changed lines where possible. A 3,000-line PR is not reviewed, it's rubber-stamped.

## Releases

Tag `main` with semantic versions (`v0.1.0` at first staging deploy, `v1.0.0` at launch). Maintain a `CHANGELOG.md`. Deploy to staging first, always.

## Issues & tracking

One issue per task from this plan, labeled by phase (`phase-08`) and type (`feature`, `bug`, `security`, `docs`). Reference issues in PRs (`Closes #42`). Use a simple project board: Backlog → In progress → Review → Done.

## Secrets

Repository secrets in GitHub Actions; environment variables in Vercel/Railway. **Never in the repo, never in an issue, never in a PR description, never in a screenshot.** `gitleaks` runs in CI and as a pre-commit hook.

## How an AI coding model should work with GitHub safely

1. **Never push directly to `main` or `develop`.** Always a feature branch and a PR.
2. **Never force-push** a shared branch.
3. **Never commit `.env`, credentials, or generated secrets.** Check `git status` before every commit and read what's staged.
4. **Never run destructive git commands** (`reset --hard`, `clean -fd`, branch deletion) without the human explicitly asking — and never as a way to escape a merge conflict. Resolve conflicts properly.
5. **Commit working increments,** not broken checkpoints. If tests fail, fix them before committing.
6. **One phase per branch**, one logical change per commit.
7. **Never modify CI configuration, branch protection, or deployment settings** without asking.
8. **Never merge your own PR** when it touches payments, auth, or data models — a human reviews those.
9. If a task requires changing something outside the current phase's scope, **stop and ask** rather than expanding the diff.
10. Keep `docs/` updated in the same PR as the code that changes behaviour — a doc that lies is worse than no doc.
