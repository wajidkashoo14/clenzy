# Payments, Order Lifecycle & Notifications — Clenzy

## 1. Payment architecture

### 1.1 Golden rule

**The frontend never determines whether an order is paid.** Razorpay's client-side success callback is a UI hint only. The server marks an order paid when (a) a signed webhook confirms capture, or (b) the server independently fetches the payment from Razorpay's API and sees `captured`. Anything else is how stores get robbed.

### 1.2 Methods supported

| Method                           | MVP | Notes                                                                             |
| -------------------------------- | --- | --------------------------------------------------------------------------------- |
| UPI (GPay, PhonePe, Paytm, BHIM) | ✅  | Will be the majority of transactions in India                                     |
| Debit/credit cards               | ✅  | Razorpay handles PCI scope; card data never touches our servers                   |
| Net banking                      | ✅  |                                                                                   |
| Wallets                          | ✅  | Enabled in the Razorpay dashboard                                                 |
| Cash on delivery                 | ✅  | Collected at delivery (or pickup, per owner policy), capped by `codMaxOrderValue` |
| Pay-later / EMI                  | ❌  | Irrelevant at these ticket sizes                                                  |
| Store credit / wallet            | V2  | Applied before gateway charge                                                     |

### 1.3 Prepaid flow (authoritative sequence)

```
1. Client  POST /orders                (cart, addresses, slots, coupon, idempotencyKey)
2. Server  TRANSACTION: re-price everything from DB, validate slots + coupon,
           create order status=PENDING_PAYMENT, reserve slot capacity,
           create payments row status=created                          → COMMIT
3. Server  Razorpay Orders API: create order for the EXACT server-computed amount
4. Server  → { orderNumber, razorpayOrderId, amount, keyId }
5. Client  opens Razorpay Checkout with that razorpayOrderId
6. User    pays
7a. Client receives success handler  → POST /payments/verify (advisory; verifies signature)
                                     → UI navigates to /checkout/processing and polls
7b. Razorpay → POST /webhooks/razorpay  payment.captured   ← AUTHORITATIVE
8. Server  verify HMAC signature; store raw event (dedupe by event id);
           mark payment captured; order paymentStatus=paid, status=PLACED;
           enqueue notifications
9. Client  poll GET /payments/status/:orderNumber sees paid → redirect to confirmation
```

**Amount integrity:** the amount sent to Razorpay is computed server-side from database prices. The client never transmits a price, subtotal, or total that the server trusts.

**Signature verification:**

- Checkout callback: `HMAC_SHA256(razorpay_order_id + "|" + razorpay_payment_id, KEY_SECRET) === razorpay_signature`
- Webhook: `HMAC_SHA256(rawRequestBody, WEBHOOK_SECRET) === X-Razorpay-Signature` — computed on the **raw body**, so the webhook route must be mounted before `express.json()`.

### 1.4 COD flow

Order is created directly as `PLACED` with `paymentStatus: pending`. The agent marks payment collected at delivery, which sets `paymentStatus: paid` with `method: cod`. Guard rails: COD disabled above `codMaxOrderValue`; optionally disabled for customers with repeated failed deliveries; the delivery agent's app requires an amount-collected confirmation before `DELIVERED` is allowed.

### 1.5 Failure and edge cases

| Case                                    | Handling                                                                                                                                                                                                            |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Payment failed**                      | Webhook `payment.failed` → order stays `PENDING_PAYMENT`, `paymentStatus: failed`. Customer sees a retry CTA valid for 30 min. Retry creates a _new_ Razorpay order against the same Clenzy order                   |
| **User abandons checkout**              | Order remains `PENDING_PAYMENT`. A cron job every 10 min expires orders older than 30 min: status → `CANCELLED` (reason: payment_timeout), slot capacity released, coupon usage decremented                         |
| **Webhook never arrives**               | A reconciliation job runs every 15 min over payments in `created`/`authorized` older than 10 min and queries Razorpay's API directly, then applies the true state. **This job is mandatory** — webhooks do get lost |
| **Duplicate webhook**                   | Deduped by `webhookEvents.eventId` unique index; processing is idempotent                                                                                                                                           |
| **Duplicate payment** (user pays twice) | Detected when a second `payment.captured` arrives for an already-paid order. Record it, flag the order, alert admin, and auto-initiate a refund of the duplicate                                                    |
| **Duplicate order submit** (double-tap) | Client sends an `idempotencyKey`; server returns the original order on replay instead of creating a second                                                                                                          |
| **Partial capture / amount mismatch**   | If the captured amount ≠ order total, do **not** mark paid — flag for admin review. This is the classic tampering signature                                                                                         |
| **Refund fails at gateway**             | `refund.failed` webhook → mark `REFUND_PENDING`, alert admin, retry manually                                                                                                                                        |
| **Chargeback/dispute**                  | Out of scope for automation; ensure the admin can see the payment id and export evidence                                                                                                                            |

