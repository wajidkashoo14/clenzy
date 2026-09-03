# API Specification — Clenzy

Base URL: `https://api.clenzy.in/api/v1` (dev: `http://localhost:5000/api/v1`)

## 0. Conventions

**Auth:** access JWT in an `httpOnly` cookie (`clenzy_at`); refresh token in `clenzy_rt`. Cookie flags: `Secure`, `SameSite=Lax`, `Domain=.clenzy.in`. Auth levels used below: `PUBLIC` · `AUTH` (any logged-in user) · `AGENT` · `STAFF` · `ADMIN` · `SUPERADMIN` (each implies the levels below it).

**Success envelope**

```json
{ "success": true, "data": {}, "meta": { "page": 1, "limit": 20, "total": 145, "totalPages": 8 } }
```

**Error envelope**

```json
{
  "success": false,
  "error": {
    "code": "COUPON_MIN_ORDER_NOT_MET",
    "message": "This coupon needs a minimum order of ₹499.",
    "details": [{ "field": "couponCode", "message": "Add ₹120 more to use this coupon." }]
  }
}
```

**Status codes:** 200 OK · 201 Created · 400 validation · 401 unauthenticated · 403 unauthorized · 404 not found · 409 conflict (duplicate/slot taken) · 422 business-rule violation · 429 rate-limited · 500 server error.

**Rules:** every mutating endpoint validates its body with a Zod schema from `packages/shared` · all list endpoints accept `?page=&limit=&sort=&q=` · money is always paise integers · dates are ISO 8601 UTC · every response carries `X-Request-Id` for log correlation · error `code` values are stable machine-readable strings the frontend maps to copy.

---

## 1. Auth — `/auth`

| Method | Path                    | Auth            | Purpose                            |
| ------ | ----------------------- | --------------- | ---------------------------------- |
| POST   | `/auth/otp/request`     | PUBLIC          | Send login OTP                     |
| POST   | `/auth/otp/verify`      | PUBLIC          | Verify OTP, issue tokens           |
| POST   | `/auth/login`           | PUBLIC          | Email + password (staff/admin)     |
| POST   | `/auth/refresh`         | PUBLIC (cookie) | Rotate tokens                      |
| POST   | `/auth/logout`          | AUTH            | Revoke refresh token               |
| POST   | `/auth/logout-all`      | AUTH            | Revoke all sessions                |
| GET    | `/auth/me`              | AUTH            | Current user + permissions         |
| POST   | `/auth/forgot-password` | PUBLIC          | Email reset link                   |
| POST   | `/auth/reset-password`  | PUBLIC          | Consume reset token                |
| PATCH  | `/auth/password`        | AUTH            | Change password (requires current) |

**POST `/auth/otp/request`** — body `{ "phone": "+919876543210", "purpose": "login" }` → `200 { "success": true, "data": { "requestId": "...", "expiresInSeconds": 300, "resendAfterSeconds": 30 } }`.
Errors: `400 INVALID_PHONE` · `429 OTP_RATE_LIMITED` (max 3/phone/hour, 10/IP/hour) · `503 SMS_PROVIDER_FAILED`.
**Never** return the OTP in the response, even in development — log it to the server console instead.

**POST `/auth/otp/verify`** — body `{ "phone", "code": "123456", "requestId" }` → sets both cookies, returns `{ "user": { id, name, phone, role, isNewUser } }`.
Errors: `400 OTP_INVALID` (returns `attemptsRemaining`) · `400 OTP_EXPIRED` · `429 OTP_MAX_ATTEMPTS` · `403 ACCOUNT_SUSPENDED`.

**POST `/auth/refresh`** — reads `clenzy_rt`, rotates the family, issues new pair. On **reuse of a consumed token**, revoke the entire family and return `401 REFRESH_REUSE_DETECTED` (this is the signal of a stolen token).

---

## 2. Users & addresses — `/users`, `/addresses`

| Method | Path                     | Auth | Purpose                         |
| ------ | ------------------------ | ---- | ------------------------------- |
| GET    | `/users/me`              | AUTH | Profile                         |
| PATCH  | `/users/me`              | AUTH | Update name/email/prefs         |
| POST   | `/users/me/verify-email` | AUTH | Send verification mail          |
| DELETE | `/users/me`              | AUTH | Request account deletion (DPDP) |
| GET    | `/addresses`             | AUTH | List own addresses              |
| POST   | `/addresses`             | AUTH | Create                          |
| GET    | `/addresses/:id`         | AUTH | Read own                        |
| PATCH  | `/addresses/:id`         | AUTH | Update                          |
| DELETE | `/addresses/:id`         | AUTH | Soft delete                     |
| POST   | `/addresses/:id/default` | AUTH | Set default                     |

