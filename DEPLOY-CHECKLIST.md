# KHONCHAIHERB Commerce v0.7 — Cloudflare deployment checklist

1. Create a Cloudflare Pages project from GitHub repository `khonchaiherb-dev/Khonchai`.
2. Production branch: `storefront-social-commerce`.
3. Build command: leave empty.
4. Build output directory: `public`.
5. Create a D1 database for the storefront and bind it to Pages Functions with variable name `DB`.
6. Apply migrations in order: `0001_init.sql` → `0002_production_hardening.sql` → `0003_social_commerce.sql` → `0004_attribution_analytics.sql` → `0005_growth_engine.sql`.
7. Apply starter data in order: `db/seed.sql` → `db/seed-social.sql` → `db/seed-growth.sql`.
8. Create an R2 bucket for verified-review photos/videos and bind it with variable name `MEDIA_BUCKET`.
9. Add a secret environment variable `ADMIN_TOKEN` with a strong random value; do not commit it to GitHub.
10. Deploy and verify `/api/health` returns `ok: true`, `d1: true`, and `adminConfigured: true`.
11. Test: Shop feed → Search ranking → Wishlist → LIVE reminder → Cart → Coupon/automatic promotion → COD checkout → Order lookup.
12. Test a delivered order can submit a Verified Review. Test image/video upload after `MEDIA_BUCKET` is bound.
13. Test Seller Center login and confirm Social Commerce + Growth Engine analytics render.
14. QR/PromptPay must remain disabled until a real payment gateway and signed webhook verification are connected.
15. Before accepting real orders, connect real product images, shipping/tracking provider, COD reconciliation, privacy/terms pages, production domain, and backup/monitoring.
