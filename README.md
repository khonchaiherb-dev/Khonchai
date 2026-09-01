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

Apply migrations in order:
1. `db/migrations/0001_init.sql`
2. `db/migrations/0002_production_hardening.sql`
3. `db/seed.sql` for starter/demo catalog data

## Cloudflare Pages deployment
- Repository: `khonchaiherb-dev/Khonchai`
- Production branch: `storefront-social-commerce`
- Framework preset: None
- Build command: leave empty
- Build output directory: `public`
- D1 binding: `DB`
- Secret: `ADMIN_TOKEN`

After Git integration is enabled, every push to the production branch can trigger an automatic Cloudflare Pages deployment.

## Before accepting real customer orders
Replace starter catalog content with verified product data/images, connect the production domain, configure D1, set the admin secret, connect shipping/tracking and COD reconciliation, review privacy/terms/returns content, and run the complete browse → cart → checkout → shipment → collection → receipt test.
