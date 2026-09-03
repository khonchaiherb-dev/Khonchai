# KHONCHAIHERB Development Guardrails

This document is the project baseline for preventing regressions and repeated rework.

## Core rule

Every confirmed improvement that has passed production checks becomes part of the baseline. Future changes must improve the system or preserve the existing quality. Do not intentionally revert to an older design, architecture, workflow, security posture, or user experience unless a verified defect requires it.

## Non-regression principles

1. Never remove a working production capability merely to simplify a later change.
2. Preserve validated UX, readability, mobile behavior, checkout flow, security controls, SEO, PWA behavior, order controls, COD support, receipt flow, and admin safeguards.
3. Before changing an existing layer, inspect the current production implementation and its tests first.
4. Any new implementation must pass the existing Quality, Security, Resilience, Operations, Browser E2E, Production Smoke, and deployment checks that apply to the affected area.
5. When a new version replaces an older layer, remove or supersede the older layer deliberately; do not accidentally leave conflicting CSS, JavaScript, headers, service-worker caches, or workflows.
6. Keep a single clear production source of truth for each function. Avoid duplicate workflows and duplicate UI layers.
7. Preserve all proven security protections unless a stronger replacement is introduced.
8. Preserve database safety gates. Production migrations must remain explicit, validated, and fail closed.
9. Imported Koonchaishop reviews must never be represented as on-site verified reviews.
10. Do not fabricate product prices, claims, stock, reviews, or performance data. Use verified production data only.

## Current protected baseline

The following improvements are considered protected baseline behavior:

- Mobile-first KHONCHAIHERB storefront and readable product UI.
- Structural storefront v1.34.x and header de-duplication behavior.
- Complete v1.33-v1.34 PWA cache stack.
- Production security headers including CSP, HSTS, frame protection, referrer policy, permissions restrictions, and MIME sniffing protection.
- Sale verification gate before products can be sold.
- Order idempotency and order health safeguards.
- COD-ready order architecture and receipt linkage requirements.
- Cloudflare Pages production deployment checks.
- Production public smoke checks.
- Koonchaishop source authorization and source-library architecture.
- Protection preventing imported reviews from being marked as website-verified.
- SEO rules that prevent admin/account areas from being indexed.
- Sitemap, robots, canonical and page-specific social metadata must remain consistent with the real production origin.

## Change procedure

For every substantial change:

1. Read the current implementation and recent production status.
2. Identify what is already working and mark it as preserved behavior.
3. Change only the layer required for the improvement.
4. Run or inspect relevant automated checks.
5. Verify the deployed production result, not only repository code.
6. If a regression is detected, repair the new change rather than reverting unrelated proven improvements.
7. Record any newly proven improvement in this baseline when it becomes an enduring requirement.

## Priority model

Development order should remain:

1. Production safety and stability.
2. Real commerce functionality and data integrity.
3. Mobile purchase experience and conversion.
4. Performance and reliability.
5. SEO and discoverability.
6. Admin efficiency, analytics, rewards, affiliate and growth systems.

The project should move forward cumulatively. The target is continuous improvement without cycling back through previously solved problems.