### 1.6 Refunds

| Trigger                                 | Amount                             | Route                                                       |
| --------------------------------------- | ---------------------------------- | ----------------------------------------------------------- |
| Cancelled before pickup (prepaid)       | 100%                               | Razorpay refund API                                         |
| Cancelled after pickup                  | Per policy — **owner must define** | Razorpay refund or wallet credit                            |
| Item damaged/lost                       | Compensation per policy            | Partial refund or wallet credit                             |
| Price revised downward after inspection | Difference                         | Partial refund                                              |
| Duplicate payment                       | Full duplicate amount              | Automatic                                                   |
| Service failure / goodwill              | Discretionary                      | Wallet credit preferred (no gateway fee, encourages return) |

Rules: refunds are **ADMIN-only**, require a reason, require re-authentication, are always audit-logged, and are always initiated server-side through the gateway API (never marked refunded manually without an actual gateway refund, or your books will lie). Partial refunds must never exceed `amountPaid − amountRefunded`. Expected settlement: 5–7 business days — communicate this in the refund notification so support doesn't field the question.

### 1.7 Security checklist for payments

- `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` exist **only** on the API server; never in `NEXT_PUBLIC_*`
- Only `RAZORPAY_KEY_ID` is exposed to the browser
- Webhook endpoint verifies the signature before parsing or trusting anything
- Payment amounts recomputed server-side at every step
- No card/UPI data ever stored, logged, or transmitted through our servers
- Every payment state change is written to `auditLogs`
- Use test keys in dev/staging and live keys only in production — enforce this in `config/env.ts` by rejecting a live key when `NODE_ENV !== 'production'`

---

## 2. Order status lifecycle

```
                    ┌──────────────────┐
                    │ PENDING_PAYMENT  │ (online only; 30-min expiry)
                    └────────┬─────────┘
                    paid ✓   │            payment failed / timeout
                             ▼                        └──────────► CANCELLED
                        ┌─────────┐
                        │ PLACED  │ ◄──── (COD orders start here)
                        └────┬────┘
                             ▼
                       ┌───────────┐
                       │ CONFIRMED │  (ops accepted; capacity verified)
                       └─────┬─────┘
                             ▼
                    ┌──────────────────┐
                    │ PICKUP_SCHEDULED │ ──► PICKUP_FAILED ──► (reschedule → PICKUP_SCHEDULED
                    └────────┬─────────┘                        | 2 failures → CANCELLED)
                             ▼
                       ┌───────────┐
                       │ PICKED_UP │  (items in our custody; itemization confirmed)
                       └─────┬─────┘
                             ▼
                      ┌────────────┐
                      │ PROCESSING │  (washing / dry cleaning / pressing)
                      └─────┬──────┘
                            ▼
                   ┌────────────────┐
                   │ QUALITY_CHECK  │  (re-clean loop possible → back to PROCESSING)
                   └───────┬────────┘
                           ▼
                       ┌───────┐
                       │ READY │  (packed, awaiting dispatch)
                       └───┬───┘
                           ▼
                 ┌───────────────────┐
                 │ OUT_FOR_DELIVERY  │ ──► DELIVERY_FAILED ──► (reschedule → OUT_FOR_DELIVERY
                 └─────────┬─────────┘                          | N failures → held at facility)
                           ▼
                     ┌───────────┐
                     │ DELIVERED │  (COD collected here if applicable)
                     └─────┬─────┘
                           ▼  auto after N days with no complaint
                     ┌───────────┐
                     │ COMPLETED │  (terminal)
                     └───────────┘

Side states: CANCELLED (terminal) · REFUND_PENDING → REFUNDED (terminal)
Modifier flags (not states): isRescheduled, priceRevision.requiresApproval, failedPickupAttempts
```

**Design note:** rescheduling is a _slot change_, not a status — making `RESCHEDULED` a status would break the linear progress timeline the customer sees. Track it via `rescheduleCount` and the status history instead.

### 2.1 Who may perform each transition

