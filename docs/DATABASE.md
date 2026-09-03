# Database Architecture — Clenzy (MongoDB + Mongoose)

## 0. Rules that override convenience

1. **Money is stored in paise (integers), never floats.** `total: 129900` = ₹1,299.00. Floating-point rupees will produce off-by-one-paise reconciliation bugs against Razorpay. Format for display only at the edge.
2. **Prices are snapshotted into orders.** An order line stores the name, price, and tax rate as they were at purchase time. Never resolve a past order's price by looking up the current catalog.
3. **Order placement is a transaction.** Requires an Atlas replica set. Create order + payment record + decrement slot capacity + increment coupon usage atomically, or not at all.
4. **Soft-delete catalog data** (`isActive: false`), never hard-delete anything an order might reference.
5. **Every document has `createdAt`/`updatedAt`** (`{ timestamps: true }`).
6. **All IDs are Mongo `ObjectId`.** Human-facing identifiers (order number, coupon code) are separate, indexed, unique string fields.

## 1. Collection overview & relationships

```
users ──1:N──▶ addresses
  │  │
  │  └──1:N──▶ orders ──1:N──▶ (orderItems: embedded array)
  │              │   ├──1:N──▶ (statusHistory: embedded array)
  │              │   ├──1:1──▶ payments (1:N if retries)
  │              │   ├──N:1──▶ coupons
  │              │   ├──N:1──▶ addresses (snapshotted copy embedded)
  │              │   └──1:1──▶ reviews
  │              └──N:1──▶ users (assignedPickupAgent / assignedDeliveryAgent)
  ├──1:N──▶ notifications
  ├──1:N──▶ walletTransactions   (V2)
  └──1:N──▶ refreshTokens

serviceCategories ──1:N──▶ serviceItems ──(snapshotted into)──▶ orders
serviceAreas  (pin-code serviceability; referenced by addresses + orders)
slotTemplates ──(generate)──▶ slotCapacity (per date+window counters)
coupons, faqs, posts, testimonials, banners, settings, auditLogs, leads, contactSubmissions
```

**Why some things are embedded and not separate collections:**

- `orderItems` → embedded in `orders`: always read with the order, never queried independently, bounded (<100 items). A separate collection would force a join for every order read.
- `statusHistory` → embedded: bounded (~15 entries), always shown with the order.
- `address` on an order → embedded **snapshot** (not a reference): if a customer edits or deletes their address later, the historical order must still show where it actually went.
- `pricing` → **not** a separate collection: it is fields on `serviceItems`. A separate pricing collection would be a 1:1 join for no benefit. Tiered/quantity pricing lives in an embedded array on the item.
- `adminUsers` → **not** a separate collection: one `users` collection with a `role` field. Two user collections means two auth paths, two places to check permissions, and eventual drift.

## 2. Collections

### `users`

| Field               | Type                 | Notes                                                                               |
| ------------------- | -------------------- | ----------------------------------------------------------------------------------- |
| `_id`               | ObjectId             |                                                                                     |
| `phone`             | String               | **Required, unique.** E.164-normalized `+919XXXXXXXXX`. Primary identity            |
| `phoneVerified`     | Boolean              | default `false`                                                                     |
| `email`             | String               | Optional for customers, **required for staff/admin**. Sparse-unique, lowercased     |
| `emailVerified`     | Boolean              | default `false`                                                                     |
| `passwordHash`      | String               | Only for email-login users (staff/admin). bcrypt cost 12. `select: false`           |
| `name`              | String               | Required after first order                                                          |
| `role`              | Enum                 | `customer` \| `agent` \| `staff` \| `admin` \| `superadmin`. default `customer`     |
| `status`            | Enum                 | `active` \| `suspended` \| `deleted`. default `active`                              |
| `defaultAddressId`  | ObjectId → addresses |                                                                                     |
| `notificationPrefs` | Object               | `{ email: Bool, sms: Bool, whatsapp: Bool, push: Bool, marketing: Bool }`           |
| `walletBalance`     | Number (paise)       | default 0 (V2)                                                                      |
| `stats`             | Object               | `{ orderCount, totalSpent, lastOrderAt }` — denormalized for admin list performance |
| `referralCode`      | String               | Sparse-unique (V2)                                                                  |
| `referredBy`        | ObjectId → users     | (V2)                                                                                |
| `lastLoginAt`       | Date                 |                                                                                     |
| `deletedAt`         | Date                 | Soft delete for DPDP-Act erasure requests                                           |

