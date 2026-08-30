# KHONCHAIHERB Commerce v0.3 — Cloudflare deployment checklist

1. Create a Cloudflare Pages project from GitHub repository `khonchaiherb-dev/Khonchai`.
2. Production branch: `storefront-social-commerce`.
3. Build command: leave empty.
4. Build output directory: `public`.
5. Create a D1 database for the storefront and bind it to Pages Functions with variable name `DB`.
6. Apply `db/migrations/0001_init.sql`, then `db/migrations/0002_production_hardening.sql`.
7. Apply `db/seed.sql` once for the starter catalog/coupons.
8. Add a secret environment variable `ADMIN_TOKEN` with a strong random value; do not commit it to GitHub.
9. Deploy and verify `/api/health` returns `ok: true`, `d1: true`, and `adminConfigured: true`.
10. Test: product feed → cart → coupon → COD checkout → order lookup with order number + phone.
11. Test Seller Center login using the `ADMIN_TOKEN` value.
12. Before accepting real orders, connect the actual product images, shipping/tracking provider, privacy/terms pages, and production domain.
