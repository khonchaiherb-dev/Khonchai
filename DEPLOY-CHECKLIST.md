# KHONCHAIHERB Commerce v0.8 — Cloudflare deployment checklist

1. Create a Cloudflare Pages project from GitHub repository `khonchaiherb-dev/Khonchai` and use production branch `storefront-social-commerce`.
2. Build command: leave empty. Build output directory: `public`.
3. Create a D1 database and bind it to Pages Functions as `DB`.
4. Apply migrations in order: `0001_init.sql` → `0002_production_hardening.sql` → `0003_social_commerce.sql` → `0004_attribution_analytics.sql` → `0005_growth_engine.sql` → `0006_customer_platform.sql`.
5. Apply starter data in order: `db/seed.sql` → `db/seed-social.sql` → `db/seed-growth.sql`.
6. Create an R2 bucket for verified-review photos/videos and bind it as `MEDIA_BUCKET`.
7. Add `ADMIN_TOKEN` as a strong secret for Seller Center.
8. Add `AUTH_PEPPER` as a long random secret for hashing customer OTP/session credentials. Never commit it.
9. Connect an OTP/SMS provider through `OTP_WEBHOOK_URL` and optionally `OTP_WEBHOOK_TOKEN`. Keep `AUTH_DEV_SHOW_CODE` disabled in production.
10. Add `SHIPPING_WEBHOOK_SECRET` for the normalized carrier webhook. The upstream carrier adapter must sign the exact raw JSON body with HMAC-SHA256 and send the hex signature in `X-KCH-Signature`.
11. Deploy and verify `/api/health` reports D1, admin, customer auth, review media, and shipping webhook configuration accurately.
12. Test customer flow: OTP login → profile → multiple addresses → checkout prefill → orders → reorder → delivered-order review.
13. Test commerce flow: Shop/LIVE/Video/Creator attribution → coupon + automatic promotion → COD order → shipment events → COD collection → receipt eligibility.
14. Test Seller Center: Promotion Center toggle/create, Social Commerce analytics, Growth analytics, and Creator/Affiliate commission states.
15. Creator commission starts as `pending`; only a trusted payment/COD confirmation may move it to `eligible`. Returned/cancelled carrier events void unpaid commissions.
16. QR/PromptPay must remain disabled until a real payment gateway and signed payment webhook are connected.
17. Before accepting real orders, connect real product images, carrier adapter, COD reconciliation, privacy/terms pages, production domain, backups, monitoring, rate limiting and alerting.
