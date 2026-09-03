# KHONCHAIHERB — Continuous Development Roadmap

This is the standing execution roadmap for KHONCHAIHERB. It works together with `LOVABLE_STYLE_DEVELOPMENT_STANDARD.md` and turns development into a continuous verified cycle rather than isolated feature requests.

## North-star outcomes

1. Customers can discover, trust, buy, pay/COD, track, return and get support without leaving the KHONCHAIHERB ecosystem.
2. Staff can operate orders, inventory, finance, support and content from one secure operations environment.
3. Management can see revenue, margin, conversion, retention, service quality and operational risk from verified data.
4. Every production capability is observable and fail-closed when configuration or schema is incomplete.

## Execution cycle for every development round

### 1. Plan
- define customer/business outcome
- identify affected UI, API, data, permissions and integrations
- define acceptance criteria and non-goals
- protect unrelated working flows

### 2. Build
- implement the smallest complete vertical slice
- include loading, empty, error and permission states
- use real store data contracts rather than decorative placeholders

### 3. Verify
- syntax/static checks
- smoke tests for the new capability
- regression checks for checkout/order/security paths
- responsive and accessibility checks for customer-facing UI

### 4. Preview
- deploy through the existing Cloudflare Pages pipeline
- verify public and staff entry points
- never infer production readiness only from a successful static deploy

### 5. Production gate
- verify required D1 tables, environment configuration, permissions and integrations
- schema/integration UNKNOWN is not READY
- migrations and financial mutations remain explicit guarded actions

### 6. Measure and continue
- add measurable product/operations signals where possible
- pick the next highest-impact bottleneck rather than simply adding another page

---

# Workstreams

## P0 — Production Reliability & Truth

Goal: make the system tell us the truth about what is actually usable in production.

Deliverables:
- Cloudflare Pages deployment verification
- D1 schema readiness per migration/capability
- health/readiness distinction
- fail-closed configuration checks
- security headers and no-store for staff surfaces
- operational alerts, audit trail, backup/recovery checks
- clear READY / NOT READY / UNKNOWN reporting

Acceptance: no important capability is reported READY only because its frontend deployed.

## P1 — Storefront & Conversion

Goal: increase the percentage of visitors who reach product detail, cart and checkout while preserving premium herbal brand positioning.

Deliverables:
- mobile-first navigation and search
- verified product cards and media
- product detail trust structure
- Buy Now / Add to Cart clarity
- bundles, cross-sell and cart value guidance
- shipping/COD/receipt trust information near buying decisions
- performance and Core Web Vitals hygiene

Metrics: product-view rate, add-to-cart rate, checkout-start rate.

## P2 — Checkout & Revenue

Goal: convert carts into collectible revenue with low failure and low manual recovery work.

Deliverables:
- checkout session recovery
- COD risk controls
- payment attempt/provider event architecture
- order/payment/receipt consistency
- abandoned checkout recovery readiness
- refund and COD reconciliation
- revenue readiness dashboard

Metrics: checkout completion, payment success, COD delivery/collection rate, recovery value.

## P3 — Support, CRM & Retention

Goal: make post-purchase service a retention engine rather than a cost center.

Deliverables:
- ticket + SLA + Customer 360 + CSAT
- self-service knowledge base
- omnichannel identity/event/outbox foundation
- LINE/email/social adapters when credentials/connectors are available
- reusable macros and escalation rules
- customer segmentation and loyalty/reorder/win-back journeys
- AI assist later: summarize/search/draft, never autonomous refund/payment approval

Metrics: first response time, SLA breach rate, resolution time, CSAT, repeat purchase rate.

## P4 — Operations & Fulfillment

Goal: process more orders with fewer mistakes and better inventory discipline.

Deliverables:
- unified seller/operations gateway
- picking, packing verification and shipping labels
- FEFO lots and expiry/quarantine handling
- procurement/receiving
- returns workflow
- staff roles, dual approvals and auditability

Metrics: fulfillment lead time, packing error rate, stockout risk, return rate.

## P5 — Data, Growth & Management

Goal: turn verified commerce activity into decisions and profitable growth.

Deliverables:
- executive KPI dashboard
- product profitability
- attribution/social analytics
- customer cohorts and LTV
- retention and campaign readiness
- Koonchaishop authorized content/media/review library
- experimentation measurement before/after conversion changes

Metrics: revenue, gross margin, AOV, repeat rate, LTV, attributable conversion.

## P6 — Scale & Platform Quality

Goal: scale without rebuilding the commerce core.

Deliverables:
- reusable design system/components
- PWA/performance/accessibility
- structured SEO/product metadata
- R2/CDN media pipeline
- multi-language readiness
- integration boundaries and webhook idempotency
- observability and security hardening

---

# Priority selection rule

At the start of every round choose work in this order:
1. production/security/data-integrity blocker
2. revenue/conversion blocker
3. customer-service/retention blocker
4. operations efficiency blocker
5. growth/scale enhancement

Do not prioritize a visually impressive feature over a broken purchase, payment, order, inventory, support or production-readiness path.

# Current execution round

## Sprint: Support Omnichannel Foundation

Outcome: prepare KHONCHAIHERB Support to receive and reply through LINE, email and social channels while keeping the existing web ticket flow intact.

Build:
- `0024_support_omnichannel.sql`
- channel-contact identity mapping
- external-event idempotency ledger
- outbound message outbox with retry state
- authenticated ingestion endpoint that is disabled unless a secret is configured
- staff replies to non-web tickets queue outbound delivery instead of pretending the external message was sent
- channel readiness/stats for the support console
- migration guard and QA coverage

Guardrails:
- no external channel is marked connected until credentials/adapters exist
- no inbound webhook is accepted when the ingestion secret is unset
- duplicate external events must not create duplicate customer messages
- web support behavior must remain unchanged
- no automatic refund/payment mutation is introduced
