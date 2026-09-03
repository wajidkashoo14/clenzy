# Technical Architecture — Clenzy

## 1. Stack decision summary

| Layer         | Choice                                                               | Verdict on your preference                    |
| ------------- | -------------------------------------------------------------------- | --------------------------------------------- |
| Frontend      | **Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS 4** | ✅ Keep — correct for SEO-critical commerce   |
| UI primitives | **Radix UI** (headless) + custom components                          | Added — accessibility for free                |
| State         | **Zustand** (cart, UI) + **TanStack Query** (server state)           | Added — do not use Redux here                 |
| Forms         | **React Hook Form + Zod**                                            | Added — Zod schemas shared with the backend   |
| Backend       | **Node.js + Express 5 + TypeScript**                                 | ✅ Keep — see §2 for why this beats Next-only |
| Database      | **MongoDB Atlas + Mongoose**                                         | ✅ Keep — see §3 for the caveat               |
| Auth          | **Custom JWT (access + refresh) with phone-OTP primary**             | See §4                                        |
| Payments      | **Razorpay**                                                         | Best-in-class for India                       |
| Email         | **Resend**                                                           | Simple, generous free tier                    |
| SMS           | **MSG91**                                                            | India-focused, cheap, DLT-compliant           |
| WhatsApp      | **Interakt or Gupshup** (V2)                                         | Deferred to V2 for cost                       |
| Maps          | **Google Maps Platform** (Places + Geocoding + Maps JS)              | Most accurate Indian address data             |
| Media         | **Cloudinary**                                                       | Storage + transformation in one               |
| Analytics     | **Google Analytics 4** + **Vercel Analytics**                        | Free                                          |
| Errors        | **Sentry**                                                           | Free tier is sufficient                       |
| Hosting       | **Vercel** (web) + **Railway or Render** (api) + **Atlas** (db)      | See §6                                        |

## 2. Why a separate Express API rather than Next.js API routes only

Next.js route handlers could technically serve this whole app, and that would mean one deployment instead of two. I'm still recommending your preferred split, for concrete reasons:

- **Background work.** Notification retries, payment-reconciliation sweeps, abandoned-order expiry, and slot-capacity recalculation need scheduled/long-running jobs. A persistent Express process runs `node-cron` trivially; serverless functions need an external scheduler and are awkward for retries.
- **Webhook reliability.** Razorpay webhooks need a stable, always-warm endpoint with raw-body signature verification. This is fiddly on serverless (body parsing, cold starts, execution limits) and trivial on Express.
- **Future real-time.** Live order tracking over WebSockets (V2) needs a stateful server. Vercel can't hold socket connections.
- **Portability.** If Vercel pricing or limits become a problem later, the business logic isn't entangled with a hosting vendor's framework.

**Cost of this choice you must accept:** two deploys, CORS configuration, no automatic type-safety across the network boundary (mitigated by sharing Zod schemas in `packages/shared`), and slightly more latency on server-rendered pages that fetch from the API. All acceptable.

**Where Next.js server code IS still used:** SEO metadata generation, static/ISR rendering of marketing pages (fetching from the API at build/revalidate time), the auth cookie-refresh proxy, sitemap/robots generation, and OG image generation. **No business logic lives in the Next.js layer.**

## 3. MongoDB caveat — read this before Phase 1

MongoDB is a fine choice here and I'm keeping it, but be aware: this application has genuinely relational data (orders ↔ items ↔ prices ↔ coupons ↔ payments) and **money**, which means atomicity matters. Two non-negotiables:

1. **Use MongoDB Atlas (replica set), not a standalone `mongod`.** Multi-document transactions require a replica set. Atlas's free M0 tier is a replica set, so this costs nothing. Order placement + payment record + coupon-usage increment + slot-capacity decrement must happen in **one transaction**, or you will oversell slots and double-count coupon usage under concurrency.
2. **Snapshot prices into orders.** Never reference a live price document from an order. When an order is placed, copy `itemName`, `unitPrice`, `quantity`, and `taxRate` into the order document. Otherwise an admin's price edit silently rewrites the history of past orders and your revenue reports become fiction.