**POST `/addresses`** — body `{ label, contactName, contactPhone, line1, line2?, landmark?, area, city, state, pincode, geo?: { lat, lng }, isDefault? }` → `201` with the created address including a resolved `serviceAreaId` and `isServiceable`.
Errors: `400 INVALID_PINCODE` · `422 AREA_NOT_SERVICEABLE` (includes `nearestServiceableAreas[]`) · `409 ADDRESS_LIMIT_REACHED` (max 10).
**Ownership is enforced server-side on every `:id` route — never trust a client-supplied `userId`.**

---

## 3. Catalog — `/services`, `/items`

| Method | Path              | Auth   | Purpose                                    |
| ------ | ----------------- | ------ | ------------------------------------------ |
| GET    | `/services`       | PUBLIC | Active categories (`?includeItems=true`)   |
| GET    | `/services/:slug` | PUBLIC | Category + its items                       |
| GET    | `/items`          | PUBLIC | Items (`?categoryId=&q=&popular=&areaId=`) |
| GET    | `/items/:id`      | PUBLIC | Single item                                |
| GET    | `/pricing`        | PUBLIC | Full price list grouped by category        |

`GET /services` → `{ categories: [{ id, name, slug, shortDescription, icon, image, turnaroundHours, expressAvailable, itemCount, startingPrice }] }`.
These endpoints are cached (`Cache-Control: public, max-age=300, stale-while-revalidate=3600`) and consumed by Next.js at build/ISR time.

---

## 4. Serviceability & slots — `/areas`, `/slots`

| Method | Path                          | Auth   | Purpose                            |
| ------ | ----------------------------- | ------ | ---------------------------------- |
| GET    | `/areas`                      | PUBLIC | Active service areas               |
| GET    | `/areas/check?pincode=190001` | PUBLIC | Serviceability check               |
| GET    | `/areas/:slug`                | PUBLIC | Area detail (for location pages)   |
| POST   | `/areas/notify-me`            | PUBLIC | Capture demand in unserviced areas |
| GET    | `/slots`                      | PUBLIC | Available slots                    |

**GET `/areas/check`** → `{ serviceable: true, area: { id, name, slug }, deliveryFee, minOrderValue, expressAvailable, estimatedTurnaroundHours }` or `{ serviceable: false, nearestAreas: [...] }`.

**GET `/slots?type=pickup&areaId=...&from=2026-09-04&days=7`** → `{ dates: [{ date, isHoliday, windows: [{ window, label, capacity, booked, available, cutoffPassed, disabled, disabledReason }] }] }`.
Availability is advisory — **the authoritative capacity check happens inside the order-placement transaction.**

---

## 5. Cart — `/cart`

Guest carts live in `localStorage`. Once authenticated, the cart is server-side so it survives device changes.

| Method | Path                  | Auth   | Purpose                        |
| ------ | --------------------- | ------ | ------------------------------ |
| GET    | `/cart`               | AUTH   | Current cart, re-priced live   |
| POST   | `/cart/items`         | AUTH   | Add/update an item             |
| PATCH  | `/cart/items/:itemId` | AUTH   | Change quantity                |
| DELETE | `/cart/items/:itemId` | AUTH   | Remove                         |
| DELETE | `/cart`               | AUTH   | Clear                          |
| POST   | `/cart/merge`         | AUTH   | Merge a guest cart on login    |
| POST   | `/cart/estimate`      | PUBLIC | Price a cart without saving it |

**POST `/cart/estimate`** — body `{ items: [{ serviceItemId, quantity }], areaId?, couponCode?, isExpress? }` → the full pricing breakdown. This endpoint is what the cart UI calls on every change: **the client never computes totals**, it only displays what the server returns. Errors: `404 ITEM_NOT_FOUND` · `422 ITEM_INACTIVE` · `422 ITEM_NOT_AVAILABLE_IN_AREA`.

---

## 6. Coupons — `/coupons`

| Method | Path                 | Auth | Purpose                             |
| ------ | -------------------- | ---- | ----------------------------------- |
| POST   | `/coupons/validate`  | AUTH | Validate against a specific cart    |
| GET    | `/coupons/available` | AUTH | Coupons this user can currently use |

