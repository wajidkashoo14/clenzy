# Third-Party Integrations & Setup Guide — Clenzy

> **Pricing accuracy note:** all prices and free-tier limits below are approximate and were accurate to the best of available knowledge at the time of writing. **Verify current pricing on each provider's site at signup** — SaaS pricing changes frequently. Nothing here should be treated as a quote.

## 1. Services you need to sign up for

| Service                     | Purpose                               | Required for MVP? | Account needed? | Cost                                                   | Setup difficulty                      |
| --------------------------- | ------------------------------------- | :---------------: | :-------------: | ------------------------------------------------------ | ------------------------------------- |
| **MongoDB Atlas**           | Database hosting                      |      ✅ Yes       |       ✅        | Free (M0 512MB) → ~$9/mo (M2) → ~$57/mo (M10)          | 🟢 Easy                               |
| **Razorpay**                | Payments (UPI/card/netbanking/wallet) |      ✅ Yes       |       ✅        | No setup fee; ~2% + GST per transaction                | 🟡 Medium — KYC required              |
| **MSG91**                   | Transactional SMS + OTP               |      ✅ Yes       |       ✅        | ~₹0.15–0.25/SMS + one-time DLT registration            | 🔴 Hard — DLT registration takes days |
| **Resend**                  | Transactional email                   |      ✅ Yes       |       ✅        | Free 3,000/mo (100/day) → $20/mo for 50k               | 🟢 Easy                               |
| **Vercel**                  | Frontend hosting                      |      ✅ Yes       |       ✅        | Free (Hobby) → $20/user/mo (Pro)                       | 🟢 Easy                               |
| **Railway** or **Render**   | Backend API hosting                   |      ✅ Yes       |       ✅        | Railway ~$5/mo credit; Render free tier sleeps → $7/mo | 🟢 Easy                               |
| **Cloudinary**              | Image storage + optimization          |      ✅ Yes       |       ✅        | Free 25 credits/mo (~25GB bandwidth)                   | 🟢 Easy                               |
| **Google Maps Platform**    | Address autocomplete + geocoding      |      ✅ Yes       |       ✅        | $200/mo free credit; card required                     | 🟡 Medium                             |
| **Sentry**                  | Error monitoring                      |      ✅ Yes       |       ✅        | Free 5k errors/mo                                      | 🟢 Easy                               |
| **Google Analytics 4**      | Web analytics                         |      ✅ Yes       |       ✅        | Free                                                   | 🟢 Easy                               |
| **Domain registrar**        | `clenzy.in`                           |      ✅ Yes       |       ✅        | ₹700–1,500/yr                                          | 🟢 Easy                               |
| **Google Business Profile** | Local SEO / Maps listing              |      ✅ Yes       |       ✅        | Free                                                   | 🟡 Medium — physical verification     |
| **GitHub**                  | Code hosting + CI                     |      ✅ Yes       |       ✅        | Free                                                   | 🟢 Easy                               |
| Interakt / Gupshup          | WhatsApp Business API                 |       ❌ V2       |       ✅        | ~₹0.35–0.80/conversation + platform fee                | 🔴 Hard — Meta business verification  |
| Cloudflare                  | DNS, WAF, Turnstile                   |  ⚪ Recommended   |       ✅        | Free                                                   | 🟢 Easy                               |
| PostHog                     | Product analytics                     |       ❌ V2       |       ✅        | Free 1M events/mo                                      | 🟢 Easy                               |
| Better Uptime / UptimeRobot | Uptime monitoring                     |  ⚪ Recommended   |       ✅        | Free tier                                              | 🟢 Easy                               |

**Estimated MVP monthly cost: ₹1,500–4,000** (~$18–48) excluding transaction fees and SMS usage, most of which sits inside free tiers at launch. The two real variable costs are Razorpay's ~2% per transaction and SMS at ~₹0.20 each.

### Deliberately NOT recommended