If you would rather use PostgreSQL (which fits this domain more naturally), the whole design ports cleanly and Prisma would be the ORM. But Mongo + Mongoose + Atlas + transactions is entirely workable and you know it — stick with it.

## 4. Authentication approach

**Recommended: custom JWT issued by the Express API, with phone-OTP as the primary credential.**

- **Phone OTP primary.** Indian consumers expect it, it eliminates password reset support load, and the phone number is operationally required anyway (the delivery agent must call the customer).
- **Email + password secondary**, offered for account recovery and for admin/staff logins (admins should NOT be OTP-only — SIM-swap risk on a privileged account).
- **Tokens:** short-lived access JWT (15 min) + long-lived refresh token (30 days, rotating, stored hashed in the DB so it can be revoked). Both delivered as `httpOnly`, `Secure`, `SameSite=Lax` cookies — **never `localStorage`**, which is XSS-readable.
- **Admin sessions:** 8-hour absolute expiry, mandatory re-auth for destructive actions (refunds, price changes), and TOTP 2FA for `admin`/`superadmin` in V2.

**Why not NextAuth/Auth.js?** It's excellent when Next.js _is_ your backend. With a separate Express API it becomes an awkward middleman, and phone-OTP is a custom provider anyway. **Why not Firebase Auth?** Its free SMS OTP tier is attractive, but it puts identity in a different vendor from your user data, complicates the JWT story, and Firebase phone auth in India has had DLT/deliverability quirks. Custom + MSG91 keeps one source of truth. Full detail in [SECURITY.md](SECURITY.md).

## 5. Project structure

npm workspaces monorepo — no Turborepo/Nx at MVP (added complexity, no payoff at this size; add Turborepo in V2 if build times hurt).

