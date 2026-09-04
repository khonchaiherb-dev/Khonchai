# KHONCHAIHERB Commerce v1.18.2

Mobile-first social-commerce storefront for **KHONCHAIHERB**. The experience uses familiar marketplace patterns—fast product discovery, deals, coupons, short checkout and clear order tracking—without copying another platform's branding or interface.

## Storefront available now
- Mobile-first Home shopping feed, categories, search and Flash Deal countdown
- Product detail, ratings/review presentation and stock-aware add-to-cart
- Cart quantity controls, remove item, free-shipping progress and saved coupons
- COD checkout with structured Thai delivery address
- Server-authoritative product price, stock, coupon and shipping calculation
- Idempotency key to prevent duplicate checkout submissions
- Customer order tracking using order number + phone verification
- Receipt eligibility only after successful payment / confirmed COD collection
- PWA service worker and security headers
- Product pages show only verified-order reviews; no placeholder testimonials or invented review scores
- Premium desktop product layout with clear availability status and honest coming-soon handling

## Seller Center
- Protected with Cloudflare secret `ADMIN_TOKEN`
- Real dashboard metrics from D1 rather than demo numbers
- Latest orders and payment/fulfillment states
- Fulfillment actions: start packing, add carrier/tracking, mark delivered
- Cancel-before-shipping flow restores inventory automatically
- COD collection is intentionally not a manual storefront button; production reconciliation should come from the shipping/payment source of truth

## Data layer
Cloudflare D1 schema includes products, customers, addresses, orders, order items, payments, shipments, coupons/redemptions, inventory movements, reviews, refunds, receipts, order events and store settings.

For a fresh production database, prefer `db/bootstrap-production.sql`. If upgrading an existing database, apply every migration in `db/migrations/` in numeric order through the latest migration (`0016_pandan_product.sql` at v1.18.2), then apply the production seed files required by the deployment.

## Cloudflare Pages deployment
- Repository: `khonchaiherb-dev/Khonchai`
- Production branch: `storefront-production`
- Framework preset: None
- Build command: leave empty
- Build output directory: `public`
- D1 binding: `DB`
- R2 binding: `MEDIA_BUCKET`
- Required secrets: `ADMIN_TOKEN`, `AUTH_PEPPER`, `SHIPPING_WEBHOOK_SECRET`
- OTP/SMS integration: `OTP_WEBHOOK_URL` and optional `OTP_WEBHOOK_TOKEN`

After Git integration is enabled, every push to `storefront-production` can trigger an automatic Cloudflare Pages deployment. Production changes should land on this branch only after the Quality Check, Browser E2E and D1 Bootstrap checks pass.

## Before accepting real customer orders
Replace starter catalog content with verified product data/images, connect the production domain, configure D1 + R2, set production secrets, connect shipping/tracking and COD reconciliation, review privacy/terms/returns/PDPA content, enable backups/monitoring/rate limiting, and run the complete browse → cart → checkout → shipment → COD collection/payment → receipt test.
