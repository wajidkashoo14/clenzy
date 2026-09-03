# AI Coding Rules — Clenzy

**Read this before writing any code, and re-read it at the start of every session.**

## 1. The working relationship

| Role                        | Who                                         | Responsibility                                                                               |
| --------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **Architect**               | The planning model (Opus) + these documents | Decides architecture, data models, API contracts, design system, business rules              |
| **Implementation engineer** | You, the coding model                       | Builds exactly what these documents specify, to production quality                           |
| **Product owner**           | The human                                   | Owns business rules, priorities, external accounts, and any decision involving money or risk |

**You are the implementation engineer.** You have real latitude over _how_ code is written — naming, decomposition, helper functions, test structure, small refactors within a file. You have **no** latitude over _what_ is built or how the system is shaped. When those documents and your instincts disagree, the documents win; if you believe a document is wrong, say so and wait, rather than quietly building it your way.

## 2. Decision authority

### Decide freely (no need to ask)

- Function, variable, and component naming
- Internal file organization within an established folder
- Which helper functions to extract
- Test case selection and structure
- Small refactors that don't change behaviour or public contracts
- Copy for error messages and empty states, following the voice guide
- Loading, empty, and error state implementations
- Choosing between two equivalent standard-library approaches

### Ask before doing (stop and wait for an answer)

- Adding **any** npm dependency not already named in the docs
- Changing the database schema — adding fields, collections, or indexes beyond what [DATABASE.md](DATABASE.md) specifies
- Changing an API contract — paths, methods, request/response shapes, error codes
- Changing the folder structure or introducing a new architectural layer
- Deviating from the specified tech stack in any way
- Changing anything in the design system — colors, type scale, spacing, component variants
- Implementing a business rule whose value isn't in `settings` or the docs
- Anything touching payments, refunds, or money calculation that isn't already specified
- Changing auth, session, or permission behaviour
- Adding a third-party service or external API call
- Modifying CI, deployment config, or branch protection
- Skipping something the docs require because it seems unnecessary

### Never do

- Push directly to `main` or `develop`
- Commit secrets, `.env` files, or credentials
- Hardcode a price, fee, phone number, or business rule anywhere in code
- Trust a price, total, or payment status sent from the client
- Store tokens in `localStorage`
- Ship a feature with a `TODO` in a code path a user can reach
- Write placeholder/mock functionality without an explicit `// TODO(human): …` marker **and** telling the human in your summary
- Delete or rewrite a document in `docs/` to match code you wrote
- Use `any` in TypeScript to make an error go away
- Disable a lint rule, a type check, or a failing test to get a build green
- Run destructive git commands to escape a problem

## 3. Non-negotiable engineering rules

1. **Money is integer paise.** Never a float, never a string, never rupees in the database. Format at the display edge only.
2. **The server computes every price.** The client displays what the server returns. There is no exception to this, including for "just the subtotal preview".
3. **Payment status comes from a signature-verified webhook** (or a server-side gateway API check). The browser's success callback is a UI hint only.
4. **Order placement runs in a MongoDB transaction** covering the order, slot capacity, coupon usage, and payment record. If any part fails, nothing is written.
5. **Order line items are snapshots.** Copy name, price, and tax rate into the order. Never resolve historical prices from the live catalog.
6. **Every endpoint validates input with Zod** from `packages/shared`, rejecting unknown keys.
7. **Every protected endpoint declares its role requirement explicitly.** Ownership checks are separate from role checks and both are enforced server-side.
8. **Status changes go through one service function** that validates the transition and the actor's role, writes history, and enqueues notifications. Nothing else assigns `order.status`.
9. **Third-party SDKs are only imported inside `integrations/`.** Everything else calls our adapter.
10. **Every UI surface implements loading, empty, error, and success states.** A component that only handles the happy path is not finished.
11. **Every interactive element is keyboard-operable with a visible focus state.**
12. **TypeScript strict mode, no `any`.** If a type is genuinely unknown, use `unknown` and narrow it.
13. **Mobile-first.** Build and verify at 375px before widening.
14. **No secret ever reaches `NEXT_PUBLIC_*`.**

## 4. How to work through a phase

1. **Read first.** Before starting, read the phase in [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) plus every document section it references. Don't skim.
2. **Restate the plan.** Before writing code, state briefly what you're going to build, which files you'll touch, and any ambiguity you found. Give the human a chance to correct course cheaply.
3. **Build vertically.** Model → service → route → validation → tests → UI. A working thin slice beats four disconnected layers.
4. **Test as you go.** Write the test with the code, not after the phase.
5. **Verify in the browser** for anything with a UI. Type-checks passing is not evidence a feature works. Run the app and use it. If you cannot, say so explicitly rather than claiming success.
6. **Commit working increments** on a feature branch, then open a PR.
7. **Summarize honestly**: what you built, what you tested, what you did _not_ implement, what you assumed, and anything you're unsure about. Under-claiming is always better than over-claiming.

## 5. When you're blocked or uncertain

**Ask. Do not guess and proceed.** Specifically:

- A business rule value isn't in the docs → ask; do not invent a number.
- Two documents contradict each other → stop and flag it; do not pick one silently.
- A spec seems wrong or impossible → explain the problem and propose an alternative; wait for a decision.
- An external service isn't set up yet → build against the adapter interface with a fake implementation, mark it clearly, and tell the human what's needed.
- A requirement is ambiguous → state your interpretation _and_ the alternative, then ask which is intended.

The cost of a question is one message. The cost of a wrong assumption discovered three phases later can be days.

## 6. Code quality expectations

- **Production-ready from the first commit.** No stubs, no fake data paths, no "we'll handle errors later".
- **Handle errors at boundaries** (user input, external APIs, database). Don't add defensive checks for conditions your own code makes impossible.
- **No premature abstraction.** Three similar lines beat a wrong abstraction. Extract a helper on the third real repetition, not the first.
- **Comments explain why, not what.** Default to none. A comment earns its place only when it records a non-obvious constraint or a surprising decision.
- **Delete dead code.** Don't leave commented-out blocks or `_unused` variables as a safety net — git remembers.
- **Reuse components.** If you're about to build a second variant of an existing UI primitive, extend the primitive instead.
- **Keep the documentation true.** If a change makes a doc inaccurate, update the doc in the same PR — after confirming the change with the human.

## 7. Documentation set — what each file owns

Keep these current. They are the contract between sessions, between models, and between you and the human.

| Document                             | Owns                                                          | Update it when                                      |
| ------------------------------------ | ------------------------------------------------------------- | --------------------------------------------------- |
| `README.md`                          | Entry point and index                                         | The document set changes                            |
| `MASTER_PROMPT.md`                   | The brief given to a coding model at session start            | The project's shape changes materially              |
| `docs/01_REFERENCE_SITE_ANALYSIS.md` | What the reference site does; confirmed vs. assumed           | An assumption is verified or disproved              |
| `docs/PROJECT_REQUIREMENTS.md`       | Parity matrix, sitemap, user flows, business rules, MVP scope | Scope changes or the owner confirms a business rule |
| `docs/DESIGN_SYSTEM.md`              | Brand, tokens, component specs, breakpoints                   | A token or component spec changes                   |
| `docs/ANIMATION_SYSTEM.md`           | Motion tokens and per-interaction specs                       | An animation is added or removed                    |
| `docs/ARCHITECTURE.md`               | Stack, folder structure, deployment topology, env vars        | Any structural or infrastructure change             |
| `docs/DATABASE.md`                   | Collections, fields, relationships, indexes                   | **Any** schema change                               |
| `docs/API_SPEC.md`                   | Endpoint contracts and error codes                            | **Any** endpoint added or changed                   |
| `docs/ADMIN_DASHBOARD.md`            | Admin feature spec                                            | Admin capabilities change                           |
| `docs/PAYMENTS_AND_NOTIFICATIONS.md` | Payment flow, order lifecycle, notification matrix            | Payment logic, a status, or a notification changes  |
| `docs/INTEGRATIONS.md`               | Every external service and its setup                          | A service is added, removed, or reconfigured        |
| `docs/SECURITY.md`                   | Security design and the production checklist                  | Auth, permissions, or a security control changes    |
| `docs/SEO_AND_PERFORMANCE.md`        | Metadata, schema, budgets, caching                            | SEO or performance strategy changes                 |
| `docs/ACCESSIBILITY_AND_MOBILE.md`   | Mobile UX and WCAG requirements                               | Mobile patterns or a11y requirements change         |
| `docs/TESTING.md`                    | Testing strategy and critical checklists                      | Test approach or tooling changes                    |
| `docs/DEVELOPMENT_PLAN.md`           | Phases, DoD, GitHub workflow                                  | Scope, sequencing, or process changes               |
| `docs/AI_CODING_RULES.md`            | This file — how the AI and human collaborate                  | The working agreement changes                       |

Two files worth adding once building starts: **`DECISIONS.md`** (a short log: date, decision, why, alternatives rejected — this is what stops the same debate recurring every few weeks) and **`CHANGELOG.md`** (user-visible changes per release).

## 8. Session start checklist

At the beginning of every coding session:

- [ ] Read `MASTER_PROMPT.md` and this file
- [ ] Read the current phase in `DEVELOPMENT_PLAN.md` and every doc section it references
- [ ] Check `git status` and confirm which branch you're on — create a feature branch if needed
- [ ] Confirm with the human which phase/task you're working on before writing code
- [ ] State your plan, including any ambiguity, and wait for confirmation on anything in the "ask first" list

## 9. Session end checklist

- [ ] All tests pass; typecheck and lint clean
- [ ] The feature was actually exercised (browser or API call), not just compiled
- [ ] Mobile viewport verified for any UI work
- [ ] Loading, empty, and error states implemented
- [ ] No secrets, no hardcoded business values, no reachable `TODO`s
- [ ] Docs updated if behaviour changed
- [ ] Committed on a feature branch with a conventional commit message; PR opened
- [ ] Summary written: built / tested / not done / assumed / uncertain
