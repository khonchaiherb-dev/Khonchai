# KHONCHAIHERB — Current Development State

This file is the rolling execution state for continuous development. Update it when a meaningful vertical slice is completed or when a production blocker changes. It complements `CONTINUOUS_DEVELOPMENT_ROADMAP.md`.

## Current phase

**P0 + P3: Production truth and Support Omnichannel Foundation**

## Completed in the current cycle

- Continuous roadmap and Lovable-style development standard are persisted in the repository.
- Support Platform 0023 exists in source with tickets, messages, SLA, assignment, audit events and CSAT.
- Support Operations console includes Customer 360, SLA monitoring, CSAT, assignment, internal notes and staff permissions.
- Self-service support knowledge base exists for customer-facing help.
- Omnichannel migration 0024 exists with:
  - channel contact identity mapping
  - external event idempotency ledger
  - outbound delivery outbox
- Secured normalized support ingestion endpoint exists and is fail-closed when `SUPPORT_INGEST_SECRET` is absent.
- External inbound events are deduplicated by channel + external event ID.
- Staff replies to LINE/email/social tickets are queued in the outbox instead of being falsely represented as delivered.
- Support console exposes truthful queued/failed/sent foundation state and per-ticket outbox/contact information.
- Migration guard understands 0024 but still requires explicit production confirmation.
- Dedicated support omnichannel smoke coverage is included in `npm check`.
- A read-only support D1 diagnostic workflow exists to distinguish credential/account/schema states.

## Current production truth

- Static/Pages deployment and application QA are separate from D1 schema readiness.
- Do not mark Support 0023 or Omnichannel 0024 production-ready until remote D1 checks confirm the required tables.
- Do not mark LINE, email or social as connected merely because the omnichannel data foundation exists.
- Actual channel adapters still require channel-specific credentials/signature verification and sender implementations.
- No production migration is applied automatically. Guarded migrations require explicit confirmation.

## Active blockers / dependencies

1. Verify Cloudflare D1 account/token read access and remote 0023/0024 schema state.
2. If 0023/0024 are absent, production migration remains a guarded explicit operation.
3. LINE/email/social sender adapters cannot be enabled without their actual provider credentials/configuration.

## Next execution queue

### Next 1 — Close P0 support production truth
- make readiness diagnostics stable and non-mutating
- report credential/account mismatch separately from missing schema
- verify 0023 and 0024 remotely when D1 access is available

### Next 2 — P1 Storefront Conversion Audit + vertical slice
- audit mobile product discovery → PDP → cart → checkout using current real components
- identify the largest conversion friction that can be fixed without redesigning unrelated areas
- implement one measurable vertical slice
- protect COD, receipt, order and inventory contracts

### Next 3 — P2 Checkout & Revenue
- improve checkout recovery and revenue-state visibility
- verify payment/COD/receipt consistency
- add measurable recovery signals without inventing revenue data

### Next 4 — P3 Channel adapters / CRM
- add channel-specific adapters only when credentials are available
- process outbox with retry/idempotency and provider delivery acknowledgements
- then move to segmentation, reorder and win-back journeys

## Continuous command behavior

When the user says **“พัฒนาต่อ”**, **“ทำต่อ”**, or equivalent without a new overriding requirement:
1. read this file and the continuous roadmap,
2. inspect the current repository HEAD and latest verification state,
3. close any P0 blocker that can be safely fixed without external secrets or irreversible production changes,
4. otherwise take the first executable item in `Next execution queue`,
5. implement a complete vertical slice,
6. run/inspect QA and deployment/readiness checks,
7. update this state file when the execution state materially changes.

Never replace a real production dependency with fake data or claim a disconnected integration is connected.
