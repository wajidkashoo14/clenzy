# Security — Clenzy

This platform handles customer identities, home addresses, phone numbers, and money. Treat it as production-critical from the first commit, not as a hardening pass before launch.

## 1. Authentication

### Phone OTP (primary, customers)

- OTP is 6 digits, cryptographically random (`crypto.randomInt`, never `Math.random`).
- **Stored hashed** (SHA-256) in `otpRequests` — never in plaintext, never returned in an API response, never logged (in development, print it to the server console only).
- 5-minute expiry, max 3 verification attempts, then the request is invalidated and a new OTP must be requested.
- Rate limits: 3 requests per phone per hour, 10 per IP per hour, 30-second resend cooldown. Enforce **server-side**; a client-side countdown is cosmetic.
- Verification is constant-time (`crypto.timingSafeEqual`) to avoid timing oracles.
- Successful verification consumes the OTP (sets `consumedAt`) so it can't be replayed.
- Phone numbers normalized to E.164 before storage and comparison, so `9876543210`, `+919876543210`, and `09876543210` are one identity.

### Email + password (staff, admin, and optional for customers)

- **bcrypt, cost factor 12** (or argon2id if you prefer). Never MD5/SHA for passwords.
- Minimum 10 characters; check against a common-password list; no arbitrary composition rules (they produce weaker passwords).
- `passwordHash` field is `select: false` in Mongoose so it can never leak through a careless `findOne()` spread into a response.
- Account lockout after 10 failed attempts in 15 minutes, with exponential backoff.
- **Login responses must not distinguish "user not found" from "wrong password"** — a single `INVALID_CREDENTIALS` for both.
- Password reset: single-use token, hashed at rest, 30-minute expiry, invalidated on use and on password change; all refresh tokens revoked on reset.

### Tokens & sessions