- **Auth0/Clerk/Firebase Auth** — phone OTP is custom anyway and you'd split identity across vendors. Custom JWT + MSG91 is simpler and cheaper here.
- **AWS S3 + CloudFront** — Cloudinary does storage _and_ transformation with far less setup. Revisit at large scale.
- **Headless CMS (Sanity/Strapi/Contentful)** — see [ADMIN_DASHBOARD.md](ADMIN_DASHBOARD.md) §12.
- **Redis (Upstash)** — not needed at MVP volume; adds a dependency and a bill for no benefit.
- **Twilio for Indian SMS** — significantly more expensive than MSG91 domestically and still requires DLT. Keep it in mind only if you later serve international numbers.
- **A separate BI tool** — Mongo aggregations plus CSV export cover launch reporting.

---

## 2. Setup guides

### 2.1 MongoDB Atlas — database

**What it does:** managed MongoDB hosting with automatic replica sets (required for the transactions this app depends on), backups, and monitoring.
**Why we need it:** primary data store. A local/standalone MongoDB cannot run multi-document transactions, which order placement requires.
**Free tier:** M0 — 512MB, shared CPU, no automated backups. Fine for development; **not** acceptable for production data without your own backup job.
**Integration difficulty:** 🟢 Easy — a connection string plus Mongoose.

**Steps**

