# KHONCHAIHERB Commerce v1.4 — Security Runbook

## Production secrets / variables
- `ADMIN_TOKEN`: server-side emergency bridge for existing `/api/admin/*` handlers. Staff users do not receive this value.
- `AUTH_PEPPER`: customer authentication secret.
- `RATE_LIMIT_PEPPER`: secret used before hashing request fingerprints for abuse controls. Raw IP addresses are not stored in the rate-limit table.
- `STAFF_PASSWORD_ITERATIONS`: optional PBKDF2 iteration count; minimum enforced at 100,000. Default 180,000.
- `STAFF_SESSION_SECONDS`: optional staff session lifetime; default 8 hours, capped at 12 hours.
- `PO_DUAL_APPROVAL_THRESHOLD`: set to `0` to disable; set a positive THB amount only after at least two authorized staff accounts exist.
- `PACKING_REQUIRE_VERIFICATION=true`: block shipment until packing verification is complete.

## First staff account
1. Deploy migration `0012_staff_security.sql`.
2. Sign in once with the Emergency / Legacy `ADMIN_TOKEN`.
3. Open **Staff & Permissions** and create the first Owner account.
4. Sign out from Legacy access and use individual Staff accounts for normal work.
5. Keep `ADMIN_TOKEN` only as a protected Cloudflare secret; never share it with staff or place it in browser code.

## High-risk approvals
When `PO_DUAL_APPROVAL_THRESHOLD` is positive, approving a PO at or above the threshold creates an Approval Request. The requester cannot approve their own request. Another Owner/Admin must resolve it in Approval Center.

## Backup
The in-app Backup Readiness feature creates a metadata/count manifest only; it intentionally does not export customer rows into the browser. Production restore should use Cloudflare D1 backup/time-travel procedures and a documented restore drill.

## Logging
Security Events store staff ID, route, method, status and sanitized event details. Passwords, session tokens, Admin Token and request bodies must never be written to Security Events.