**Indexes:** `{ phone: 1 }` unique · `{ email: 1 }` unique sparse · `{ role: 1, status: 1 }` · `{ createdAt: -1 }` · `{ name: 'text', phone: 'text', email: 'text' }` for admin search.
**Constraints:** a user with `role !== 'customer'` must have `email` + `passwordHash`. Never return `passwordHash` or refresh tokens in any API response.

### `refreshTokens`

| Field             | Type             | Notes                                           |
| ----------------- | ---------------- | ----------------------------------------------- |
| `userId`          | ObjectId → users |                                                 |
| `tokenHash`       | String           | SHA-256 of the token. Never store the raw token |
| `family`          | String           | Rotation family, for reuse-detection revocation |
| `userAgent`, `ip` | String           | For the "active sessions" UI                    |
| `expiresAt`       | Date             | TTL index                                       |
| `revokedAt`       | Date             |                                                 |

**Indexes:** `{ tokenHash: 1 }` unique · `{ userId: 1 }` · `{ expiresAt: 1 }` TTL (`expireAfterSeconds: 0`).

### `otpRequests`

| Field        | Type   | Notes                                        |
| ------------ | ------ | -------------------------------------------- |
| `phone`      | String |                                              |
| `codeHash`   | String | Hashed OTP — never store plaintext           |
| `purpose`    | Enum   | `login` \| `verify_phone` \| `order_confirm` |
| `attempts`   | Number | Max 3, then invalidate                       |
| `expiresAt`  | Date   | 5 minutes, TTL index                         |
| `consumedAt` | Date   |                                              |

**Indexes:** `{ phone: 1, createdAt: -1 }` · `{ expiresAt: 1 }` TTL.

### `addresses`

| Field                         | Type                    | Notes                                                          |
| ----------------------------- | ----------------------- | -------------------------------------------------------------- |
| `userId`                      | ObjectId → users        | Required                                                       |
| `label`                       | Enum                    | `home` \| `work` \| `other`                                    |
| `contactName`, `contactPhone` | String                  | May differ from the account holder                             |
| `line1`                       | String                  | Flat/house/building — required                                 |
| `line2`                       | String                  | Street/locality                                                |
| `landmark`                    | String                  | **Important in Indian addressing**                             |
| `area`                        | String                  | Must match a `serviceAreas.area`                               |
| `city`, `state`               | String                  | default Srinagar / Jammu & Kashmir                             |
| `pincode`                     | String                  | 6 digits, validated                                            |
| `geo`                         | Object                  | `{ type: 'Point', coordinates: [lng, lat] }` GeoJSON           |
| `serviceAreaId`               | ObjectId → serviceAreas | Resolved at save time                                          |
| `isDefault`                   | Boolean                 | Only one true per user — enforce in a service, not just a hook |
| `deletedAt`                   | Date                    | Soft delete; orders keep their own snapshot                    |

**Indexes:** `{ userId: 1, deletedAt: 1 }` · `{ pincode: 1 }` · `{ geo: '2dsphere' }` (for future agent routing).

### `serviceCategories`

| Field                             | Type    | Notes                                         |
| --------------------------------- | ------- | --------------------------------------------- |
| `name`                            | String  | e.g. "Dry Cleaning"                           |
| `slug`                            | String  | Unique, URL-safe — drives `/services/[slug]`  |
| `description`, `shortDescription` | String  |                                               |
| `icon`                            | String  | Lucide icon name                              |
| `image`                           | Object  | `{ url, publicId, alt }` (Cloudinary)         |
| `turnaroundHours`                 | Number  | Default turnaround for items in this category |
| `expressAvailable`                | Boolean |                                               |
| `sortOrder`                       | Number  |                                               |
| `isActive`                        | Boolean |                                               |
| `seo`                             | Object  | `{ title, description, keywords[] }`          |

**Indexes:** `{ slug: 1 }` unique · `{ isActive: 1, sortOrder: 1 }`.

### `serviceItems` — _this is your pricing table_

