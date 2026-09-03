# Testing Strategy — Clenzy

## 1. Philosophy

Test where bugs cost money. In this application that is, in order: **payments → order placement → pricing → auth → order lifecycle → everything else.** A 95% coverage number that skips the payment webhook is worthless.

Do **not** chase 100% coverage. Target ~70% overall, with these areas at or near 100%:

- Pricing calculation (subtotal, express, delivery fee, coupon, tax, grand total)
- Coupon validation rules
- Order placement transaction (including concurrency)
- Payment verification and webhook processing
- Order status transition map and role permissions
- Auth: OTP, JWT issuance/refresh/rotation, RBAC

## 2. Tools

| Layer            | Tool                                                  | Notes                                                                  |
| ---------------- | ----------------------------------------------------- | ---------------------------------------------------------------------- |
| Unit (both apps) | **Vitest**                                            | Faster than Jest, native ESM/TS, same API                              |
| React components | **Vitest + React Testing Library**                    | Test behaviour, never implementation details                           |
| API integration  | **Vitest + Supertest + `mongodb-memory-server`**      | Real Mongo (replica-set mode, so transactions work), no mocking the DB |
| E2E              | **Playwright**                                        | Chromium + WebKit, plus mobile viewport projects                       |
| Accessibility    | **`@axe-core/playwright`** + `eslint-plugin-jsx-a11y` | Automated pass in E2E                                                  |
| Performance      | **Lighthouse CI**                                     | Budgets enforced in the pipeline                                       |
| Load             | **k6**                                                | Only for order placement / slot concurrency                            |
| Security         | **`npm audit`, `gitleaks`, OWASP ZAP baseline**       | ZAP as a one-off pre-launch scan                                       |
| API contracts    | Shared **Zod** schemas                                | The schema is the contract; test that handlers reject invalid input    |

**Do not mock MongoDB.** `mongodb-memory-server` started as a replica set gives real query behaviour and real transactions. Mocked database calls in this application would hide exactly the bugs that matter.

**Do mock external HTTP** (Razorpay, MSG91, Resend, Cloudinary, Maps) via the `integrations/` adapter layer — which exists precisely so tests can swap in fakes. Use `msw` for the frontend.

## 3. Unit tests

**Backend (`apps/api`)** — services in isolation:

- `pricing.service` — every combination: express on/off, delivery fee thresholds, percentage vs flat coupon, coupon cap, tiered pricing, tax, rounding. **Assert in paise integers.** Include the awkward cases: ₹0 totals, a 100% coupon, a coupon larger than the subtotal (must clamp to zero, never negative).
- `coupon.service` — each rejection reason independently, expiry boundaries (exactly at `validUntil`), per-user limits, first-order-only against a user with and without prior orders.
- `orderStatus.service` — every legal transition passes; every illegal transition throws; role permissions enforced per the matrix in [PAYMENTS_AND_NOTIFICATIONS.md](PAYMENTS_AND_NOTIFICATIONS.md) §2.1.
- `slot.service` — cutoff logic across day boundaries and time zones (store UTC, present IST — write a test that would catch an IST/UTC mix-up).
- `payment.service` — signature verification with valid, invalid, and malformed signatures; amount-mismatch detection.
- Utilities: money formatting, phone normalization (`9876543210`, `+919876543210`, `09876543210` → one value), order-number generation uniqueness.

**Frontend (`apps/web`)** — behaviour, not internals:

- Cart store: add, increment, remove, clear, persistence, guest→user merge (including the case where both carts contain the same item).
- Form validation via React Hook Form + Zod resolvers.
- Components rendering all states: default, loading, empty, error, disabled.
- Formatters: ₹ display with Indian digit grouping, date/slot labels.

## 4. Integration tests (API)

Spin up the Express app with an in-memory replica set, seed fixtures, hit real routes with Supertest, assert on both response and database state.

**Must-have suites:**

- **Auth:** OTP request → verify → cookies set → `/auth/me` works → refresh rotates → old refresh token reuse revokes the family → logout revokes.
- **Order placement:** happy path creates the order, decrements slot capacity, increments coupon usage, and creates the payment row — all committed together. Then the failure paths: invalid slot, exhausted slot, non-serviceable address, below minimum order, COD over cap, inactive item, expired coupon. **Assert that on failure nothing was written** (no partial order, no consumed slot).
- **Idempotency:** the same `idempotencyKey` twice returns the same order and creates exactly one.
- **Concurrency (critical):** fire 20 simultaneous orders at a slot with capacity 5 → exactly 5 succeed, 15 receive `409 SLOT_UNAVAILABLE`, and `booked` equals 5. This test is the reason the transaction exists; without it you'll discover the bug in production on a busy Saturday.
- **Webhooks:** valid signature processes; invalid signature rejected with 400 and no state change; duplicate event id is ignored; out-of-order events (refund before capture) don't corrupt state; unknown event types return 200 without crashing.
- **Authorization:** for every admin route, a customer token returns 403; for every owned resource, user A cannot read or mutate user B's data. Write this as a table-driven test over the route list so new routes get covered by default.
- **Injection:** `{"$ne": null}` and `{"$gt": ""}` payloads against login, OTP verify, and lookup endpoints return 400, not data.
- **Cancellation/refund:** cancelling releases slot capacity and decrements coupon usage; refunds never exceed `amountPaid − amountRefunded`.

