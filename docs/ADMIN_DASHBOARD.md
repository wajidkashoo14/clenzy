# Admin Dashboard — Clenzy

The admin dashboard is not a side feature. For a laundry business, it _is_ the operating system: if ops can't run a day's pickups from it, the business runs on WhatsApp and spreadsheets and the platform is decorative. Build it with the same care as the storefront.

Location: inside `apps/web` at `/admin`, gated by middleware that checks the role claim server-side on every request. It reuses the design system but adopts a denser, more utilitarian layout (compact spacing, tables over cards, keyboard-friendly).

## 1. Layout

- **Sidebar** (collapsible, 240px): Dashboard · Orders · Today's Roster · Customers · Catalog (Categories, Items, Pricing) · Coupons · Service Areas · Slots · Staff · Reviews · Leads · Content · Reports · Settings.
- **Top bar:** global search (order number, phone, customer name — the single most-used control, bind it to `/`), date-range picker, notification bell (new orders, failed payments, pending approvals), user menu.
- **Responsive:** admins genuinely use phones in the field. The order list, order detail, status updates, and roster **must work on mobile**; deep configuration screens (settings, slot templates) may be desktop-first with a "best on desktop" notice.
- **Density:** 40px table rows, 14px base font, sticky headers, no decorative animation. Motion is limited to state feedback (saving, success, row updates).

## 2. Dashboard (`/admin`)

**Stat cards** (each with a delta vs. the previous equivalent period): Revenue · Orders placed · New customers · Average order value · Pending payments · Orders needing attention.

**"Needs attention" queue** — the most important widget on the page, ordered by urgency:

1. Orders with failed payments in the last 24h
2. Price revisions awaiting customer approval > 2h
3. Failed pickups/deliveries not yet rescheduled
4. Pickups scheduled for today with no assigned agent
5. Orders in `PROCESSING` past their expected turnaround
6. Refunds pending > 48h
7. Unmoderated reviews and unactioned leads > 24h

**Charts:** revenue over time (line, switchable day/week/month) · orders by status (donut) · popular services by revenue and by volume (bar) · new vs. returning customers · slot utilization heatmap (day × window) — the last one tells ops where to add capacity.

**Today at a glance:** pickups due today (count + list link), deliveries due today, orders in the facility, agents on shift.

All aggregation runs server-side via Mongo aggregation pipelines with `$facet` so one request returns the whole dashboard. Cache for 60s.

## 3. Order management (`/admin/orders`)

**List view:** columns = order number · customer (name + phone, click-to-call) · items count · total · payment status · order status · pickup slot · delivery slot · assigned agent · created. Row click opens detail; row hover reveals quick actions.

**Filters:** status (multi-select) · payment status · date range (created / pickup date / delivery date — selectable) · service area · assigned agent · payment method · express only · has price revision · needs attention. Filters must be URL-encoded so a filtered view is shareable and bookmarkable.

**Search:** order number, customer phone, customer name, address text.

**Bulk actions:** assign agent to selected · update status (only where the transition is legal for all selected) · export CSV · print pickup slips.

**Saved views** (V2): "Today's pickups", "Unassigned", "Overdue", "Failed payments".

### Order detail (`/admin/orders/:id`)

Panels:

1. **Header:** order number, status pill, payment pill, express flag, source, created-at, and the primary action for the current state (e.g. "Mark picked up").
2. **Customer:** name, phone (call/WhatsApp buttons), email, lifetime order count and value, link to profile, plus "previous complaints" if any.
3. **Addresses:** pickup and delivery snapshots with a map link and the landmark prominently displayed (agents rely on landmarks, not pin codes).
4. **Slots:** pickup and delivery with reschedule action.
5. **Items & pricing:** editable itemization table. Ops can change quantity, add items found in the bag, remove items, and mark an item damaged. Every edit shows a live diff of the total and requires a reason. If the new total exceeds the original by more than the configured threshold, saving sets `priceRevision.requiresApproval` and sends the customer an approval link instead of proceeding.
6. **Status timeline:** full history with actor, role, timestamp, note.
7. **Assignment:** pickup agent and delivery agent selectors, filtered to agents assigned to that area and on shift.
8. **Payment:** method, gateway ids, amount paid, refunds, and a "Refund" action (ADMIN only, requires reason and re-authentication).
9. **Internal notes:** append-only, with author and timestamp. Never visible to the customer.
10. **Actions:** cancel · refund · re-clean linkage · print invoice · print label · resend notification.