**POST `/coupons/validate`** — body `{ code, items[], subtotal, areaId }` → `{ valid: true, coupon: { code, description, discountType, discountValue }, discountAmount, newTotal }`.
Errors: `404 COUPON_NOT_FOUND` · `422 COUPON_EXPIRED` · `422 COUPON_NOT_STARTED` · `422 COUPON_MIN_ORDER_NOT_MET` (with `shortfallAmount`) · `422 COUPON_USAGE_LIMIT_REACHED` · `422 COUPON_ALREADY_USED_BY_USER` · `422 COUPON_FIRST_ORDER_ONLY` · `422 COUPON_NOT_APPLICABLE_TO_ITEMS`.
**Validation here is advisory; it is re-run authoritatively at order placement.**

---

## 7. Orders — `/orders`

| Method | Path                                    | Auth | Purpose                 |
| ------ | --------------------------------------- | ---- | ----------------------- |
| POST   | `/orders`                               | AUTH | Place an order          |
| GET    | `/orders`                               | AUTH | Own order history       |
| GET    | `/orders/:orderNumber`                  | AUTH | Own order detail        |
| GET    | `/orders/:orderNumber/track`            | AUTH | Status timeline         |
| POST   | `/orders/:orderNumber/cancel`           | AUTH | Cancel (if allowed)     |
| POST   | `/orders/:orderNumber/reschedule`       | AUTH | Reschedule a slot       |
| POST   | `/orders/:orderNumber/approve-revision` | AUTH | Approve a revised price |
| POST   | `/orders/:orderNumber/reclean`          | AUTH | Request a free re-clean |
| GET    | `/orders/:orderNumber/invoice`          | AUTH | PDF invoice             |
| POST   | `/orders/:orderNumber/review`           | AUTH | Submit a rating         |

**POST `/orders`** — body:

```json
{
  "items": [{ "serviceItemId": "...", "quantity": 3 }],
  "pickupAddressId": "...",
  "deliveryAddressId": "...",
  "pickupSlot": { "date": "2026-09-05", "window": "09:00-11:00" },
  "deliverySlot": { "date": "2026-09-07", "window": "16:00-18:00" },
  "isExpress": false,
  "couponCode": "FIRST50",
  "paymentMethod": "online",
  "customerNote": "Ring the upper bell",
  "idempotencyKey": "uuid-v4-from-client"
}
```

Server sequence, all inside one Mongo transaction: validate schema → load and re-price every item from the DB (**ignore any client price**) → verify addresses belong to the user and are serviceable → verify both slots exist, aren't past cutoff, and have capacity → re-validate the coupon → compute totals + tax → enforce min order and COD cap → create the order as `PENDING_PAYMENT` (online) or `PLACED` (COD) → decrement slot capacity → increment coupon usage → create the payment record → commit. Then, outside the transaction, create the Razorpay order and enqueue notifications.

Response `201`:

```json
{ "order": { "orderNumber": "CLZ-260905-0042", "status": "PENDING_PAYMENT", "pricing": {...} },
  "payment": { "gateway": "razorpay", "razorpayOrderId": "order_xxx", "amount": 129900, "keyId": "rzp_live_xxx" } }
```

Errors: `422 MIN_ORDER_NOT_MET` · `409 SLOT_UNAVAILABLE` (returns fresh slot options) · `422 SLOT_CUTOFF_PASSED` · `422 ADDRESS_NOT_SERVICEABLE` · `422 COD_LIMIT_EXCEEDED` · `422 INVALID_DELIVERY_DATE` (earlier than turnaround allows) · `409 DUPLICATE_REQUEST` (idempotency key replay — returns the original order rather than creating a second one).

**POST `/orders/:orderNumber/cancel`** — body `{ reason }`. Allowed only while status ∈ {`PENDING_PAYMENT`, `PLACED`, `CONFIRMED`, `PICKUP_SCHEDULED`}; after that returns `422 CANCELLATION_NOT_ALLOWED` with support contact details. On success: releases slot capacity, decrements coupon usage, and initiates a refund if prepaid.

**POST `/orders/:orderNumber/reschedule`** — body `{ type: "pickup"|"delivery", date, window }`. Errors: `422 MAX_RESCHEDULES_REACHED` · `422 RESCHEDULE_NOT_ALLOWED_IN_STATUS` · `409 SLOT_UNAVAILABLE`.

**GET `/orders/:orderNumber/track`** → `{ status, statusLabel, timeline: [{ status, label, at, isCompleted, isCurrent, note }], estimatedDelivery, agent: { name, phone } | null }`. Agent contact details are exposed **only** while the order is `OUT_FOR_PICKUP`/`OUT_FOR_DELIVERY`.

---

## 8. Payments — `/payments`

