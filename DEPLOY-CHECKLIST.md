# KHONCHAIHERB Commerce v0.9 — Cloudflare deployment checklist

1. Create a Cloudflare Pages project from GitHub repository `khonchaiherb-dev/Khonchai`; production branch `storefront-social-commerce`; build output `public`.
2. Bind a D1 database as `DB` and apply migrations `0001` through `0007` in order, then `db/seed.sql`, `db/seed-social.sql`, `db/seed-growth.sql`.
3. Bind R2 as `MEDIA_BUCKET` for verified-review images/videos.
4. Add strong secrets: `ADMIN_TOKEN`, `AUTH_PEPPER`, and `SHIPPING_WEBHOOK_SECRET`; never commit secret values.
5. Connect OTP/SMS through `OTP_WEBHOOK_URL` and optionally `OTP_WEBHOOK_TOKEN`. Keep `AUTH_DEV_SHOW_CODE` disabled in production.
6. Verify `/api/health` reports version `0.9.0` and expected configuration flags.
7. Test customer flow: OTP login → profile → add/edit/default/delete addresses → session management → checkout prefill → server orders → reorder → delivery timeline → delivered-order review → return request/cancel request.
8. Test seller flow: Promotion Center create/toggle/edit/schedule/usage limit → Creator commission rate → eligible commission payout reference → Return Center review/approve/reject/complete.
9. Return approval must not create a financial refund automatically. Connect a real payment/refund provider and signed webhook before automating monetary refunds.
10. Carrier adapter must HMAC-SHA256 sign the exact raw normalized shipping JSON with `SHIPPING_WEBHOOK_SECRET` and send hex signature in `X-KCH-Signature`.
11. Creator commission remains `pending` until trusted payment/COD confirmation changes it to `eligible`; only record `paid` after an actual payout with a reference.
12. QR/PromptPay remains disabled until a real gateway and signed payment webhook are connected.
13. Before accepting real orders, connect real product media, carrier API, COD reconciliation, privacy/terms/PDPA pages, production domain, backups, monitoring, WAF/rate limiting and alerts.