1. Sign up at `mongodb.com/cloud/atlas` (Google sign-in works).
2. Create an organization and a project named `clenzy`.
3. **Build a Database** → choose **M0 Free** for dev (or **M10** for production, ~$57/mo, which includes automated backups) → provider AWS → region **Mumbai (ap-south-1)** — the closest region to Kashmir; latency matters.
4. **Security → Database Access** → Add New Database User → username `clenzy_app`, autogenerate a strong password, role `readWrite` on the specific database. Save the password in your password manager immediately.
5. **Security → Network Access** → for development add your current IP; for production add your Railway/Render egress IPs. `0.0.0.0/0` is acceptable only briefly during setup — **remove it before launch** and rely on strong credentials plus IP allowlisting.
6. **Connect → Drivers → Node.js** → copy the connection string, replace `<password>`, and append the database name: `.../clenzy_prod?retryWrites=true&w=majority`.
7. Put it in `MONGODB_URI`. Create three separate databases: `clenzy_dev`, `clenzy_staging`, `clenzy_prod`.
8. Enable **Backup** on the production cluster (M10+). On M0, schedule your own nightly `mongodump` job.
9. Verify: `npm run db:ping` (a tiny script you'll write in Phase 1) should connect and print the server version.

**Production considerations:** upgrade off M0 before launch (no backups, and shared CPU will throttle) · enable alerts for connection-count and disk usage · never point staging at the production database.
**Alternatives:** self-hosted MongoDB on a VPS (cheaper, you own backups and upgrades — not recommended for a first production system); PostgreSQL on Neon/Supabase if you reconsider the datastore.

---

### 2.2 Razorpay — payments

**What it does:** payment gateway supporting UPI, cards, net banking, and wallets, with a hosted checkout, webhooks, and refunds API.
**Why we need it:** to take money. It's the standard choice for Indian D2C, has the best UPI coverage, and its Node SDK and webhook model are straightforward.
**Free tier:** no monthly fee. Standard pricing ~2% + GST per transaction (UPI is often lower or zero-rated for small amounts — confirm your negotiated rate). Settlement typically T+2 working days.
**Integration difficulty:** 🟡 Medium — the code is easy; **business verification (KYC) is the slow part and can take 2–7 working days.** Start this early; it's the most common launch blocker.

**Steps**

1. Sign up at `razorpay.com` with a business email.
2. **Complete KYC.** You will need: PAN (business or proprietor), business registration proof (GST certificate, Udyam/MSME registration, or shop & establishment licence), a bank account in the business name with a cancelled cheque or bank statement, address proof, and the authorised signatory's identity documents. A sole proprietorship is accepted — you don't need a private limited company.
3. **Your website must be live with these pages before approval:** Terms & Conditions, Privacy Policy, Refund & Cancellation Policy, Shipping/Delivery Policy, Contact Us with a real address and phone, and clearly visible pricing. Razorpay checks these. Build them in Phase 3 — this is why they're P0 in the requirements.
4. While KYC is pending, work entirely in **Test Mode**: **Settings → API Keys → Generate Test Key** → gives `rzp_test_xxx` (key id) and a secret shown **once**.
5. Add to `apps/api/.env`: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`. Add only the key id to `apps/web/.env.local` as `NEXT_PUBLIC_RAZORPAY_KEY_ID`.
6. **Configure the webhook: Settings → Webhooks → Add New Webhook.** URL `https://api.clenzy.in/api/v1/webhooks/razorpay` (in development, expose localhost with `ngrok http 5000` and use the ngrok URL). Set a strong secret of your own choosing → `RAZORPAY_WEBHOOK_SECRET`. Subscribe to: `payment.captured`, `payment.failed`, `payment.authorized`, `refund.processed`, `refund.failed`, `order.paid`.
7. **Test** with Razorpay's test instruments: card `4111 1111 1111 1111` (any future expiry, any CVV), test UPI `success@razorpay`, and the failure UPI id from their docs. Verify: the order is created, the webhook is received and signature-verified, the order flips to paid, and a duplicate webhook does not double-process.
8. **Test refunds** in test mode before launch — refunds are the code path most often shipped broken.
9. When KYC is approved, generate **Live** keys and set them only in the production environment. Enable the payment methods you want in **Settings → Payment Methods** (turn off anything irrelevant to reduce checkout clutter).
10. Set the settlement bank account and settlement schedule.

**Production considerations:** never log the key secret · rotate keys if a developer with access leaves · enable Razorpay's email alerts for failed webhooks · reconcile settlements against your `payments` collection weekly · consider Razorpay Route only if you later pay out to partners.
**Alternatives:** **Cashfree** (very competitive rates, good UPI, similar effort — a legitimate second choice), **PhonePe PG**, **Stripe India** (weaker local method coverage and stricter onboarding), **Paytm PG**. Build the payment integration behind `integrations/razorpay/` so switching is contained.

---

### 2.3 MSG91 — SMS and OTP

**What it does:** transactional SMS delivery in India, with an OTP-specific API.
**Why we need it:** phone-OTP login and time-critical order alerts. There is no free way to send SMS in India.
**Free tier:** small trial credit on signup, then prepaid (~₹0.15–0.25 per transactional SMS depending on volume and route).
**Integration difficulty:** 🔴 Hard — not the code (which is a single HTTP call), but **TRAI DLT registration**, which is mandatory for all commercial SMS in India and takes several days.

**Steps**

1. **DLT registration first — start this on day one of the project.** Register your business as a Principal Entity on any DLT portal (Jio TrueConnect, Vodafone Idea, Airtel, or BSNL — one registration works across operators). You'll need: PAN, GST certificate or business registration, an authorisation letter, and the authorised person's details. Cost is typically a one-time ₹5,000–6,000 refundable/registration fee depending on the operator. **Takes 2–7 working days.**
2. Register a **Header/Sender ID** — a 6-character alphanumeric string, e.g. `CLENZY`. Must relate to your business name. Approval takes 1–2 days.
3. Register **content templates** on DLT for every message you will send. Variables use `{#var#}` placeholders. The message you send must match the approved template **exactly** or delivery silently fails. Register at minimum: OTP, order placed, payment failed, pickup reminder, out for delivery, pickup/delivery failed, refund completed, price-revision approval.
4. Sign up at `msg91.com`, complete business verification, and link your DLT entity id, sender id, and template ids in the MSG91 dashboard.
5. **Add credits** (start with ₹1,000 — enough for thousands of messages while testing).
6. Get your **Auth Key** from Settings → API. Add to `.env`: `MSG91_AUTH_KEY`, `MSG91_SENDER_ID`, `MSG91_OTP_TEMPLATE_ID`, plus a template id per event.
7. Use MSG91's **OTP API** (`/api/v5/otp`) rather than rolling your own SMS-based OTP — it handles generation, expiry, retries, and verification. _However_, still store your own `otpRequests` record so rate limiting and attempt counting are enforced by your server, not only by the vendor.
8. Test with a real Indian number — there is no meaningful sandbox for deliverability. Verify OTP delivery time (should be <10s), template rendering, and the sender id shown on the handset.
9. Set up low-balance alerts in the MSG91 dashboard. **If credits run out, login stops working entirely** — this is a total-outage risk, so monitor it.

**Production considerations:** implement a fallback ("Trouble receiving the OTP? Request a call" or an email-login path) so an SMS outage doesn't lock every customer out · never send promotional content on the transactional route (DLT violation, and your header can be blocked) · log provider message ids for delivery troubleshooting.
**Alternatives:** **2Factor.in** (simpler OTP-focused, competitive), **Fast2SMS**, **Twilio** (works, more expensive domestically, still needs DLT), **Firebase Phone Auth** (free tier, but splits identity across vendors and has had India deliverability issues).

---

### 2.4 Resend — transactional email

**What it does:** developer-focused transactional email API with React-based templates.
**Why we need it:** receipts, invoices, order updates, password resets, admin alerts.
**Free tier:** 3,000 emails/month, 100/day, one custom domain. Comfortably covers launch.
**Integration difficulty:** 🟢 Easy — an API key and a DNS record.

**Steps**

1. Sign up at `resend.com`.
2. **Domains → Add Domain** → `clenzy.in`.
3. Add the DNS records Resend provides at your registrar/Cloudflare: an **SPF** TXT record, **DKIM** CNAME/TXT records, and (recommended) a **DMARC** TXT record such as `v=DMARC1; p=none; rua=mailto:dmarc@clenzy.in`. Verification usually completes within minutes to a few hours.
4. **API Keys → Create** → scope it to _sending only_ → copy once → `RESEND_API_KEY`.
5. Set `EMAIL_FROM="Clenzy <orders@clenzy.in>"`. Use a real, monitored reply-to address — `noreply@` hurts deliverability and frustrates customers.
6. Build templates with **React Email** (`@react-email/components`) so email markup is versioned with the codebase and previewable locally.
7. Test to Gmail, Outlook, and at least one Indian ISP address. Check the spam folder and inspect headers for SPF/DKIM/DMARC passes.

**Production considerations:** warm the domain gradually (don't send 3,000 emails on day one) · monitor bounces and complaints · never put OTPs in email as the only channel · keep marketing email on a separate subdomain (e.g. `mail.clenzy.in`) so promotional complaints can't damage transactional deliverability.
**Alternatives:** **AWS SES** (far cheaper at scale — ~$0.10 per 1,000 — but requires a production-access request and more setup), **Brevo** (300/day free, includes SMS), **Postmark** (excellent deliverability, pricier), **SendGrid**.

---

### 2.5 Google Maps Platform — addresses

**What it does:** Places Autocomplete (address search), Geocoding (address ↔ coordinates), and Maps JavaScript (the map picker).
**Why we need it:** accurate Indian addresses are hard; autocomplete plus a draggable pin dramatically reduces failed pickups, which are the most expensive operational failure in this business.
**Free tier:** $200/month recurring credit, which covers a substantial number of requests. **A credit card is required even to stay within the free credit.**
**Integration difficulty:** 🟡 Medium — mostly billing setup and key restriction.

**Steps**

1. Go to `console.cloud.google.com`, create a project `clenzy`.
2. **Billing → Link a billing account** (card required).
3. **APIs & Services → Enable APIs:** Maps JavaScript API, Places API, Geocoding API. Enable nothing else — every extra API is extra exposure.
4. **Credentials → Create credentials → API key.** Create **two separate keys**:
   - _Browser key_ → restrict by **HTTP referrer** to `clenzy.in/*`, `*.clenzy.in/*`, `localhost:3000/*`; restrict to Maps JavaScript + Places. → `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
   - _Server key_ → restrict by **IP address** to your API host's egress IPs; restrict to Geocoding + Places. → `GOOGLE_MAPS_SERVER_KEY`
5. **Set a budget alert** (Billing → Budgets) at, say, $50 and $150, and cap daily quotas per API in **APIs & Services → Quotas**. An unrestricted, unbudgeted Maps key that leaks is the classic way to receive a five-figure bill.
6. Restrict Places Autocomplete with `componentRestrictions: { country: 'in' }` and bias results to Srinagar's coordinates.
7. Validate the returned pin code against `serviceAreas` server-side — never trust the client's serviceability claim.

**Production considerations:** cache geocoding results on the address document so you geocode each address once · never expose the server key to the browser · watch usage monthly.
**Alternatives:** **Ola Maps** (Indian, aggressive free tier, improving coverage), **MapmyIndia/Mappls** (excellent Indian address data, paid), **Mapbox** (great maps, weaker Indian address search), or **manual entry with a pin-code dropdown** (free, and honestly viable for MVP in a single city — consider this if the Maps bill or setup is a blocker).

---

### 2.6 Cloudinary — image storage

**What it does:** image hosting with on-the-fly resizing, format conversion (WebP/AVIF), and CDN delivery.
**Why we need it:** service images, banners, testimonial photos, pickup evidence photos (V2), blog images. Storage plus optimization in one product avoids building an image pipeline.
**Free tier:** 25 monthly credits (~25GB bandwidth / 25k transformations) — generous for this use case.
**Integration difficulty:** 🟢 Easy.

**Steps**

1. Sign up at `cloudinary.com` → note your **Cloud name**.
2. **Settings → API Keys** → copy `API Key` and `API Secret` → `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (server only).
3. Create folders: `clenzy/services`, `clenzy/banners`, `clenzy/testimonials`, `clenzy/orders`.
4. **Settings → Upload → Upload presets** → create a signed preset with an incoming transformation that caps dimensions (e.g. 2000px) and strips EXIF metadata (which contains GPS data from phone photos).
5. Uploads go **through your API** (signed), never directly from the browser with an unsigned preset — an unsigned preset lets anyone on the internet fill your account.
6. Validate on the server: MIME type allowlist (jpeg/png/webp), max 5MB, and re-check the actual file signature, not just the extension.
7. Add `res.cloudinary.com` to `next.config.ts` → `images.remotePatterns` so `next/image` can optimize them.

**Alternatives:** **UploadThing** (simple, React-first), **AWS S3 + CloudFront** (cheapest at scale, most setup), **Vercel Blob** (convenient if you're all-in on Vercel).

---

### 2.7 Vercel — frontend hosting

**Free tier:** Hobby is genuinely free but is **licensed for non-commercial use** — a revenue-generating business should be on **Pro ($20/user/month)**. Budget for this.
**Steps:** sign up with GitHub → **Add New Project** → import the repo → set **Root Directory** to `apps/web` → framework preset Next.js → add all `NEXT_PUBLIC_*` env vars per environment (Production/Preview/Development) → deploy → **Settings → Domains** → add `clenzy.in` and `www.clenzy.in` and set the DNS records at your registrar → verify HTTPS provisions automatically. Every PR then gets a preview URL, which is how staging review should work.
**Alternatives:** **Netlify**, **Cloudflare Pages**, or self-hosting Next.js on the same Railway/Render account as the API (cheaper, more work, loses edge caching).

---

### 2.8 Railway or Render — backend hosting

Pick one. **Railway** is the smoother developer experience; **Render** has a clearer free tier (which sleeps after inactivity — unusable for webhooks, so use the $7/mo Starter for anything real).

**Steps (Railway):** sign up with GitHub → New Project → Deploy from GitHub repo → set **Root Directory** `apps/api`, build `npm run build`, start `npm run start` → add every `apps/api` env var → generate a domain, then add the custom domain `api.clenzy.in` with the CNAME they provide → note the service's **static egress IP** and add it to the Atlas network allowlist and the Google Maps server-key IP restriction → confirm `/health` responds.

**Production considerations:** enable health checks and auto-restart · configure log retention · set up deploy notifications · **remember `node-cron` jobs run in-process, so a sleeping or scale-to-zero service silently stops running them** — this alone rules out free tiers.
**Alternatives:** **Fly.io** (good, closer regions), **DigitalOcean App Platform** ($5/mo, predictable), **AWS EC2/Lightsail** (cheapest at scale, most operational burden).

---

### 2.9 Sentry — error monitoring

**Free tier:** 5,000 errors/month, 1 user.
**Steps:** sign up at `sentry.io` → create **two projects**: `clenzy-web` (Next.js) and `clenzy-api` (Node/Express) → run `npx @sentry/wizard@latest -i nextjs` in `apps/web` and install `@sentry/node` in `apps/api` → set `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` → set `tracesSampleRate` to 0.1 in production (1.0 burns your quota) → enable source-map upload in the build so stack traces are readable → set alert rules (email/Slack on new issues and on error spikes).
**Critical:** scrub PII before sending — configure `beforeSend` to strip phone numbers, emails, addresses, tokens, and any payment identifiers from event payloads.
**Alternatives:** **Highlight.io**, **Bugsnag**, **LogRocket** (session replay, heavier), or Vercel/Railway's built-in logs (insufficient alone — no aggregation or alerting).

---

### 2.10 Google Analytics 4 + Google Business Profile

**GA4:** create a property at `analytics.google.com` → Web data stream for `clenzy.in` → copy the `G-XXXXXXX` measurement id → `NEXT_PUBLIC_GA_MEASUREMENT_ID` → load via `next/script` with `strategy="afterInteractive"` → **only after cookie consent** → mark as conversions: `begin_checkout`, `purchase`, `generate_lead`, `sign_up`. Track ecommerce events with the standard GA4 ecommerce schema so the reports work out of the box.

**Google Business Profile** (free, and the single highest-ROI local-SEO action available): claim the business at `business.google.com` → add the exact business name, category "Laundry Service" / "Dry Cleaner", the real address, service area, hours, phone, and website → complete **physical verification** (usually a postcard or video call — allow 1–2 weeks) → add photos, service list, and start collecting reviews. The name, address, and phone here must match the website's footer **exactly** — inconsistency is the most common local-SEO own goal.

---

### 2.11 Domain + Cloudflare (recommended)

Register `clenzy.in` at a registrar that supports `.in` (BigRock, GoDaddy, Namecheap, or Cloudflare Registrar where available). Then point the nameservers at **Cloudflare** (free) for: DNS management, DDoS protection, a WAF, and **Turnstile** (a free, privacy-respecting CAPTCHA for public forms if spam appears). Set DNS: `A`/`CNAME` for the apex and `www` to Vercel, `CNAME api` to Railway/Render, plus the Resend SPF/DKIM/DMARC records. **Keep Cloudflare proxying OFF for the API host initially** — proxied hosts can complicate webhook signature debugging and raw-body handling.

---

### 2.12 WhatsApp Business API — V2 only

**Why deferred:** Meta business verification is genuinely slow (documents, a verified Facebook Business Manager, sometimes a video call), templates need approval, and it bills per 24-hour conversation. Excellent channel, wrong thing to block a launch on.
**When you do it:** choose a BSP — **Interakt** (easiest for small Indian businesses, ~₹999+/mo plus conversation costs) or **Gupshup** (cheaper per message, more technical). You'll need a Facebook Business Manager account, business verification documents (GST/registration + address proof), and a phone number **not currently registered on any WhatsApp account**. Register utility templates matching the notification matrix, then integrate behind `integrations/whatsapp/` exactly like the SMS adapter, so enabling it is a config change rather than a rewrite.
**MVP substitute (free, do this now):** `https://wa.me/91XXXXXXXXXX?text=Hi%20Clenzy` deep links in the header, footer, contact page, and mobile bottom bar. Customers can message you; you reply from the normal WhatsApp Business app. This captures most of the value at zero cost.

---

## 3. Consolidated environment variables

See [ARCHITECTURE.md](ARCHITECTURE.md) §6 for the full list. Ground rules:

1. **Nothing secret goes in `NEXT_PUBLIC_*`.** That prefix ships the value to every browser. Only the Razorpay key _id_, the referrer-restricted Maps browser key, the GA measurement id, and the Sentry DSN belong there.
2. `.env` files are **never** committed. Commit `.env.example` with empty values and a comment per variable.
3. Secrets live in the hosting provider's environment settings (Vercel/Railway) and in GitHub Actions secrets for CI — never in the repo, never in a Slack message, never in a screenshot.
4. Validate every variable at boot with Zod and crash on failure.
5. Rotate any secret that has ever been pasted anywhere shared.

## 4. Recommended setup order

Some of these have multi-day waits — start them first:

**Week 1 (start immediately, they block later work):** DLT registration → MSG91 · Razorpay KYC · domain purchase · Google Business Profile verification.
**Week 1 (instant):** GitHub · MongoDB Atlas · Sentry · Resend (DNS records) · Cloudinary · Vercel · Railway/Render.
**Week 2:** Google Maps Platform (billing + restricted keys) · GA4 · Cloudflare.
**Later (V2):** WhatsApp BSP · PostHog · uptime monitoring.