| Method | Path                            | Auth            | Purpose                                    |
| ------ | ------------------------------- | --------------- | ------------------------------------------ |
| POST   | `/payments/verify`              | AUTH            | Client-reported completion (advisory only) |
| GET    | `/payments/status/:orderNumber` | AUTH            | Poll authoritative payment state           |
| POST   | `/payments/retry/:orderNumber`  | AUTH            | New gateway order for a failed payment     |
| POST   | `/webhooks/razorpay`            | PUBLIC (signed) | **Authoritative** payment events           |

**POST `/webhooks/razorpay`** — mounted with a raw-body parser **before** `express.json()`. Verifies `X-Razorpay-Signature` via HMAC-SHA256 with `RAZORPAY_WEBHOOK_SECRET`; rejects with `400` on mismatch. Persists the event to `webhookEvents` keyed by event id (dedupe), then processes `payment.captured`, `payment.failed`, `refund.processed`, `refund.failed`. **Always returns `200` once the event is stored**, even if downstream processing fails — otherwise Razorpay retries forever; failures are retried by our own job instead.

**POST `/payments/verify`** exists only to speed up the UI. It verifies the signature and may optimistically flip the status, but the webhook remains the source of truth, and the order is not fulfilled on this call alone.

---

## 9. Notifications & content — `/notifications`, `/content`

| Method | Path                                     | Auth   | Purpose                                         |
| ------ | ---------------------------------------- | ------ | ----------------------------------------------- |
| GET    | `/notifications`                         | AUTH   | In-app list (`?unreadOnly=`)                    |
| GET    | `/notifications/unread-count`            | AUTH   | Badge count                                     |
| PATCH  | `/notifications/:id/read`                | AUTH   | Mark read                                       |
| PATCH  | `/notifications/read-all`                | AUTH   | Mark all read                                   |
| PATCH  | `/notifications/preferences`             | AUTH   | Channel opt-outs                                |
| GET    | `/content/faqs`                          | PUBLIC | FAQs by category                                |
| GET    | `/content/testimonials`                  | PUBLIC | Approved testimonials                           |
| GET    | `/content/banners?placement=`            | PUBLIC | Active banners                                  |
| GET    | `/content/posts`, `/content/posts/:slug` | PUBLIC | Blog (V2)                                       |
| GET    | `/content/settings/public`               | PUBLIC | Public settings (fees, hours, support contacts) |
| POST   | `/leads`                                 | PUBLIC | Fast-path pickup request                        |
| POST   | `/contact`                               | PUBLIC | Contact form                                    |
| POST   | `/b2b-enquiries`                         | PUBLIC | Commercial enquiry                              |
| GET    | `/reviews?featured=true`                 | PUBLIC | Approved reviews for the site                   |

All public form POSTs are rate-limited (5/hour/IP) and protected by a honeypot field plus Cloudflare Turnstile (free) if spam appears.

---

## 10. Admin — `/admin/*` (ADMIN unless noted)

### Dashboard & reports

| Method | Path                                                       | Purpose                                                          |
| ------ | ---------------------------------------------------------- | ---------------------------------------------------------------- |
| GET    | `/admin/dashboard/stats?period=today\|week\|month`         | Revenue, order counts by status, new customers, AOV, with deltas |
| GET    | `/admin/dashboard/revenue-chart?from=&to=&granularity=day` | Time series                                                      |
| GET    | `/admin/dashboard/popular-services?limit=10`               | Top categories/items by revenue and volume                       |
| GET    | `/admin/reports/orders.csv?from=&to=&status=`              | Export                                                           |
| GET    | `/admin/reports/revenue?from=&to=`                         | Financial summary incl. refunds and COD vs online                |

### Orders (STAFF+)

| Method | Path                                     | Purpose                                                                             |
| ------ | ---------------------------------------- | ----------------------------------------------------------------------------------- |
| GET    | `/admin/orders`                          | `?status=&from=&to=&q=&areaId=&agentId=&paymentStatus=&page=`                       |
| GET    | `/admin/orders/:id`                      | Full detail incl. internal notes and audit trail                                    |
| POST   | `/admin/orders`                          | Create a manual order (phone/WhatsApp bookings)                                     |
| PATCH  | `/admin/orders/:id/status`               | `{ status, note }` — validated against the legal transition map                     |
| PATCH  | `/admin/orders/:id/items`                | Revise itemization after inspection; auto-flags customer approval if over threshold |
| PATCH  | `/admin/orders/:id/assign`               | `{ type: 'pickup'\|'delivery', agentId }`                                           |
| PATCH  | `/admin/orders/:id/slots`                | Reschedule on the customer's behalf                                                 |
| POST   | `/admin/orders/:id/notes`                | Internal note                                                                       |
| POST   | `/admin/orders/:id/cancel`               | Admin cancellation with refund decision                                             |
| POST   | `/admin/orders/:id/refund`               | **ADMIN only** — `{ amount, reason }`, full or partial                              |
| GET    | `/admin/orders/roster?date=&type=pickup` | Daily pickup/delivery roster for dispatch                                           |