### Status transitions

The admin UI must only offer transitions that the server's transition map allows for the current role — do not render a free-form status dropdown listing all 15 states. See the transition table in [PAYMENTS_AND_NOTIFICATIONS.md](PAYMENTS_AND_NOTIFICATIONS.md) §2.

### Today's Roster (`/admin/orders/roster`)

Date + type (pickup/delivery) selector → grouped by time window → each row shows customer, phone, address, landmark, item count, payment due (for COD), and assignment. Printable and mobile-friendly, because this is the screen an agent or dispatcher actually uses in the morning. Bulk-assign an entire window to an agent in one action.

## 4. Customer management (`/admin/customers`)

List: name · phone · email · orders · lifetime value · last order · status. Sort by value or recency; search across all fields.

Detail: profile and contact · order history with statuses · saved addresses · notification preferences · wallet balance and ledger (V2) · reviews written · internal notes · actions (suspend/reactivate, credit wallet, create an order on their behalf, export their data for a DPDP request).

**Privacy rule:** staff-level users see customer contact details only for orders assigned to them or in their area; full customer browsing is ADMIN-only. Log every profile view in `auditLogs` if you handle a lot of data — cheap insurance.

## 5. Service & catalog management

**Categories** (`/admin/services`): list with drag-to-reorder, active toggle, item counts. Create/edit form: name, slug (auto-generated, editable before first publish then locked), descriptions, icon picker, image upload (Cloudinary), turnaround hours, express availability, SEO fields. Deleting deactivates (never hard-deletes) and warns if items would be orphaned.

**Items** (`/admin/services/items`): filterable by category and status; inline-editable price and active toggle for fast bulk work; full editor for name, slug, description, care note, unit, price, MRP, express price, tax rate, HSN code, min/max quantity, tiered pricing rows, turnaround override, image, popular flag, and area restrictions. Bulk actions: activate/deactivate, change category, bulk price update (percentage or flat, previewed before applying).

## 6. Pricing management (`/admin/pricing`)