```
clenzy/
├── apps/
│   ├── web/                       # Next.js 15 — public site + customer dashboard + admin UI
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (marketing)/          # Route group: public pages, static/ISR
│   │   │   │   │   ├── page.tsx                  # Home
│   │   │   │   │   ├── services/[slug]/page.tsx
│   │   │   │   │   ├── pricing/page.tsx
│   │   │   │   │   ├── locations/[area]/page.tsx
│   │   │   │   │   └── ...
│   │   │   │   ├── (shop)/               # Cart + checkout, client-heavy
│   │   │   │   ├── (account)/            # Customer dashboard, auth-gated
│   │   │   │   ├── (admin)/admin/        # Admin dashboard, role-gated
│   │   │   │   ├── (auth)/               # login, signup, reset
│   │   │   │   ├── api/                  # ONLY: auth cookie proxy, OG images, revalidation webhooks
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── sitemap.ts
│   │   │   │   └── robots.ts
│   │   │   ├── components/
│   │   │   │   ├── ui/                   # Design-system primitives: Button, Input, Card, Modal…
│   │   │   │   ├── layout/               # Header, Footer, MobileNav, Container
│   │   │   │   ├── marketing/            # Hero, ServiceGrid, HowItWorks, Testimonials
│   │   │   │   └── shared/               # StatusBadge, PriceDisplay, EmptyState, ErrorState
│   │   │   ├── features/                 # Vertical slices — the important one
│   │   │   │   ├── cart/                 # components + hooks + store for cart
│   │   │   │   ├── checkout/
│   │   │   │   ├── orders/
│   │   │   │   ├── auth/
│   │   │   │   ├── addresses/
│   │   │   │   ├── catalog/
│   │   │   │   └── admin/                # admin-only feature modules
│   │   │   ├── hooks/                    # Cross-feature hooks only
│   │   │   ├── lib/
│   │   │   │   ├── api-client.ts         # Typed fetch wrapper, handles refresh + errors
│   │   │   │   ├── motion.ts             # Animation tokens
│   │   │   │   ├── format.ts             # ₹ currency, dates, phone
│   │   │   │   └── seo.ts                # Metadata + JSON-LD builders
│   │   │   ├── stores/                   # Zustand stores
│   │   │   ├── styles/                   # tokens.css, globals.css
│   │   │   └── types/                    # Web-only types (shared ones live in packages/shared)
│   │   ├── public/
│   │   ├── next.config.ts
│   │   └── tailwind.config.ts
│   │
│   └── api/                       # Express 5 + TypeScript
│       ├── src/
│       │   ├── config/            # env loading + validation (Zod), db connection, constants
│       │   ├── models/            # Mongoose schemas — one file per collection
│       │   ├── routes/            # Express routers, thin: path → middleware → controller
│       │   ├── controllers/       # HTTP concerns only: parse, call service, format response
│       │   ├── services/          # ALL business logic lives here. Framework-agnostic
│       │   ├── middlewares/       # auth, rbac, rateLimit, validate, errorHandler, requestId
│       │   ├── validators/        # Zod schemas per endpoint (imported from shared where possible)
│       │   ├── integrations/      # razorpay/, msg91/, resend/, cloudinary/, maps/ — one adapter each
│       │   ├── jobs/              # node-cron: expireOrders, reconcilePayments, retryNotifications
│       │   ├── utils/             # logger, errors (AppError), pagination, money helpers
│       │   ├── types/
│       │   ├── app.ts             # Express app assembly (no listen)
│       │   └── server.ts          # listen + graceful shutdown
│       └── tests/
│
├── packages/
│   └── shared/                    # Imported by BOTH apps
│       ├── src/
│       │   ├── schemas/           # Zod schemas: order, address, auth payloads…
│       │   ├── types/             # Inferred TS types from those schemas
│       │   ├── constants/         # ORDER_STATUS, PAYMENT_STATUS, ROLES, SLOT_WINDOWS
│       │   └── utils/             # Pure money/date helpers used on both sides
│       └── package.json
│
├── docs/                          # This blueprint — the source of truth
├── .github/workflows/             # CI
├── package.json                   # workspaces: ["apps/*", "packages/*"]
└── README.md
```

### Directory purpose rules

- **`services/` is where business logic lives.** Controllers must not contain business rules; models must not contain workflow. If a controller is longer than ~40 lines, logic has leaked into it.
- **`features/` (web) beats `components/` for anything domain-specific.** A feature folder owns its components, hooks, and API calls, so deleting a feature is deleting one folder.
- **`integrations/` wraps every third-party SDK behind our own interface.** No file outside `integrations/razorpay/` may import the Razorpay SDK. This makes vendors swappable and mocking trivial in tests.
- **`packages/shared` holds Zod schemas as the single definition of every payload shape.** Backend validates with them; frontend builds forms from them; types are inferred, never hand-written twice.
- **The admin UI lives inside `apps/web` under a route group**, not as a third app. One deployment, shared design system, role-gated by middleware. Split it out only if/when a separate ops team needs separate release cadence.

## 6. Deployment architecture

```
                          ┌──────────────────────────┐
        Customer ────────▶│  Vercel Edge/CDN          │
        (mobile/desktop)  │  Next.js 15 (apps/web)    │
                          │  SSG/ISR marketing pages  │
                          │  SSR account/admin pages  │
                          └───────────┬──────────────┘
                                      │ HTTPS (JSON, httpOnly cookies)
                                      ▼
                          ┌──────────────────────────┐
                          │  Railway / Render         │
                          │  Express API (apps/api)   │
                          │  + node-cron jobs         │
                          └───────────┬──────────────┘
                                      │
                    ┌─────────────────┼──────────────────┐
                    ▼                 ▼                  ▼
        ┌────────────────────┐ ┌─────────────┐ ┌──────────────────┐
        │ MongoDB Atlas      │ │ Cloudinary  │ │ Sentry           │
        │ (replica set, M0→) │ │ (media)     │ │ (errors, both)   │
        └────────────────────┘ └─────────────┘ └──────────────────┘

        Outbound integrations from the API:
          Razorpay (payments + webhooks IN)   MSG91 (SMS/OTP)
          Resend (email)                       Google Maps (geocode)
          Interakt/Gupshup (WhatsApp, V2)

        Webhooks IN:  Razorpay ──▶ POST https://api.clenzy.in/api/v1/webhooks/razorpay
```

