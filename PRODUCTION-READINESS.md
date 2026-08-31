# KHONCHAIHERB Commerce v1.0 — Production Readiness

## Required Cloudflare bindings / secrets
- `DB`: D1 database.
- `MEDIA_BUCKET`: R2 bucket for verified review media.
- `PRODUCT_MEDIA_BUCKET`: R2 bucket for product images.
- `ADMIN_TOKEN`: strong random Seller Center secret.
- `AUTH_PEPPER`: strong random secret used to hash customer OTP/session material.
- `OTP_WEBHOOK_URL` and optional `OTP_WEBHOOK_TOKEN`: production OTP delivery service.
- `SHIPPING_WEBHOOK_SECRET`: HMAC secret shared with the trusted shipping integration.

Do not enable `AUTH_DEV_SHOW_CODE=true` in production.

## Database
Apply migrations in order through `0008_production_readiness.sql`, then existing seed files only for the intended environment.

## Production checks
1. `/api/health` must return `d1`, `adminConfigured`, `authConfigured`, `productMediaConfigured`, and `shippingWebhookConfigured` as true before accepting real orders.
2. Upload at least one real image for each active product and confirm `/api/products` returns `image_url`.
3. Verify Seller Center Product & SKU, Stock Center and Audit Log using a non-public admin secret.
4. Test a positive and negative stock adjustment; negative stock must be rejected.
5. Verify OTP delivery without exposing the OTP in API responses.
6. Test COD reconciliation only through the trusted shipping webhook.
7. Review Privacy, Terms and Shipping/Returns pages with the company’s legal/compliance owner before public launch.
8. Configure Cloudflare WAF/rate limiting at the edge for login/OTP, checkout and admin endpoints.
9. Configure backup/export procedures for D1 and R2 and monitoring for API/checkout errors.
10. Add the final production domain, canonical URLs and sitemap only after the domain is confirmed.
