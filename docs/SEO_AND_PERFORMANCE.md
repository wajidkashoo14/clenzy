# SEO & Performance — Clenzy

## PART A — SEO

The commercial reality: nearly all demand for this business arrives through "laundry service near me", "dry cleaning in Srinagar", "carpet cleaning Srinagar", and Google Maps. **Local SEO is the acquisition channel**, and the two things that move it most are a verified Google Business Profile with reviews, and location + service landing pages that actually exist. Everything else is secondary.

### 1. Technical foundation

- **Rendering:** every page that must rank is statically generated or ISR — never client-rendered. Marketing pages, service pages, location pages, pricing, FAQ, and blog are all SSG/ISR. Account, cart, checkout, and admin are `noindex`.
- **URLs:** lowercase, hyphenated, shallow, stable. `/services/dry-cleaning`, `/locations/rajbagh`. No query-string-driven content pages, no trailing-slash inconsistency (pick one and 301 the other).
- **Canonicals:** self-referencing canonical on every page via Next.js `metadata.alternates.canonical`. Absolute URLs.
- **Sitemap:** dynamic `app/sitemap.ts` pulling live routes from the API — home, all service pages, all location pages, pricing, FAQ, about, contact, business, offers, blog posts. Include `lastModified`. Exclude account/cart/checkout/admin.
- **robots.txt:** `app/robots.ts` — allow everything except `/admin`, `/account`, `/cart`, `/checkout`, `/api`; reference the sitemap.
- **Redirects:** define 301s in `next.config.ts` for any URL that ever changes. Never let a ranking URL 404.
- **Internationalization:** none at launch. If Urdu/Hindi arrives in V3, use `hreflang` with subpaths (`/ur/...`), not subdomains.

### 2. Metadata

Every page defines `title`, `description`, `openGraph`, and `twitter` via Next.js `generateMetadata`. Rules: titles 50–60 characters, front-loaded with the keyword, suffixed `| Clenzy`; descriptions 140–160 characters with a benefit and a call to action; no duplicate titles or descriptions anywhere on the site.

| Page                        | Title                                                         | Description pattern                                                                  |
| --------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Home                        | `Laundry & Dry Cleaning in Srinagar \| Clenzy`                | Free pickup & delivery, expert fabric care, transparent pricing. Book in 60 seconds. |
| `/services/dry-cleaning`    | `Dry Cleaning in Srinagar — Suits, Sarees, Pherans \| Clenzy` | Professional dry cleaning with free doorstep pickup. Prices from ₹X.                 |
| `/services/carpet-cleaning` | `Carpet & Rug Cleaning in Srinagar \| Clenzy`                 | Deep cleaning for carpets, namdas and gabbas. Priced per sq ft.                      |
| `/locations/rajbagh`        | `Laundry Service in Rajbagh, Srinagar \| Clenzy`              | Free pickup and delivery in Rajbagh. Same-day options available.                     |
| `/pricing`                  | `Laundry & Dry Cleaning Price List — Srinagar \| Clenzy`      | Transparent per-item pricing. No hidden charges.                                     |

**OG images:** generate dynamically with Next.js `ImageResponse` at `/opengraph-image` per route — brand background, page title, and price hint. 1200×630. Every shared link should look deliberate.

### 3. Structured data (JSON-LD)

Implement as typed builders in `lib/seo.ts` and inject via a `<script type="application/ld+json">`.

| Schema                                           | Where                                       | Key properties                                                                                                                                                                       |
| ------------------------------------------------ | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `LocalBusiness` (subtype `DryCleaningOrLaundry`) | Home + Contact + every location page        | `name`, `image`, `@id`, `url`, `telephone`, `priceRange`, `address` (PostalAddress), `geo`, `openingHoursSpecification`, `areaServed`, `sameAs` (social profiles), `aggregateRating` |
| `Service`                                        | Each service page                           | `serviceType`, `provider` (→ LocalBusiness `@id`), `areaServed`, `hasOfferCatalog` with `Offer` entries carrying real prices in INR                                                  |
| `FAQPage`                                        | FAQ page and the FAQ block on service pages | `mainEntity[]` of `Question`/`Answer` — this earns rich results and is the highest-leverage schema here                                                                              |
| `BreadcrumbList`                                 | All nested pages                            | Matches the visible breadcrumb                                                                                                                                                       |
| `Organization`                                   | Root layout                                 | `logo`, `contactPoint`, `sameAs`                                                                                                                                                     |
| `Review` / `AggregateRating`                     | Home + service pages                        | **Only from genuine, moderated reviews.** Fabricated review markup is a manual-action risk                                                                                           |
| `Article`                                        | Blog posts (V2)                             | `headline`, `datePublished`, `author`, `image`                                                                                                                                       |