| Field                        | Type                         | Notes                                                                       |
| ---------------------------- | ---------------------------- | --------------------------------------------------------------------------- |
| `categoryId`                 | ObjectId → serviceCategories | Required                                                                    |
| `name`                       | String                       | e.g. "Shirt", "Saree (Plain)", "Carpet (per sq ft)"                         |
| `slug`                       | String                       | Unique within category                                                      |
| `description`, `careNote`    | String                       | e.g. "Hand-finished, steam pressed"                                         |
| `unit`                       | Enum                         | `piece` \| `kg` \| `sqft` \| `set` \| `pair`                                |
| `price`                      | Number (paise)               | **The single source of pricing truth**                                      |
| `mrp`                        | Number (paise)               | Optional strike-through price for promos                                    |
| `expressPrice`               | Number (paise)               | Optional explicit express price; else the global express multiplier applies |
| `taxRatePercent`             | Number                       | e.g. 18 or 0. **Store per item from day one**                               |
| `hsnCode`                    | String                       | For GST invoicing when registered                                           |
| `minQuantity`, `maxQuantity` | Number                       | default 1 / 99                                                              |
| `turnaroundHours`            | Number                       | Overrides the category default                                              |
| `tieredPricing`              | Array                        | `[{ minQty, unitPrice }]` — optional bulk pricing                           |
| `image`                      | Object                       | Cloudinary ref                                                              |
| `sortOrder`                  | Number                       |                                                                             |
| `isActive`                   | Boolean                      | Soft-delete flag                                                            |
| `isPopular`                  | Boolean                      | Surfaces in "Popular items"                                                 |
| `availableInAreas`           | [ObjectId]                   | Empty = available everywhere (e.g. carpet cleaning only in some zones)      |

**Indexes:** `{ categoryId: 1, isActive: 1, sortOrder: 1 }` · `{ slug: 1, categoryId: 1 }` unique · `{ name: 'text' }` · `{ isPopular: 1, isActive: 1 }`.

**How the owner changes prices without code:** Admin → Pricing → edit `price` → save. The API writes the new value, appends a `priceHistory` entry (below), and triggers on-demand ISR revalidation of `/pricing` and the affected `/services/[slug]`. Existing orders are unaffected because they hold snapshots.

### `priceHistory`

| Field                  | Type                    | Notes    |
| ---------------------- | ----------------------- | -------- |
| `serviceItemId`        | ObjectId → serviceItems |          |
| `oldPrice`, `newPrice` | Number (paise)          |          |
| `changedBy`            | ObjectId → users        |          |
| `reason`               | String                  | Optional |

**Indexes:** `{ serviceItemId: 1, createdAt: -1 }`. Cheap to keep and invaluable when revenue reports look wrong.

### `orders` — the core collection

| Field                                            | Type                       | Notes                                                                                                   |
| ------------------------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------- |
| `orderNumber`                                    | String                     | **Unique, human-facing**, e.g. `CLZ-250903-0042`. Generated with a per-day counter, not a random string |
| `userId`                                         | ObjectId → users           | Indexed                                                                                                 |
| `type`                                           | Enum                       | `standard` \| `reclean` \| `b2b`                                                                        |
| `parentOrderId`                                  | ObjectId → orders          | Set for re-clean orders                                                                                 |
| `status`                                         | Enum                       | See lifecycle in [PAYMENTS_AND_NOTIFICATIONS.md](PAYMENTS_AND_NOTIFICATIONS.md)                         |
| `items`                                          | Array (embedded)           | See below                                                                                               |
| `pricing`                                        | Object (embedded)          | See below                                                                                               |
| `pickupAddress`                                  | Object (embedded snapshot) | Full address copy + geo                                                                                 |
| `deliveryAddress`                                | Object (embedded snapshot) | Usually identical to pickup                                                                             |
| `pickupSlot`                                     | Object                     | `{ date: Date, window: '09:00-11:00', label: '9–11 AM' }`                                               |
| `deliverySlot`                                   | Object                     | Same shape; `estimated: Boolean` when auto-computed                                                     |
| `isExpress`                                      | Boolean                    |                                                                                                         |
| `paymentMethod`                                  | Enum                       | `online` \| `cod` \| `wallet`                                                                           |
| `paymentStatus`                                  | Enum                       | `pending` \| `paid` \| `failed` \| `refund_pending` \| `partially_refunded` \| `refunded`               |
| `couponCode`                                     | String                     | Snapshot of the code used                                                                               |
| `couponId`                                       | ObjectId → coupons         |                                                                                                         |
| `assignedPickupAgentId`                          | ObjectId → users           |                                                                                                         |
| `assignedDeliveryAgentId`                        | ObjectId → users           |                                                                                                         |
| `statusHistory`                                  | Array (embedded)           | `[{ status, changedBy, changedByRole, note, at }]`                                                      |
| `customerNote`                                   | String                     | Special instructions                                                                                    |
| `internalNotes`                                  | Array                      | `[{ note, by, at }]` — never shown to the customer                                                      |
| `pickupPhotos`                                   | Array                      | Cloudinary refs (V2)                                                                                    |
| `priceRevision`                                  | Object                     | `{ originalTotal, revisedTotal, reason, requiresApproval, approvedAt, approvedBy }`                     |
| `cancellation`                                   | Object                     | `{ reason, cancelledBy, cancelledByRole, at, refundEligible }`                                          |
| `rescheduleCount`                                | Number                     | Cap at 2                                                                                                |
| `failedPickupAttempts`, `failedDeliveryAttempts` | Number                     |                                                                                                         |
| `deliveredAt`, `completedAt`                     | Date                       |                                                                                                         |
| `ratingId`                                       | ObjectId → reviews         |                                                                                                         |
| `source`                                         | Enum                       | `web` \| `phone` \| `whatsapp` \| `admin` — attribution for ops                                         |

