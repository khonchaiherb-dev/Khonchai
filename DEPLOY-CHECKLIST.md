# KHONCHAIHERB Commerce v1.18.2 — Cloudflare production checklist

1. Cloudflare Pages project must use GitHub repository `khonchaiherb-dev/Khonchai`, production branch `storefront-production`, and build output directory `public`.
2. Bind the D1 database as `DB`. For a new production database, apply `db/bootstrap-production.sql`. For an existing database, apply every migration in `db/migrations/` in numeric order through the latest migration (currently `0016_pandan_product.sql`) and then the required production seed data.
3. Bind R2 as `MEDIA_BUCKET` for verified-review and product media.
4. Add strong production secrets: `ADMIN_TOKEN`, `AUTH_PEPPER`, and `SHIPPING_WEBHOOK_SECRET`; never commit secret values.
5. Connect OTP/SMS through `OTP_WEBHOOK_URL` and optionally `OTP_WEBHOOK_TOKEN`. Keep `AUTH_DEV_SHOW_CODE` disabled in production.
6. Verify `/api/health` reports version `1.18.2`, confirms D1 availability and shows expected production configuration flags.
7. Require GitHub checks on `storefront-production`: Storefront Quality Check, Storefront Browser E2E Check and Storefront D1 Bootstrap Check.
8. Test customer flow: product discovery → product detail → cart → coupon → COD checkout → order creation → order status → shipment timeline → COD collection/payment confirmation → receipt eligibility.
9. Test authenticated customer flow: OTP login → profile → add/edit/default/delete addresses → session management → checkout prefill → server orders → reorder → delivered-order review → return/cancel request.
10. Test seller flow: orders → packing verification → carrier/tracking → delivered → COD reconciliation → receipt → returns/refunds → daily closing.
11. Return approval must not create a financial refund automatically. Connect a real payment/refund provider and signed webhook before automating monetary refunds.
12. Carrier adapter must HMAC-SHA256 sign the exact raw normalized shipping JSON with `SHIPPING_WEBHOOK_SECRET` and send the hex signature in `X-KCH-Signature`.
13. Creator commission remains `pending` until trusted payment/COD confirmation changes it to `eligible`; only record `paid` after an actual payout with a reference.
14. QR/PromptPay remains disabled until a real gateway and signed payment webhook are connected.
15. Before accepting real orders, replace mock/starter product data with verified product names, prices, stock, weights and real media; connect carrier API and COD reconciliation; publish privacy/terms/returns/PDPA pages; connect the production domain; enable backups, monitoring, WAF/rate limiting and alerts.
16. Final launch gate: complete at least one end-to-end test order on production from browse → cart → checkout → fulfillment → COD collection/payment → receipt, then verify inventory, finance ledger and order history all match the transaction.