A dedicated spreadsheet-like view across all categories: rows = items, columns = price, express price, tax, active. Inline editing with keyboard navigation (Tab/Enter), a diff summary before save, one atomic save, and an entry written to `priceHistory` per change. Provide **CSV import/export** — for 200+ items, a real business will want to edit prices in Excel and re-upload. Import must show a validation preview (what changes, what's invalid) before committing.

**Why pricing is data, not code:** prices live in `serviceItems.price` (paise). No price is ever hardcoded in the frontend or backend. Changing a price is a DB write plus an ISR revalidation of `/pricing` and the affected service pages. Past orders are unaffected because each order stores its own snapshot of every line item (see [DATABASE.md](DATABASE.md) §0).

Example structure the seeder should follow:

- **Laundry (wash & fold, per piece):** shirt, t-shirt, trouser, jeans, kurta, pyjama, bedsheet (single/double), pillow cover, towel
- **Wash & iron / steam ironing (per piece):** same garment list at a lower rate
- **Dry cleaning (per piece):** suit (2pc/3pc), blazer, coat, saree (plain/heavy), lehenga, sherwani, pheran, woollen shawl, pashmina, jacket, sweater
- **Home care:** carpet (per sq ft), rug/namda, sofa (per seat), curtain (per panel, lined/unlined), mattress (single/double), blanket, quilt/razai
- **Specialty:** shoe cleaning (per pair), bag cleaning, leather care

## 7. Coupon management (`/admin/coupons`)

List with code, type, value, validity window, usage (used/limit), status. Create/edit form: code (uppercase, uniqueness-checked live), description, discount type and value, max discount cap, minimum order, valid from/until, total usage limit, per-user limit, first-order-only, applicable categories, applicable areas, restricted user list, active toggle. Show a live preview: "₹500 order → ₹400 (₹100 off)". Detail view lists redemptions with customer and order links. Deactivate rather than delete once a coupon has been redeemed.

## 8. Service areas (`/admin/areas`)

List of areas with city, pin codes, pickup/delivery/express availability toggles, delivery fee override, order volume. Editor: area name, slug, pin codes (multi-entry chips with duplicate detection across areas), availability toggles, fee and minimum-order overrides, serviceable categories, SEO fields for the location landing page.

**Operationally critical:** a one-click "pause area" control. Srinagar has snow closures, curfews, and connectivity outages — ops must be able to stop accepting orders for an area in seconds, with a customer-facing message, without a developer.

Also surface: a "notify me" demand list from unserviced pin codes, sorted by request count — this is how the owner decides where to expand.

## 9. Slot management (`/admin/slots`)

**Templates:** define windows per day of week per type (pickup/delivery), each with capacity, cutoff, and applicable areas. **Capacity view:** calendar grid of the next 14 days × windows showing booked/capacity with color coding, and the ability to override capacity for a specific date (extra staff, holiday, festival) or block a date entirely.

## 10. Staff management (`/admin/staff`)

Create agent accounts (name, phone, employee id, assigned areas, shift hours, vehicle number). View per-agent workload: tasks today, completed, failed, average per day. Toggle availability. **SUPERADMIN only:** create/modify admin and staff accounts and change roles.

## 11. Reviews, leads, and forms

**Reviews:** moderation queue (pending/approved/rejected), rating, comment, order link, actions to approve, reject with reason, reply publicly, or feature on the homepage. Low ratings (≤2) should also appear in the "needs attention" queue as a service-recovery prompt.

**Leads:** pipeline for fast-path booking form submissions — new → contacted → converted/lost, with assignment, notes, and a "convert to order" action that pre-fills a manual order. **Contact and B2B enquiries** get equivalent, simpler queues.

## 12. Content management — build it in, don't add a CMS

**Recommendation: build content editing into the admin dashboard. Do not add Sanity/Strapi/Contentful for MVP.**

Reasoning: the editable content here is small and structured (FAQs, testimonials, banners, service descriptions, SEO fields, and eventually blog posts) — it's a handful of CRUD screens you're already building for the catalog. A headless CMS adds a second data source, a second auth system, a second vendor bill, webhook/revalidation plumbing, and a content model that drifts from your database. The payoff (rich editorial workflows, scheduled publishing, multiple editors) is real only when non-technical marketing staff publish frequently — not at launch with one owner.

Build these admin screens: FAQs (question, answer via a lightweight rich-text editor, category, order, active) · Testimonials (name, area, rating, text, photo, featured) · Banners (image, mobile image, headline, CTA, placement, schedule window) · Service/category copy and SEO fields (already part of catalog editing) · Legal pages (Terms, Privacy, Refund) as simple rich-text documents · Blog posts in V2.

**Revisit at V2 if** the business hires a content writer or starts publishing weekly. Migration is straightforward because content already lives behind an API rather than in hardcoded JSX — which is the actual architectural requirement. Use Tiptap for rich text (React-native, no vendor).

## 13. Reports (`/admin/reports`)

Revenue (gross, discounts, refunds, net; split by online/COD; by service category; by area) · Orders (volume by status, cancellation rate with reasons, average turnaround actual vs. promised, failed pickup/delivery rate) · Customers (new vs. returning, repeat rate, top customers by value, churn signal: no order in 60 days) · Operations (slot utilization, agent performance, items processed by type) · Coupons (redemptions, discount cost, revenue attributed).

Every report exports to CSV. Date-range driven. Build with Mongo aggregation pipelines; if a report takes more than ~2s, add the necessary index rather than caching around the problem.

## 14. Settings (`/admin/settings`)

Grouped forms writing to the `settings` document: **Business** (name, support phone, WhatsApp, email, hours, working days) · **Orders** (minimum order value, small-order fee, max reschedules, cancellation window, re-clean window, price-revision approval threshold) · **Delivery** (delivery fee, free-delivery threshold, pickup fee, express multiplier and minimum, same-day cutoff) · **Payments** (COD enabled, COD cap, GST enabled, GST number, tax-inclusive/exclusive display) · **Notifications** (per-event channel toggles — the cost-control panel) · **Maintenance** (maintenance mode with a custom message).

Every settings change writes an `auditLogs` entry with before/after values. Show a confirmation dialog for anything affecting money.

## 15. Admin security requirements

Email + password login only (no OTP-only admin accounts — SIM-swap risk) · TOTP 2FA required for `admin`/`superadmin` (V2, but design the schema for it now) · 8-hour absolute session expiry with 30-minute idle timeout · re-authentication for refunds, role changes, and settings changes · role checks enforced **server-side on every endpoint**, never only in the UI · all mutations audit-logged · consider IP allowlisting for `superadmin` in V2 · never expose the admin API surface publicly under an unauthenticated route, and make sure `/admin` is `noindex, nofollow` and excluded from the sitemap.