**Embedded `items[]`:**
`{ serviceItemId, categoryId, name, categoryName, unit, unitPrice, quantity, taxRatePercent, lineTotal, careNote, addedBy: 'customer'|'admin', isAdjusted: Boolean }`
`unitPrice` and `name` are snapshots. `isAdjusted` marks lines changed by ops after physical inspection.

**Embedded `pricing`:** (all paise)
`{ itemsSubtotal, expressSurcharge, deliveryFee, pickupFee, smallOrderFee, discountAmount, taxAmount, walletApplied, grandTotal, amountPaid, amountRefunded }`

**Indexes:**

- `{ orderNumber: 1 }` unique
- `{ userId: 1, createdAt: -1 }` — customer order history
- `{ status: 1, createdAt: -1 }` — admin queues
- `{ 'pickupSlot.date': 1, status: 1 }` — daily pickup roster
- `{ 'deliverySlot.date': 1, status: 1 }` — daily delivery roster
- `{ assignedPickupAgentId: 1, 'pickupSlot.date': 1 }`
- `{ paymentStatus: 1, createdAt: -1 }` — reconciliation sweeps
- `{ createdAt: -1 }` — dashboards
- `{ orderNumber: 'text', 'pickupAddress.contactPhone': 'text' }` — admin search

### `payments`

| Field              | Type              | Notes                                                                                     |
| ------------------ | ----------------- | ----------------------------------------------------------------------------------------- |
| `orderId`          | ObjectId → orders |                                                                                           |
| `userId`           | ObjectId → users  |                                                                                           |
| `gateway`          | Enum              | `razorpay` \| `cod` \| `wallet`                                                           |
| `gatewayOrderId`   | String            | `razorpay_order_id`                                                                       |
| `gatewayPaymentId` | String            | `razorpay_payment_id`, unique sparse                                                      |
| `gatewaySignature` | String            | Stored for audit                                                                          |
| `amount`           | Number (paise)    |                                                                                           |
| `currency`         | String            | `INR`                                                                                     |
| `status`           | Enum              | `created` \| `authorized` \| `captured` \| `failed` \| `refunded` \| `partially_refunded` |
| `method`           | String            | upi/card/netbanking/wallet — as reported by the gateway                                   |
| `failureReason`    | String            |                                                                                           |
| `idempotencyKey`   | String            | Unique — prevents duplicate charge records                                                |
| `webhookEvents`    | Array             | Raw event log `[{ event, payload, receivedAt }]`                                          |
| `refunds`          | Array             | `[{ refundId, amount, reason, status, initiatedBy, at }]`                                 |

**Indexes:** `{ orderId: 1 }` · `{ gatewayPaymentId: 1 }` unique sparse · `{ gatewayOrderId: 1 }` · `{ idempotencyKey: 1 }` unique sparse · `{ status: 1, createdAt: -1 }`.

### `webhookEvents` (raw log)

