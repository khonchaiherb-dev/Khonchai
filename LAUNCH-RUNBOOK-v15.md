# KHONCHAIHERB Commerce v1.5 — Launch & Security Runbook

## Safe rollout order
1. Deploy code with `STAFF_CSRF_ENFORCE=false`.
2. Apply `db/migrations/0013_session_launch_hardening.sql` to the production D1 database.
3. Sign in with a Staff Owner account and open **Launch Readiness**.
4. Set a strong `RATE_LIMIT_PEPPER` Cloudflare secret.
5. Verify Staff login and **Sessions & Devices**.
6. Set `STAFF_CSRF_ENFORCE=true`.
7. Configure high-risk controls as appropriate:
   - `PO_DUAL_APPROVAL_THRESHOLD`
   - `REFUND_DUAL_APPROVAL_THRESHOLD`
   - `DAILY_CLOSE_DUAL_APPROVAL=true`
   - `HIGH_RISK_REQUIRED_APPROVALS=1` for two-person control (requester + one approver).
8. After at least one Owner account is confirmed, set `LEGACY_ADMIN_ENABLED=false`.
9. Keep `ADMIN_TOKEN` as a server-side bridge until legacy admin handlers are fully migrated; never expose it to normal staff.

## Session security
- Staff authentication uses an HttpOnly, Secure, SameSite=Strict session cookie.
- v1.5 adds a per-session CSRF token stored only as a hash in D1.
- `staff_session_meta` stores a random public session reference and a hashed user-agent fingerprint. It does not store the raw session token.
- Staff can revoke individual sessions or all other sessions from Seller Center.

## High-risk approvals
- Purchase-order approval can require a second staff member when the PO total meets `PO_DUAL_APPROVAL_THRESHOLD`.
- Refund confirmation can require a second staff member when the refund amount meets `REFUND_DUAL_APPROVAL_THRESHOLD`.
- Daily closing can require a second staff member when `DAILY_CLOSE_DUAL_APPROVAL=true`.
- The requester cannot approve their own request.
- Approval execution is recorded in `approval_executions` when migration 0013 is present.

## Browser security
`public/_headers` enforces HSTS, frame denial, MIME sniffing protection, restrictive permissions policy, same-origin opener policy, and a CSP that blocks inline script attributes and all frames/objects.

## Launch Readiness
The Seller Center Launch Readiness screen checks configuration state without returning secret values. It reports D1 schema status, Owner availability, CSRF enforcement, rate-limit secret, legacy browser access, packing verification, high-risk approval settings, shipping verification, product media storage, and critical security events.

## Production note
The in-app readiness dashboard does not configure Cloudflare for you and does not prove backups exist. Production backup/restore must still be verified with Cloudflare D1 backup/time-travel procedures and a restore drill.
