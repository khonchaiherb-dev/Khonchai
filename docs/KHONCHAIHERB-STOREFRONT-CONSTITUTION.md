# KHONCHAIHERB Storefront Development Constitution

Canonical production site: `https://khonchaiherb-commerce.pages.dev/`

Canonical repository: `khonchaiherb-dev/Khonchai`

Canonical branch: `storefront-social-commerce`

Canonical Cloudflare Pages project: `khonchaiherb-commerce`

## Permanent rules

1. Always start from the latest production branch HEAD. Never continue from an older snapshot, old branch, preview deployment, or unrelated project.
2. The approved visual direction is Premium Thai Herbal: deep herbal green, natural green, warm cream, white, clean typography, strong whitespace, premium product photography, simple conversion path.
3. The customer storefront must use one current architecture. Do not stack legacy CSS/JS patch generations on top of each other.
4. Preserve verified backend foundations unless a real backend defect is proven: D1, catalog, checkout, COD, order API, idempotency, and security middleware.
5. Use real commerce data only. Never invent stock, prices, sales counts, ratings, reviews, promotions, regulatory numbers, or medical claims.
6. Development order is fixed: clean architecture -> design system -> Home -> Product -> Product Detail -> Cart -> Checkout -> COD -> Order Confirmation -> Trust/Policies -> Responsive -> Conversion -> SEO/Performance -> later systems.
7. Every phase must pass Technical QA, Functional QA, and Visual QA before being marked complete.
8. Responsive QA is mandatory at 390px, 820px, and 1440px. Mobile is the first priority.
9. Regression is failure. If a new change breaks a passed baseline, fix or roll back the new change instead of layering another patch.
10. Progress is measured by the real production experience, not by commit count or CI alone.
11. Each development round must state: changed, passed, still failing, next action.
12. Never work on another website when the request is to continue KHONCHAIHERB.

## Storefront visual baseline

The storefront must follow this composition unless the user explicitly changes it:

- slim announcement / service bar
- clean brand header with KHON CHAI HERB identity
- simple primary navigation
- prominent search
- premium hero with real product imagery and one primary CTA
- trust strip for nationwide delivery, COD, and secure ordering
- dynamic categories derived from live catalog data
- live product grid with real image, name, category, price, availability, Add to cart and Buy now
- brand / company trust section
- customer support / purchase guidance
- professional footer
- compact mobile navigation that never obstructs checkout actions

No fake Flash Deal, countdown, sales count, rating, review, discount, or promotion may appear without verified source data.

## Recovery workflow

For every continuation request:

`latest HEAD -> identify first non-PASS phase -> change only that phase -> deploy -> Technical QA -> Functional QA -> Visual QA -> baseline -> next phase`

Do not restart planning from zero unless the user explicitly requests a redesign of the plan.

## Definition of sale-ready V1

- professional Home
- live Product listing from `/api/products`
- product detail from `/api/product-detail`
- variant-safe cart
- Checkout form
- COD capability verified from `/api/payment-options`
- idempotent order creation through `/api/orders`
- order confirmation screen
- no demo/fake commerce data
- responsive at 390 / 820 / 1440
- no major console errors or layout overlap
- no regression in checkout/security baseline