Store **every** inbound webhook before processing: `{ provider, eventId, eventType, signatureValid, payload, processedAt, processingError }`. Index `{ provider: 1, eventId: 1 }` unique — this is how you make webhook handling idempotent when Razorpay retries.

### `coupons`

| Field                     | Type             | Notes                                        |
| ------------------------- | ---------------- | -------------------------------------------- |
| `code`                    | String           | Unique, uppercase                            |
| `description`             | String           | Shown in the UI                              |
| `discountType`            | Enum             | `percentage` \| `flat`                       |
| `discountValue`           | Number           | Percent (1–100) or paise                     |
| `maxDiscountAmount`       | Number (paise)   | Caps percentage coupons                      |
| `minOrderValue`           | Number (paise)   |                                              |
| `validFrom`, `validUntil` | Date             |                                              |
| `usageLimitTotal`         | Number           | null = unlimited                             |
| `usageLimitPerUser`       | Number           | default 1                                    |
| `usedCount`               | Number           | Incremented **inside the order transaction** |
| `firstOrderOnly`          | Boolean          |                                              |
| `applicableCategories`    | [ObjectId]       | Empty = all                                  |
| `applicableAreas`         | [ObjectId]       | Empty = all                                  |
| `restrictedToUsers`       | [ObjectId]       | Empty = everyone                             |
| `isActive`                | Boolean          |                                              |
| `createdBy`               | ObjectId → users |                                              |

**Indexes:** `{ code: 1 }` unique · `{ isActive: 1, validUntil: 1 }`.

### `couponRedemptions`

`{ couponId, userId, orderId, discountAmount, redeemedAt }` — index `{ couponId: 1, userId: 1 }`. Needed to enforce per-user limits and to reverse usage counts on cancellation.

### `serviceAreas`

| Field                                  | Type            | Notes                                            |
| -------------------------------------- | --------------- | ------------------------------------------------ |
| `city`, `state`                        | String          |                                                  |
| `area`                                 | String          | e.g. "Rajbagh", "Lal Chowk"                      |
| `slug`                                 | String          | Unique — drives `/locations/[area]`              |
| `pincodes`                             | [String]        | Indexed array                                    |
| `pickupAvailable`, `deliveryAvailable` | Boolean         | Can be toggled independently (e.g. snow closure) |
| `expressAvailable`                     | Boolean         |                                                  |
| `deliveryFee`                          | Number (paise)  | Overrides the global default                     |
| `minOrderValue`                        | Number (paise)  | Optional area override                           |
| `serviceableCategories`                | [ObjectId]      | Empty = all                                      |
| `geoPolygon`                           | GeoJSON Polygon | Optional, for precise boundaries (V2)            |
| `isActive`                             | Boolean         |                                                  |
| `seo`                                  | Object          | For the location landing page                    |

**Indexes:** `{ pincodes: 1 }` · `{ slug: 1 }` unique · `{ isActive: 1, city: 1 }`.

### `slotTemplates` & `slotCapacity`

`slotTemplates`: `{ type: 'pickup'|'delivery', dayOfWeek: 0-6, window: '09:00-11:00', label, capacity, cutoffMinutesBefore, isActive, areaIds[] }` — the admin-configurable definition of what slots exist.

`slotCapacity`: `{ date, window, type, areaId, booked, capacity }` — the per-day counter, created lazily on first booking. **Increment inside the order transaction** and decrement on cancellation. Index `{ date: 1, window: 1, type: 1, areaId: 1 }` unique.

> Do not generate a document for every future slot up front — generate on demand and read availability as `capacity − booked`.

### `reviews`

`{ orderId (unique), userId, rating 1-5, comment, serviceQuality, timeliness, staffBehaviour, images[], status: 'pending'|'approved'|'rejected', moderatedBy, moderatedAt, adminReply, isFeatured }`
**Indexes:** `{ orderId: 1 }` unique · `{ status: 1, createdAt: -1 }` · `{ rating: -1, isFeatured: 1 }`.
**Constraint:** may only be created by the user who owns an order in `DELIVERED`/`COMPLETED` status.

### `notifications`