### Environments

| Env         | Web                                | API                     | Database                                                | Payments               |
| ----------- | ---------------------------------- | ----------------------- | ------------------------------------------------------- | ---------------------- |
| Development | `localhost:3000`                   | `localhost:5000`        | Atlas free cluster `clenzy_dev` (or local Docker Mongo) | Razorpay **test** keys |
| Staging     | Vercel preview `staging.clenzy.in` | Railway staging service | Atlas `clenzy_staging`                                  | Razorpay **test** keys |
| Production  | `clenzy.in` + `www`                | `api.clenzy.in`         | Atlas `clenzy_prod`, backups on                         | Razorpay **live** keys |

**Rules:** production secrets never appear in `.env` files committed anywhere; staging and production never share a database; test and live Razorpay keys are never both present in one environment.

### Environment variables

`apps/web/.env.local`:

```
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_RAZORPAY_KEY_ID=          # publishable key only
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=      # HTTP-referrer restricted
NEXT_PUBLIC_GA_MEASUREMENT_ID=
NEXT_PUBLIC_SENTRY_DSN=
```

`apps/api/.env`:

```
NODE_ENV=
PORT=
MONGODB_URI=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
COOKIE_DOMAIN=
CORS_ORIGINS=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
MSG91_AUTH_KEY=
MSG91_SENDER_ID=
MSG91_OTP_TEMPLATE_ID=
RESEND_API_KEY=
EMAIL_FROM=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
GOOGLE_MAPS_SERVER_KEY=               # IP-restricted, separate from the browser key
SENTRY_DSN=
ADMIN_SEED_EMAIL=
ADMIN_SEED_PASSWORD=                  # first-run bootstrap only, rotate immediately
```

Validate all of these at boot with Zod in `config/env.ts` and **crash on missing/invalid values** — never let the server start half-configured. Commit a `.env.example` with keys and empty values.

## 7. Data flow examples

**Marketing page (SEO-critical):** build/revalidate time → Next.js fetches catalog from API → static HTML at the edge → hydration adds interactivity. ISR revalidate 3600s, plus on-demand revalidation triggered by the API when an admin edits the catalog.

**Add to cart (guest):** client-only. Zustand + `localStorage`. **Prices are re-validated server-side at checkout** — never trust a client-held price.

**Place order:** client POSTs cart → API opens a Mongo transaction → re-price every line item from the DB → validate coupon → validate serviceability → check + decrement slot capacity → create order (`PENDING_PAYMENT`) → create Razorpay order → commit → return `razorpayOrderId` → client opens Checkout → **webhook** confirms payment → API verifies signature → marks paid + `PLACED` → enqueues notifications.

**Order status change (admin):** admin action → API validates the transition is legal for that role → updates status + appends to `statusHistory` → enqueues the notification for that transition → client sees it on next poll (MVP) or push (V2).

## 8. Performance/scale posture

Design for ~500 orders/day and ~50k monthly visitors at launch — this is a **single-region, single-instance** problem, not a distributed-systems problem. Deliberately deferred until real load justifies them: Redis, queues (BullMQ), read replicas, CDN for API responses, horizontal scaling, microservices. The three things that must be right from day one because retrofitting them is expensive: **database indexes** (see [DATABASE.md](DATABASE.md)), **price snapshotting**, and **transactional order placement**.