- **Access JWT**: 15-minute expiry, HS256, contains `sub` (user id), `role`, `iat`, `exp`, `jti`. Nothing sensitive in the payload — JWTs are signed, not encrypted, and anyone can read them.
- **Refresh token**: 30 days, opaque random 256-bit value, stored **hashed** in `refreshTokens` so a database leak doesn't hand over live sessions.
- **Rotation with reuse detection:** each refresh issues a new token in the same `family` and consumes the old one. If a consumed token is presented again, revoke the entire family and force re-login — this is the standard defense against stolen refresh tokens.
- **Cookies, not localStorage:** `httpOnly` (blocks XSS token theft), `Secure`, `SameSite=Lax`, `Domain=.clenzy.in`, `Path=/`. `SameSite=Lax` allows normal top-level navigation while blocking cross-site POST CSRF.
- Separate secrets for access and refresh tokens (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`), each ≥32 random bytes.
- Logout revokes the refresh token server-side; "log out everywhere" revokes all families for the user.
- **Admin sessions:** 8-hour absolute expiry, 30-minute idle timeout, and mandatory re-authentication before refunds, role changes, and settings changes. TOTP 2FA for `admin`/`superadmin` in V2 — design the user schema with `totpSecret`/`totpEnabled` fields now.

## 2. Authorization (RBAC)

- Roles: `customer` < `agent` < `staff` < `admin` < `superadmin` (see [PROJECT_REQUIREMENTS.md](PROJECT_REQUIREMENTS.md) §4).
- **Every protected endpoint declares its requirement explicitly**: `router.post('/admin/orders/:id/refund', requireAuth, requireRole('admin'), reauthRecent(300), controller)`. There is no implicit inheritance based on route prefix alone — a route added under `/admin` without a role middleware must fail closed, so add a router-level guard _and_ per-route checks.
- **Ownership checks are separate from role checks.** A `customer` may read `/orders/:orderNumber` only if `order.userId === req.user.id`. Never resolve resources by an id supplied in the body when the owning id is available from the token.
- **The UI hiding a button is not authorization.** Every admin action is enforced server-side; assume an attacker calls the API directly.
- Role changes are `superadmin`-only and always audit-logged.
- Agents see only orders assigned to them or in their assigned areas — not the full order list.

## 3. API security

| Control                  | Implementation                                                                                                                   |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Input validation         | Zod schema on **every** request body, query, and param, from `packages/shared`. Reject unknown keys (`.strict()`)                |
| Rate limiting            | `express-rate-limit` per the table in [API_SPEC.md](API_SPEC.md) §11                                                             |
| Security headers         | `helmet()` — CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`    |
| CORS                     | Explicit origin allowlist from `CORS_ORIGINS`, `credentials: true`. **Never `origin: '*'` with credentials** (it's also invalid) |
| Payload size             | `express.json({ limit: '100kb' })`; larger only on upload routes                                                                 |
| HTTP parameter pollution | `hpp()` middleware                                                                                                               |
| Response headers         | Disable `X-Powered-By`; don't leak stack traces or Mongo errors to clients in production                                         |
| Request tracing          | `X-Request-Id` on every request/response, included in logs and Sentry                                                            |
| Timeouts                 | Server and outbound HTTP timeouts set explicitly (no infinite hangs on a slow provider)                                          |

## 4. Injection & data-layer safety

**NoSQL injection is the one people forget.** In Express, `req.body.phone` can be an _object_, so `User.findOne({ phone: req.body.phone })` with `{"phone": {"$ne": null}}` returns the first user in the collection. Defenses, applied together:

1. **Zod validation first** — if the schema says `z.string()`, an object never reaches the query. This alone stops it, which is why validation is mandatory on every route.
2. A custom sanitize middleware strips keys containing `$` and `.` from `body`/`params`/`query` as defense in depth (`apps/api/src/middlewares/sanitize.ts`). Not the `express-mongo-sanitize` package — it reassigns `req.query`, which Express 5 made a getter-only property, so it throws on every request; our version mutates in place instead.
3. Mongoose schema types with `strict: true` and casting enabled.
4. Never pass raw user input into `$where`, `$expr`, `$function`, or `mapReduce` — don't use them at all.
5. Never build a query by string concatenation or `JSON.parse` of user input.

**Also:**

- Mass-assignment: never `Object.assign(doc, req.body)` or `new User(req.body)`. Pick fields explicitly, and never accept `role`, `walletBalance`, `status`, or `_id` from a client payload.
- Sensitive fields (`passwordHash`, `totpSecret`, refresh tokens) marked `select: false` and excluded from all serializers.
- Use `.lean()` for read-only queries and explicit projections so you don't accidentally serialize internal fields.

## 5. XSS, CSRF, and clickjacking

**XSS:** React escapes by default — the risks are `dangerouslySetInnerHTML` (only for admin-authored rich text, and only after sanitizing with DOMPurify server-side _and_ client-side), user-supplied URLs (validate the scheme; block `javascript:`), and a permissive CSP. Ship a real CSP: `default-src 'self'`, explicit allowances for Razorpay checkout, Google Maps, GA, Cloudinary, and Sentry, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`. Avoid `unsafe-inline` for scripts (use nonces via Next.js middleware).

**CSRF:** `SameSite=Lax` cookies plus a strict CORS allowlist covers the realistic attack surface for a JSON API that never accepts form-encoded cross-site POSTs. Additionally: require `Content-Type: application/json` on mutations (browsers can't send that cross-origin without a preflight), and check the `Origin` header on state-changing requests. **Add double-submit CSRF tokens for admin mutations** — cheap insurance on the highest-value routes.

**Clickjacking:** `X-Frame-Options: DENY` and `frame-ancestors 'none'`. The Razorpay checkout runs in _its_ iframe, not ours — never embed our checkout in a frame.

## 6. File uploads

Applies to service images, banners, and pickup photos (V2).

- Upload only via authenticated, role-checked endpoints — no unsigned direct-to-Cloudinary presets.
- Validate MIME type against an allowlist **and** verify the file's magic bytes (a `.png` extension proves nothing).
- Enforce a 5MB cap at the middleware layer (`multer` limits), before the file reaches memory in full.
- Strip EXIF metadata (phone photos carry GPS coordinates of a customer's home).
- Never serve uploads from your own domain's root path; Cloudinary's separate domain isolates them.
- Randomize stored filenames; never use the client-supplied name.
- Rate-limit uploads per user.

## 7. Payment security

Covered fully in [PAYMENTS_AND_NOTIFICATIONS.md](PAYMENTS_AND_NOTIFICATIONS.md) §1.7. The three that matter most:

1. **Amounts are computed server-side from the database.** A client-supplied price is never trusted at any point.
2. **Payment status comes from a signature-verified webhook** (or a server-side API check), never from the browser's success callback.
3. **Secrets stay on the server.** Only the Razorpay key _id_ reaches the browser.

## 8. Secrets management

- Never commit `.env`. Add it to `.gitignore` in the first commit, before any secret exists.
- Use `git-secrets` or `gitleaks` as a pre-commit hook and in CI to block accidental key commits.
- Production secrets live only in Vercel/Railway environment settings and GitHub Actions secrets.
- Distinct secrets per environment; a staging leak must not compromise production.
- Rotate on any suspicion, on developer offboarding, and on schedule (annually at minimum).
- **If a secret is ever committed, rotating it is the fix — deleting the commit is not**, because it's already in clones, forks, and possibly a scraper's index.

## 9. Privacy & Indian legal compliance

- **DPDP Act 2023:** collect only what you need, state the purpose, obtain consent for marketing (separate from transactional), and support access and erasure requests. Implement account deletion as anonymization (clear name/phone/email, set `deletedAt`) while retaining financial records required for tax.
- **Data location:** Atlas Mumbai region keeps data in India, which simplifies compliance conversations.
- **Consent:** a cookie/analytics consent banner is required before loading GA. Marketing email/SMS requires separate opt-in — and **do not send promotional SMS at all** (DLT rules make it painful and it damages trust).
- **PII in logs:** never log full phone numbers, addresses, OTPs, tokens, or payment identifiers. Mask (`+9198****3210`) or omit. Configure Sentry's `beforeSend` to scrub.
- Publish Terms, Privacy Policy, Refund & Cancellation Policy, and Delivery Policy before launch (also a Razorpay onboarding requirement).

## 10. Infrastructure

- HTTPS everywhere; HSTS with `includeSubDomains` and a long max-age once you're confident.
- MongoDB Atlas: IP allowlist (remove `0.0.0.0/0` before launch), a dedicated least-privilege app user, TLS enforced.
- No SSH-accessible servers to harden (managed PaaS) — which is itself a security benefit.
- Dependencies: `npm audit` in CI, Dependabot enabled, pin versions with a committed lockfile, and review any new dependency before adding it (the supply chain is a real attack vector).
- Backups tested by actually performing a restore before launch.
- Uptime and error alerting configured so you learn about incidents from monitoring, not from customers.

## 11. Production security checklist

**Before launch — all must be checked:**

- [ ] `.env` is gitignored; no secret has ever been committed (verified with `gitleaks`)
- [ ] All secrets set in hosting provider env settings; separate values per environment
- [ ] Env validation crashes the server on missing/invalid variables
- [ ] Razorpay **live** keys only in production; webhook signature verification tested with a deliberately bad signature
- [ ] Payment amounts recomputed server-side; verified by attempting a tampered request
- [ ] Order placement runs in a transaction; verified by concurrent-order load test that slot capacity never goes negative
- [ ] Every endpoint has Zod validation; unknown keys rejected
- [ ] NoSQL injection tested (`{"$ne": null}` payloads against login and lookup endpoints)
- [ ] Every admin endpoint tested with a `customer` token → returns 403
- [ ] Ownership checks tested (user A cannot read/modify user B's order or address)
- [ ] Rate limits verified on OTP, login, and order placement
- [ ] `helmet()` enabled; CSP present and tested (no console violations in normal use)
- [ ] CORS restricted to known origins; `credentials: true` with an explicit allowlist
- [ ] Cookies are `httpOnly`, `Secure`, `SameSite=Lax`
- [ ] bcrypt cost ≥12; no plaintext or reversible password storage anywhere
- [ ] Refresh-token rotation and reuse detection verified
- [ ] Admin accounts use email+password (not OTP-only); default seed credentials rotated
- [ ] No stack traces, Mongo errors, or internal paths in production error responses
- [ ] PII scrubbed from logs and Sentry
- [ ] File uploads validated by magic bytes, size-capped, EXIF-stripped
- [ ] `npm audit` clean of high/critical; Dependabot on
- [ ] HTTPS enforced; HSTS set; HTTP redirects to HTTPS
- [ ] Atlas IP allowlist restricted; `0.0.0.0/0` removed
- [ ] Backups running **and a restore has been tested**
- [ ] Legal pages published
- [ ] Cookie consent gating analytics
- [ ] `/admin` is `noindex, nofollow` and excluded from the sitemap
- [ ] Sentry alerting configured and verified with a test error
- [ ] A documented incident response step exists: how to revoke all sessions, rotate keys, and disable payments quickly