| Field               | Type              | Notes                                                   |
| ------------------- | ----------------- | ------------------------------------------------------- |
| `userId`            | ObjectId → users  |                                                         |
| `orderId`           | ObjectId → orders | Optional                                                |
| `type`              | String            | `order_placed`, `pickup_scheduled`, …                   |
| `channel`           | Enum              | `in_app` \| `email` \| `sms` \| `whatsapp` \| `push`    |
| `title`, `body`     | String            |                                                         |
| `data`              | Object            | Deep-link payload                                       |
| `status`            | Enum              | `queued` \| `sent` \| `delivered` \| `failed` \| `read` |
| `providerMessageId` | String            |                                                         |
| `error`             | String            |                                                         |
| `attempts`          | Number            | Retry counter                                           |
| `readAt`, `sentAt`  | Date              |                                                         |

**Indexes:** `{ userId: 1, createdAt: -1 }` · `{ userId: 1, channel: 1, readAt: 1 }` (unread badge) · `{ status: 1, attempts: 1 }` (retry job) · TTL on `createdAt` at 180 days for non-`in_app` rows to stop unbounded growth.

### `leads` (fast-path "Book a pickup" form) & `contactSubmissions` & `b2bEnquiries`

`{ name, phone, email, area, pincode, serviceInterest, preferredDate, preferredWindow, message, source, status: 'new'|'contacted'|'converted'|'lost', assignedTo, convertedOrderId, notes[] }`
**Indexes:** `{ status: 1, createdAt: -1 }` · `{ phone: 1 }`. These are sales pipeline data — the admin needs a working queue for them or they rot.

### `staff` — _not a separate collection_

Field staff are `users` with `role: 'agent'` plus an embedded `staffProfile`: `{ employeeId, assignedAreas: [ObjectId], vehicleNumber, isAvailable, shiftStart, shiftEnd, joinedAt }`.

### Content collections

- **`faqs`**: `{ question, answer (rich text), category, sortOrder, isActive }`
- **`posts`** (blog, V2): `{ title, slug (unique), excerpt, content, coverImage, author, tags[], status: 'draft'|'published', publishedAt, seo, readingMinutes }`
- **`testimonials`**: `{ name, area, rating, text, image, isFeatured, isActive, sourceReviewId }`
- **`banners`**: `{ title, subtitle, image, mobileImage, ctaText, ctaLink, placement: 'home_hero'|'home_strip'|'offers', startsAt, endsAt, sortOrder, isActive }`

### `settings` (single document, key-value)

All business rules from [PROJECT_REQUIREMENTS.md](PROJECT_REQUIREMENTS.md) §7 live here so the owner can change them without a deploy: `minOrderValue`, `deliveryFee`, `freeDeliveryThreshold`, `expressMultiplier`, `expressMinCharge`, `codMaxOrderValue`, `sameDayCutoffTime`, `reclean WindowHours`, `priceRevisionApprovalThresholdPercent`, `maxReschedules`, `defaultTurnaroundHours`, `businessHours`, `supportPhone`, `supportWhatsapp`, `supportEmail`, `gstNumber`, `gstEnabled`, `maintenanceMode`.
Cache in the API process with a 60-second TTL — this document is read on nearly every request.

### `auditLogs`

`{ actorId, actorRole, action, entityType, entityId, before, after, ip, userAgent, at }` — write on every admin mutation: price changes, refunds, status overrides, role changes, coupon creation, settings changes. Index `{ entityType: 1, entityId: 1, at: -1 }` and `{ actorId: 1, at: -1 }`. **Non-negotiable for anything touching money.**

## 3. Seed data required for a working dev environment

1 superadmin user · 2 agents · 8 service categories · ~60 service items with realistic Srinagar prices · 8 Srinagar service areas with real pin codes (190001–190025 range) · slot templates for Mon–Sat · 3 coupons (`FIRST50`, `FLAT100`, `WINTER20`) · ~15 FAQs · 5 testimonials · settings document with the placeholder defaults from PROJECT_REQUIREMENTS §7 · ~20 orders spread across every status so the admin dashboard is developable without manual clicking.

## 4. Backup & retention

Atlas continuous backups on the paid tier (M10+); on the free tier, run a nightly `mongodump` to Cloudinary/S3 via a cron job — **do not launch a business handling payments with zero backups.** Retain 30 daily + 12 monthly snapshots. Test a restore before launch, not after an incident. Personal data deletion requests (India's DPDP Act): anonymize `users` (clear name/phone/email, set `deletedAt`) while retaining order financial records, which must be kept for tax purposes.
