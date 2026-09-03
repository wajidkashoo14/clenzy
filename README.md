# Clenzy — Product & Engineering Blueprint

Clenzy is a premium, Kashmir-inspired laundry, dry-cleaning, and fabric-care platform for the Indian market, functionally inspired by [wewash.co.in](https://www.wewash.co.in/) (Mumbai). This repository currently contains **planning documentation only** — no application code has been written yet. This is intentional: the documents below are the single source of truth that an implementation-focused AI model or developer should read before writing any code.

> **"Clenzy"** is used throughout as the working brand name (it matches this project folder). Confirm domain and trademark availability before treating it as final — see [PROJECT_REQUIREMENTS.md](docs/PROJECT_REQUIREMENTS.md#brand-name-confirmation-needed).

## How to use this repo (for the coding AI / developer)

1. Read [MASTER_PROMPT.md](MASTER_PROMPT.md) first — it is the entry-point brief.
2. Read every file in `docs/` in the order listed below before writing code.
3. Follow [docs/AI_CODING_RULES.md](docs/AI_CODING_RULES.md) at all times — it defines what you may decide unilaterally vs. what requires the human's sign-off.
4. Build one phase at a time per [docs/DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md). Do not skip ahead.
5. Never invent business rules (pricing, fees, cancellation windows, etc.) — flag them; see the "Confirm with business owner" flags scattered through these docs.

## Document index

| #   | Document                                                                 | Covers                                                                                        |
| --- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| 0   | [docs/00_EXECUTIVE_SUMMARY.md](docs/00_EXECUTIVE_SUMMARY.md)             | What we're building, feature list, cost/timeline, and an honest self-review of risks and gaps |
| 1   | [docs/01_REFERENCE_SITE_ANALYSIS.md](docs/01_REFERENCE_SITE_ANALYSIS.md) | What wewash.co.in actually does, confirmed vs. assumed, full customer journey                 |
| 2   | [docs/PROJECT_REQUIREMENTS.md](docs/PROJECT_REQUIREMENTS.md)             | Functionality Parity Matrix, sitemap, user flows, business logic, MVP/V2/V3                   |
| 3   | [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)                           | Brand identity, color/type tokens, component specs, responsive rules                          |
| 4   | [docs/ANIMATION_SYSTEM.md](docs/ANIMATION_SYSTEM.md)                     | Motion principles, per-interaction animation specs, performance rules                         |
| 5   | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)                             | Tech stack, monorepo structure, deployment topology                                           |
| 6   | [docs/DATABASE.md](docs/DATABASE.md)                                     | MongoDB collections, schemas, relationships, indexes                                          |
| 7   | [docs/API_SPEC.md](docs/API_SPEC.md)                                     | REST endpoint contracts                                                                       |
| 8   | [docs/ADMIN_DASHBOARD.md](docs/ADMIN_DASHBOARD.md)                       | Admin system spec — orders, customers, services, pricing, coupons, areas, CMS                 |
| 9   | [docs/PAYMENTS_AND_NOTIFICATIONS.md](docs/PAYMENTS_AND_NOTIFICATIONS.md) | Payment architecture, order status lifecycle, notification matrix                             |
| 10  | [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md)                             | Every third-party service, why it's needed, and step-by-step signup                           |
| 11  | [docs/SECURITY.md](docs/SECURITY.md)                                     | Auth, RBAC, API hardening, production checklist                                               |
| 12  | [docs/SEO_AND_PERFORMANCE.md](docs/SEO_AND_PERFORMANCE.md)               | Metadata, schema.org, local SEO, Core Web Vitals targets                                      |
| 13  | [docs/ACCESSIBILITY_AND_MOBILE.md](docs/ACCESSIBILITY_AND_MOBILE.md)     | Mobile-first UX, WCAG 2.2 AA                                                                  |
| 14  | [docs/TESTING.md](docs/TESTING.md)                                       | Unit/integration/E2E/payment/security testing strategy and tools                              |
| 15  | [docs/DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md)                     | Phases 0–15, GitHub workflow, definitions of done                                             |
| 16  | [docs/AI_CODING_RULES.md](docs/AI_CODING_RULES.md)                       | Hard rules for the coding AI, decision authority boundaries                                   |

## Research limitation disclosure

Live browsing of wewash.co.in was not possible during this planning session (DNS did not resolve from the research environment, and Wayback Machine/proxy fallbacks were blocked). The analysis in this repo is built from search-engine indexing of the live site's pages, cached snippets, and business listings — cross-checked across multiple independent sources. Every claim in [docs/01_REFERENCE_SITE_ANALYSIS.md](docs/01_REFERENCE_SITE_ANALYSIS.md) is labeled **Confirmed** or **Assumption / functionality to verify during implementation**. Before Phase 3 (public website) begins, someone with normal browser access should spend 30 minutes on the live site (and ideally place a real test order) to validate the Assumption-labeled items — see the checklist at the end of that document.