**Critical rule:** structured data must describe what is actually visible on the page. Marking up prices or ratings that aren't shown is a policy violation.

### 4. Local SEO playbook

This is where the effort should go.

1. **Google Business Profile** — claim, verify, and complete it (see [INTEGRATIONS.md](INTEGRATIONS.md) §2.10). Add every service, real photos of the facility and staff, correct hours, and the service area. Post updates monthly. **Respond to every review.**
2. **NAP consistency** — the business Name, Address, and Phone must be byte-identical on the website footer, GBP, Justdial, Sulekha, IndiaMART, Facebook, and every other directory. Inconsistency is the most common cause of weak local ranking.
3. **Location pages that aren't doorway pages** — each `/locations/[area]` page needs genuinely unique content: which pin codes are covered, the actual pickup windows for that area, turnaround times, area-specific notes (parking, landmarks, apartment complexes served), local testimonials, and an area-specific FAQ. Ten thin templated pages with a swapped area name will be filtered by Google and can hurt the whole domain. **Ship 4–6 excellent area pages, not 25 thin ones.**
4. **Review generation** — the post-delivery email should ask for a Google review, not only an on-site review. Volume and recency of Google reviews drive map-pack ranking more than anything on your website.
5. **Local citations** — Justdial, Sulekha, IndiaMART, Bing Places, Apple Business Connect.
6. **Local content** — genuinely useful, seasonal, and specific: caring for pashmina shawls, washing a pheran, preparing woollens before Chillai Kalan, carpet care for Kashmiri hand-knotted rugs. This is content only a Kashmir-based business can write credibly, and it earns links.

**Target queries:** `laundry service in Srinagar` · `dry cleaning in Srinagar` · `dry cleaner near me` · `carpet cleaning Srinagar` · `sofa cleaning Srinagar` · `laundry pickup and delivery Kashmir` · `pheran dry cleaning` · `pashmina shawl cleaning Srinagar` · `curtain cleaning Srinagar` · `[area] laundry service` for each covered area.

### 5. On-page rules

One `<h1>` per page containing the primary keyword · logical `h2`/`h3` hierarchy · descriptive `alt` text on every meaningful image (decorative images get `alt=""`) · internal linking hub-and-spoke (home → services index → each service → related services and relevant location pages; every location page links to services and back) · descriptive anchor text, never "click here" · prices visible as text, never baked into images · phone number as a real `tel:` link in text.

### 6. Measurement

Google Search Console (verify at launch, submit the sitemap, watch Core Web Vitals and coverage) · GA4 with conversions configured · GBP Insights for calls, direction requests, and website clicks · monthly rank checks on the target query list. Expect meaningful local movement in 2–4 months, not weeks.

---

## PART B — Performance

### 7. Targets

| Metric                                          | Target          | Hard limit |
| ----------------------------------------------- | --------------- | ---------- |
| **LCP** (mobile, 4G)                            | < 2.0s          | 2.5s       |
| **INP**                                         | < 150ms         | 200ms      |
| **CLS**                                         | < 0.05          | 0.1        |
| **TTFB**                                        | < 500ms         | 800ms      |
| Lighthouse Performance (mobile)                 | ≥ 90            | 85         |
| Lighthouse Accessibility / Best Practices / SEO | 100 / ≥95 / 100 | —          |
| Initial JS (marketing pages, gzipped)           | < 120KB         | 170KB      |
| Total page weight (home)                        | < 800KB         | 1.2MB      |
| API p95 response time                           | < 300ms         | 600ms      |

Test on a throttled mid-range Android over simulated 4G — not on a desktop over fibre. That's the real user.

### 8. Rendering strategy per route

| Route                                                                       | Strategy                                                                               | Why                                          |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------- |
| `/`, `/services/*`, `/pricing`, `/locations/*`, `/about`, `/faq`, `/blog/*` | **SSG + ISR** (revalidate 3600s, plus on-demand revalidation when admin edits content) | Fastest possible TTFB, fully indexable       |
| `/cart`, `/checkout`                                                        | Client-side                                                                            | Personal, non-indexable, needs interactivity |
| `/account/*`                                                                | SSR (dynamic)                                                                          | Personal, must be fresh                      |
| `/admin/*`                                                                  | SSR (dynamic)                                                                          | Fresh data, never cached                     |