## 5. E2E tests (Playwright)

Run against a real dev stack with a seeded database and **Razorpay in test mode**. Keep the suite small and focused on revenue paths — a large, slow E2E suite gets disabled.

**Critical journeys (must pass before every deploy):**

1. Browse → add items → cart → OTP login → address → slots → coupon → **pay with a Razorpay test card** → confirmation → order visible in history with the correct status.
2. Same, but COD.
3. Payment failure → retry → success.
4. Serviceability: unserviceable pin code blocks checkout with the correct message.
5. Cancel an order before pickup → status updates, slot released.
6. Reschedule a pickup.
7. Admin: log in → find the order → advance status through the lifecycle → customer's tracking page reflects it.
8. Admin: change an item price → the public pricing page shows the new price (validates the ISR revalidation path).
9. Guest cart persists across reload and merges correctly after login.
10. Mobile viewport run of journey 1 (Playwright mobile project) — the checkout is the most likely thing to break on small screens.

**Accessibility assertions** run inside these journeys via `@axe-core/playwright` on home, catalog, cart, checkout, and order tracking. Fail on any serious/critical violation.

**Practices:** use `data-testid` only where a semantic/role-based selector genuinely isn't available (prefer `getByRole`) · never use arbitrary `waitForTimeout` — wait on state · reset the database between runs · run against the Vercel preview URL in CI on pull requests.

## 6. Payment testing (specific checklist)

Because this is where losses happen, test each explicitly in Razorpay test mode:

- [ ] Successful UPI, card, and net-banking payments
- [ ] Failed payment (test failure instrument) → order not fulfilled
- [ ] User closes the checkout modal → order stays `PENDING_PAYMENT`, expires after 30 min via the cron job
- [ ] Webhook received before the client callback (the common real-world ordering) → still correct
- [ ] Webhook received twice → processed once
- [ ] Webhook with a tampered signature → rejected, no state change
- [ ] **Tampered amount:** modify the amount client-side → server rejects, because it recomputes from the DB
- [ ] Refund full → gateway refund created, order marked refunded
- [ ] Refund partial → amounts reconcile, second refund cannot exceed the remainder
- [ ] Duplicate payment for one order → flagged and auto-refund initiated
- [ ] Reconciliation job correctly resolves an order whose webhook never arrived (simulate by disabling the webhook and paying)

## 7. Manual testing

Some things can't be automated economically. Before launch, walk through:

- **Real device testing** on a low-end Android (not just Chrome DevTools emulation) and an iPhone. Check the OTP autofill, the Razorpay UPI app-switch and return, sticky bars with the keyboard open, and safe-area insets.
- **Real SMS/email delivery** — deliverability cannot be tested with mocks. Check the sender id on the handset, delivery latency, and that emails don't land in spam.
- **A complete real order at ₹1** through live Razorpay before opening to customers, including a real refund.
- **Screen reader pass** (VoiceOver iOS) through the booking flow.
- **Keyboard-only pass** through checkout and admin.
- Browsers: Chrome, Safari (iOS + macOS), Firefox, Edge, and Android Chrome. Safari is where CSS and date-input assumptions break.

## 8. Load testing (k6, pre-launch only)

Not needed at MVP scale beyond one scenario: **concurrent slot booking.** Simulate 50 simultaneous order placements against limited capacity and assert no oversell, no negative capacity, and p95 under 1s. Optionally, 100 concurrent catalog reads to confirm indexes are doing their job.

## 9. CI pipeline

On every pull request:

1. Install (cached) → typecheck (`tsc --noEmit`) → lint (ESLint incl. jsx-a11y) → format check
2. Unit tests (both workspaces) with coverage thresholds enforced
3. API integration tests (in-memory Mongo replica set)
4. Build both apps → **bundle-size budget check (fails the build if exceeded)**
5. `npm audit --audit-level=high` and `gitleaks` secret scan
6. Deploy the Vercel preview → run the Playwright critical journeys against it
7. Lighthouse CI against the preview, with the budgets from [SEO_AND_PERFORMANCE.md](SEO_AND_PERFORMANCE.md) §7

**Merges to `main` are blocked unless all of the above pass.** On merge: deploy to production, run a post-deploy smoke test (health endpoint, homepage renders, a catalog API read), and alert on failure.

## 10. Definition of "tested" for a feature

A feature is not done until: unit tests cover its business rules · integration tests cover its endpoints including auth and validation failures · if it's on a critical journey, an E2E test covers it · all four UI states (loading, empty, error, success) are implemented and visually verified · it works on a 375px viewport · it passes a keyboard-only pass · no new axe violations · no new TypeScript `any`.