### Catalog, pricing, coupons, areas, slots

| Method                | Path                             | Purpose                                                                |
| --------------------- | -------------------------------- | ---------------------------------------------------------------------- |
| POST/PATCH/DELETE     | `/admin/services[/:id]`          | Category CRUD (DELETE = deactivate)                                    |
| POST/PATCH/DELETE     | `/admin/items[/:id]`             | Item CRUD                                                              |
| PATCH                 | `/admin/items/bulk-price`        | `{ updates: [{ itemId, price }] }` — bulk repricing in one transaction |
| GET                   | `/admin/items/:id/price-history` | Audit of price changes                                                 |
| GET/POST/PATCH/DELETE | `/admin/coupons[/:id]`           | Coupon CRUD                                                            |
| GET                   | `/admin/coupons/:id/redemptions` | Usage log                                                              |
| GET/POST/PATCH/DELETE | `/admin/areas[/:id]`             | Service-area CRUD                                                      |
| PATCH                 | `/admin/areas/:id/availability`  | Fast toggle for pickup/delivery (snow days, holidays)                  |
| GET/POST/PATCH/DELETE | `/admin/slots/templates[/:id]`   | Slot definitions                                                       |
| GET                   | `/admin/slots/capacity?date=`    | Live capacity view                                                     |
| PATCH                 | `/admin/slots/capacity`          | Override capacity for a specific date                                  |

### Customers, staff, content, settings

| Method         | Path                                                         | Purpose                                               |
| -------------- | ------------------------------------------------------------ | ----------------------------------------------------- |
| GET            | `/admin/customers`                                           | `?q=&status=&sort=totalSpent`                         |
| GET            | `/admin/customers/:id`                                       | Profile, orders, addresses, lifetime value            |
| PATCH          | `/admin/customers/:id/status`                                | Suspend/reactivate                                    |
| POST           | `/admin/customers/:id/wallet`                                | **ADMIN** — credit/debit with reason (V2)             |
| GET/POST/PATCH | `/admin/staff[/:id]`                                         | Agent management, area assignment                     |
| PATCH          | `/admin/users/:id/role`                                      | **SUPERADMIN only**                                   |
| GET/PATCH      | `/admin/reviews[/:id]`                                       | Moderation queue: approve/reject/reply/feature        |
| GET/PATCH      | `/admin/leads[/:id]`                                         | Lead pipeline                                         |
| CRUD           | `/admin/content/faqs`, `/banners`, `/testimonials`, `/posts` | CMS                                                   |
| GET/PATCH      | `/admin/settings`                                            | **ADMIN** — business rules; every change audit-logged |
| GET            | `/admin/audit-logs`                                          | **SUPERADMIN** — `?entityType=&actorId=&from=`        |

### Agent endpoints (AGENT)

| Method | Path                              | Purpose                                 |
| ------ | --------------------------------- | --------------------------------------- |
| GET    | `/agent/tasks?date=`              | Assigned pickups/deliveries for the day |
| PATCH  | `/agent/tasks/:orderId/picked-up` | `{ actualItems?, photos? }`             |
| PATCH  | `/agent/tasks/:orderId/delivered` | `{ otp?, signature? }`                  |
| PATCH  | `/agent/tasks/:orderId/failed`    | `{ type, reason }`                      |

---

## 11. Rate limits

| Scope               | Limit                                                        |
| ------------------- | ------------------------------------------------------------ |
| Global per IP       | 100 req / 15 min                                             |
| `/auth/otp/request` | 3 / phone / hour, 10 / IP / hour                             |
| `/auth/otp/verify`  | 5 / phone / 15 min                                           |
| `/auth/login`       | 5 / IP / 15 min (plus per-account lockout after 10 failures) |
| `POST /orders`      | 10 / user / hour                                             |
| Public form POSTs   | 5 / IP / hour                                                |
| Admin endpoints     | 300 / user / 15 min                                          |
| Webhooks            | Exempt (verified by signature instead)                       |

Return `429` with a `Retry-After` header. Use `express-rate-limit` with an in-memory store at MVP; move to Redis only when the API runs on more than one instance.