Use React Server Components by default. Add `'use client'` only where interactivity genuinely requires it — and keep client components as leaves, not wrappers, so the interactive island stays small.

### 9. Images

`next/image` everywhere with explicit `width`/`height` (or `fill` with a sized container) so nothing shifts · AVIF then WebP via `formats: ['image/avif','image/webp']` · `priority` on the LCP image only, `loading="lazy"` on everything below the fold · `placeholder="blur"` on photos · responsive `sizes` matching real layout widths · SVG for icons and the pattern motif · Cloudinary transformations (`f_auto,q_auto`) to serve the right format · **hero image budget: under 150KB.**

### 10. JavaScript

- Dynamic-import anything heavy and non-critical: the map picker, Razorpay's script (load on the checkout page only, not globally), charts (admin only), the rich-text editor (admin only), GSAP and Lenis (desktop marketing routes only).
- `LazyMotion` + `domAnimation` for Framer Motion instead of the full bundle.
- Analyze with `@next/bundle-analyzer` in CI; **fail the build if the shared bundle exceeds the budget** — budgets that aren't enforced are wishes.
- Avoid heavy dependencies: no moment.js (use `date-fns` or `Intl`), no lodash (use native), no full icon libraries (tree-shakeable Lucide only).
- Third-party scripts (GA) via `next/script strategy="afterInteractive"`, loaded only after consent.

### 11. Fonts

Self-host Fraunces and Inter via `next/font/google` (which inlines the CSS and eliminates the render-blocking Google Fonts request) · `display: swap` · subset to `latin` · preload only the weights used above the fold · **variable fonts, so one file covers all weights.** Zero layout shift from fonts is achievable and expected here.

### 12. Caching

| Layer                                                | Policy                                                         |
| ---------------------------------------------------- | -------------------------------------------------------------- |
| Static assets (`/_next/static/*`)                    | `public, max-age=31536000, immutable` (content-hashed)         |
| ISR pages                                            | Revalidate 3600s + on-demand revalidation from the admin       |
| Public API reads (`/services`, `/pricing`, `/areas`) | `public, max-age=300, stale-while-revalidate=3600`             |
| Authenticated API responses                          | `private, no-store`                                            |
| Images (Cloudinary)                                  | CDN-cached, long TTL, versioned URLs                           |
| Settings document                                    | 60s in-process cache in the API (read on nearly every request) |

Client-side, TanStack Query with sensible `staleTime` per query type: catalog 5 min, slots 30s, order detail 15s while active, user profile 5 min.

### 13. Database performance

Every query in [DATABASE.md](DATABASE.md) has a supporting index — verify with `.explain('executionStats')` and confirm `IXSCAN`, not `COLLSCAN` · always paginate (default 20, max 100) · projections to fetch only needed fields · `.lean()` for reads · avoid N+1 (batch with `$in` or `populate` selectively) · `$facet` to return dashboard aggregates in one round trip · denormalize `user.stats` so the admin customer list doesn't aggregate orders per row · monitor slow queries in Atlas and add indexes reactively.

### 14. Animation performance

`transform` and `opacity` only · `will-change` applied immediately before an animation and removed after · IntersectionObserver rather than scroll listeners · cap concurrent animations · pause looping animations when the tab is hidden · Lenis disabled on mobile · verify 55+ fps under 4× CPU throttling. See [ANIMATION_SYSTEM.md](ANIMATION_SYSTEM.md) §5.

### 15. Monitoring

Vercel Analytics for real-user Core Web Vitals · Lighthouse CI in the GitHub Actions pipeline with the budgets above enforced as thresholds · Sentry performance tracing at 10% sampling · Atlas performance advisor reviewed monthly · Search Console Core Web Vitals report (this is the one Google actually ranks on).

### 16. Performance anti-patterns to avoid

Loading Razorpay's script on every page · importing the whole admin chart library into the shared bundle · client-rendering the pricing table · fetching the catalog on every page navigation instead of caching · unoptimized hero photography · a full-screen preloader (it _adds_ perceived latency) · animating layout properties · rendering 200 price rows without virtualization on low-end devices · blocking first paint on analytics.