| Transition                                    |    customer     | agent | staff | admin |         System          |
| --------------------------------------------- | :-------------: | :---: | :---: | :---: | :---------------------: |
| → PENDING_PAYMENT                             | ✓ (place order) |       |       |       |                         |
| PENDING_PAYMENT → PLACED                      |                 |       |       |       |       ✓ (webhook)       |
| PENDING_PAYMENT → CANCELLED                   |        ✓        |       |       |   ✓   |       ✓ (timeout)       |
| PLACED → CONFIRMED                            |                 |       |   ✓   |   ✓   |  ✓ (auto-confirm rule)  |
| CONFIRMED → PICKUP_SCHEDULED                  |                 |       |   ✓   |   ✓   | ✓ (on agent assignment) |
| PICKUP_SCHEDULED → PICKED_UP                  |                 |   ✓   |   ✓   |   ✓   |                         |
| PICKUP_SCHEDULED → PICKUP_FAILED              |                 |   ✓   |   ✓   |   ✓   |                         |
| PICKED_UP → PROCESSING                        |                 |       |   ✓   |   ✓   |                         |
| PROCESSING → QUALITY_CHECK                    |                 |       |   ✓   |   ✓   |                         |
| QUALITY_CHECK → PROCESSING (rework)           |                 |       |   ✓   |   ✓   |                         |
| QUALITY_CHECK → READY                         |                 |       |   ✓   |   ✓   |                         |
| READY → OUT_FOR_DELIVERY                      |                 |   ✓   |   ✓   |   ✓   |                         |
| OUT_FOR_DELIVERY → DELIVERED                  |                 |   ✓   |   ✓   |   ✓   |                         |
| OUT_FOR_DELIVERY → DELIVERY_FAILED            |                 |   ✓   |   ✓   |   ✓   |                         |
| DELIVERED → COMPLETED                         |                 |       |       |   ✓   |    ✓ (after N days)     |
| PLACED/CONFIRMED/PICKUP_SCHEDULED → CANCELLED |        ✓        |       |   ✓   |   ✓   |                         |
| Any → CANCELLED (post-pickup)                 |                 |       |       |   ✓   |                         |
| → REFUND_PENDING → REFUNDED                   |                 |       |       |   ✓   |  ✓ (webhook confirms)   |

Implement this as an explicit transition map in `services/orderStatus.service.ts`. **Every status change goes through one function** that validates (current status, target status, actor role), writes the history entry, and enqueues notifications. Never let a controller write `order.status` directly.

---

## 3. Notification system

### 3.1 Channel strategy and cost reality

| Channel        | Cost (approx., India)                             | Use it for                                                   |
| -------------- | ------------------------------------------------- | ------------------------------------------------------------ |
| **In-app**     | Free                                              | Everything — always write a record                           |
| **Email**      | Free to ~3k/mo (Resend), then ~$20/mo             | Detailed, non-urgent, receipts, invoices                     |
| **SMS**        | ₹0.15–0.25 per transactional SMS (DLT-registered) | Time-critical, action-required moments only                  |
| **WhatsApp**   | ~₹0.35–0.80 per conversation (utility template)   | V2 — richer, better read rates, but per-conversation billing |
| **Push (PWA)** | Free                                              | V2 — replaces most SMS once adoption is decent               |

**Cost discipline:** at 500 orders/day, SMS-ing every status change (10 states) costs roughly ₹750–1,250/day (₹22k–37k/month) — completely unjustifiable. Below, SMS is restricted to five genuinely time-critical events. This is a deliberate architectural decision: **every event writes an in-app notification; only some escalate to paid channels**, and each channel is individually toggleable per event in admin settings so the owner can tune spend without a deploy.

### 3.2 Notification matrix

