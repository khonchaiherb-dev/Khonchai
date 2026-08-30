# Production deployment checklist

- [x] GitHub write access / Codex installation available
- [x] Storefront isolated from the existing company-management app
- [ ] Cloudflare Pages connected to the storefront branch
- [ ] D1 database created and bound as `DB`
- [ ] Schema + seed applied
- [ ] `/api/health` confirms D1 binding
- [ ] Custom domain + HTTPS active
- [ ] Admin/Seller Center protected by authentication
- [ ] Real product images and verified product copy loaded
- [ ] Shipping rates and carrier tracking connected
- [ ] COD status updates tied to carrier collection status
- [ ] QR/payment gateway webhook verified server-side
- [ ] Receipt issued only after paid / COD-collected state
- [ ] Refunds update payment + receipt history correctly
- [ ] PDPA consent, privacy notice, cookie controls, retention policy reviewed
- [ ] SEO metadata, sitemap, robots, analytics and error monitoring enabled
- [ ] End-to-end test: browse → cart → coupon → checkout → order → shipment → payment/COD → receipt
