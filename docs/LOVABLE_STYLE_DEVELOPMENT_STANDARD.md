# KHONCHAIHERB — Lovable-style Development Standard

This document is the standing web-development operating standard for KHONCHAIHERB. It captures the effective parts of Lovable's workflow and adapts them to our GitHub + Cloudflare + D1 commerce stack.

## 1. Think before editing

For every substantial feature, first define:
- user and business outcome
- user journey / main action
- affected pages, components, APIs, data, permissions and integrations
- acceptance criteria
- explicit non-goals and areas that must not be changed

Use a planning pass before implementation when architecture, security, checkout, payments, customer data, D1 schema, permissions or major UI changes are involved.

## 2. Build iteratively, not in one giant rewrite

Prefer small verified increments:
1. foundation / data contract
2. one user flow
3. one component or tightly related component group
4. empty/loading/error/permission states
5. responsive behavior
6. accessibility and security
7. QA and production verification

Do not rewrite unrelated working code unless the change truly requires it.

## 3. Use the Location + Behavior + Guardrails pattern

Every implementation instruction should make clear:
- **Location** — exactly where the change belongs
- **Behavior** — what the user should be able to do and what should happen
- **Guardrails** — what must remain unchanged, security boundaries, permissions and failure behavior

Example structure:
- Change: Checkout > payment method selector
- Behavior: allow COD for eligible orders and explain eligibility inline
- Guardrails: do not alter pricing, inventory reservation, receipt generation or existing paid-order flow

## 4. Use real content and real states

Use real KHONCHAIHERB product data, Thai copy, realistic prices, order states, long names, error messages and real operational constraints whenever available. Avoid placeholder-heavy UI because it hides layout and workflow defects.

Every customer-facing flow should consider:
- initial
- loading
- success
- empty
- validation error
- API/network error
- permission denied
- unavailable / out of stock
- retry / recovery where appropriate

## 5. Think in components and systems

Build reusable components instead of repeatedly generating whole pages. Maintain a consistent design system for:
- typography
- spacing
- buttons
- cards
- badges
- forms
- dialogs / drawers
- tables
- navigation
- product media
- states and feedback

Prefer design tokens and reusable UI primitives over one-off styling.

## 6. Preserve project knowledge

Treat the repository and this standard as the project's persistent Knowledge file. Before large changes, inspect current code and existing project conventions rather than assuming a blank project.

Keep important durable decisions documented, including:
- brand conventions
- checkout and COD rules
- receipt requirements
- roles and permissions
- data ownership
- production deployment constraints
- support / returns / customer-service workflows

## 7. Attach visual references when visual accuracy matters

When improving UI from a screenshot, product reference, existing page or competitor pattern, use the reference to guide hierarchy, spacing, composition, interaction and polish. Do not copy protected branding or impersonate another service.

For design-only refinements, prefer targeted visual changes over broad code rewrites.

## 8. Verify after every meaningful change

A change is not complete because code was written. Verify the result.

Minimum verification should include the relevant subset of:
- lint / type / syntax checks
- unit or integration checks
- browser/E2E path
- mobile viewport
- empty/error states
- auth/permission boundaries
- security headers / caching rules
- Cloudflare deployment status
- D1 readiness for features depending on new schema
- production smoke check

Never report a feature as production-ready when its required database schema, secret, permission, integration or deployment has not been verified.

## 9. Debug as a separate workflow

When something breaks:
1. reproduce the exact problem
2. inspect the smallest relevant files/logs
3. identify likely root cause before changing multiple systems
4. apply the smallest safe fix
5. re-run the failing test and adjacent regression checks

Do not respond to a single bug by redesigning unrelated parts of the site.

## 10. Use GitHub as the safety net

All meaningful changes should remain version-controlled. Keep commits focused and descriptive. Preserve working checkpoints. Prefer reverting a known bad change over stacking speculative fixes.

## 11. Production changes must be fail-closed

For payments, COD, customer data, receipts, refunds, returns, staff permissions, support, migrations and other high-impact systems:
- no silent fallback that weakens security
- no automatic destructive migration
- no fake success states
- no AI-authorized financial action
- no production-ready claim without verification

Readiness checks should distinguish between:
- READY
- NOT READY
- UNKNOWN / cannot verify

## 12. Mobile-first commerce quality

KHONCHAIHERB should be optimized primarily for Thai mobile shoppers. Prioritize:
- fast product discovery
- strong product media
- readable Thai typography
- clear price / promotion / shipping information
- low-friction cart and checkout
- COD clarity
- trust, receipts and return/support access
- thumb-friendly interactions
- minimal unnecessary steps

## 13. One change, then inspect

For visual and UX refinement, use a tight loop:
1. make one coherent change
2. inspect the rendered result
3. compare against the intended outcome
4. fix regressions immediately
5. continue to the next improvement

Batch only closely related changes.

## 14. Refactor as the system grows

When repeated patterns or complexity appear, refactor deliberately instead of continuing to append special cases. Refactors must preserve behavior and be verified separately from new feature work where possible.

## 15. Definition of done

A feature is done only when:
- the requested user outcome works
- the intended design is visible on desktop and mobile
- existing critical flows remain intact
- permissions/security are correct
- failure states are handled
- required backend/data structures exist
- relevant automated checks pass
- production status is truthfully reported

## Standing instruction

For future KHONCHAIHERB website work, use this Lovable-style operating model by default: **plan first, edit narrowly, preserve context, use real content, apply explicit guardrails, verify every meaningful change, and keep production truth separate from code-complete status.**