| Event                                | In-app |   Email    | SMS | WhatsApp (V2) | Push (V2)  | Notes                                                                                 |
| ------------------------------------ | :----: | :--------: | :-: | :-----------: | :--------: | ------------------------------------------------------------------------------------- |
| Signup / first login                 |   ✓    |     ✓      |  —  |       —       |     —      | Welcome mail; OTP itself is transactional SMS by definition                           |
| **OTP for login**                    |   —    |     —      |  ✓  |       —       |     —      | Mandatory. Not a "notification", it's the auth channel                                |
| Order placed (prepaid, paid)         |   ✓    |     ✓      |  ✓  |       ✓       |     ✓      | **SMS justified** — the primary receipt for many users                                |
| Order placed (COD)                   |   ✓    |     ✓      |  ✓  |       ✓       |     ✓      | Same                                                                                  |
| Payment failed                       |   ✓    |     ✓      |  ✓  |       ✓       |     ✓      | **SMS justified** — action required, revenue at risk                                  |
| Order confirmed by ops               |   ✓    |     —      |  —  |       ✓       |     ✓      | Low information gain; don't pay for it                                                |
| Pickup scheduled / agent assigned    |   ✓    |     ✓      |  —  |       ✓       |     ✓      | Email carries the agent name + window                                                 |
| **Pickup reminder** (evening before) |   ✓    |     —      |  ✓  |       ✓       |     ✓      | **SMS justified** — directly reduces failed pickups, which cost far more than the SMS |
| Agent out for pickup                 |   ✓    |     —      |  —  |       ✓       |     ✓      | WhatsApp/push ideal; SMS optional per owner                                           |
| Picked up (custody confirmation)     |   ✓    |     ✓      |  —  |       ✓       |     ✓      | Email includes the itemized list — important dispute evidence                         |
| Price revised — approval needed      |   ✓    |     ✓      |  ✓  |       ✓       |     ✓      | **SMS justified** — blocks the order until answered                                   |
| Processing started                   |   ✓    |     —      |  —  |       —       |     ✓      |                                                                                       |
| Quality check                        |   —    |     —      |  —  |       —       |     —      | Internal only; don't notify                                                           |
| Ready for delivery                   |   ✓    |     ✓      |  —  |       ✓       |     ✓      |                                                                                       |
| **Out for delivery**                 |   ✓    |     —      |  ✓  |       ✓       |     ✓      | **SMS justified** — customer must be present; include agent phone and COD amount      |
| Delivered                            |   ✓    |     ✓      |  —  |       ✓       |     ✓      | Email = invoice + review request                                                      |
| Pickup/delivery failed               |   ✓    |     ✓      |  ✓  |       ✓       |     ✓      | **SMS justified** — needs immediate rescheduling                                      |
| Order cancelled                      |   ✓    |     ✓      |  ✓  |       ✓       |     ✓      | Include refund expectations                                                           |
| Refund initiated                     |   ✓    |     ✓      |  —  |       ✓       |     ✓      |                                                                                       |
| Refund completed                     |   ✓    |     ✓      |  ✓  |       ✓       |     ✓      | **SMS justified** — money-related, high anxiety                                       |
| Order completed                      |   ✓    |     —      |  —  |       —       |     —      |                                                                                       |
| Review request                       |   ✓    |     ✓      |  —  |       —       |     ✓      | One email only, 24h after delivery. Never nag                                         |
| Re-clean accepted                    |   ✓    |     ✓      |  —  |       ✓       |     ✓      |                                                                                       |
| Marketing / offers                   |   ✓    | ✓ (opt-in) |  ✗  |       ✗       | ✓ (opt-in) | **Never send promotional SMS** — DLT rules, cost, and it destroys trust               |

**MVP channels: in-app + email + SMS (the 8 rows marked "SMS justified" plus OTP).** WhatsApp and push arrive in V2.

### 3.3 Delivery architecture

```
Business event (status change, payment, signup)
   → NotificationService.send({ userId, type, orderId, data })
       → resolve template + channel set for this event
       → check user's notificationPrefs (opt-outs respected, except transactional/legal)
       → check admin settings channel toggles
       → write notifications row per channel (status=queued)
       → dispatch via integration adapter (Resend / MSG91)
       → update status=sent|failed with providerMessageId
   Failures → retried by a cron job with exponential backoff, max 3 attempts, then status=failed + admin alert
```

MVP uses direct dispatch with a DB-backed retry job — **not** BullMQ/Redis. That's the right amount of infrastructure for this volume. Move to a real queue when send volume or latency demands it, not before.

**Implementation rules:** templates live in `services/notifications/templates/` keyed by event type, one file per template, with typed data payloads · never `await` notification sends inside the request path for anything the user is waiting on (fire and forget, or dispatch after the response) · never send a notification inside a database transaction (if the transaction rolls back, the message is already gone) · always write the in-app record even if the paid channel fails · include an order deep link in every message · keep SMS under 160 characters and include the brand name (DLT templates must be pre-registered and matched exactly — see [INTEGRATIONS.md](INTEGRATIONS.md)).

### 3.4 Sample copy

- **SMS — order placed:** `Clenzy: Order CLZ-260905-0042 confirmed. Pickup Fri 5 Sep, 9-11 AM. Track: clenzy.in/t/42`
- **SMS — out for delivery:** `Clenzy: Your order CLZ-260905-0042 is out for delivery. Agent Bilal, 9XXXXXXXXX. COD due: Rs 1299.`
- **SMS — pickup reminder:** `Clenzy: Pickup tomorrow 9-11 AM for order CLZ-260905-0042. Please keep items ready.`
- **Email — delivered:** subject `Your Clenzy order is delivered — invoice inside`, body with itemization, amounts, re-clean window notice, and a review CTA.

All SMS templates must be registered on DLT with matching variable placeholders before they will deliver in India.
