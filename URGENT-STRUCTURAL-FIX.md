# KHONCHAIHERB Urgent Structural Fix v1.34.6

Scope is intentionally narrow and non-regressive.

## Must fix before merge
- Exactly one visible storefront header.
- Exactly one visible product search input.
- Exactly one visible primary navigation.
- Exactly one visible login/account entry on desktop.
- No raw material icon token text such as shopping_cart, person_add, receipt_long.
- Header search is at least 16px and 44px high.
- Desktop navigation is at least 15–16px and 48px high.
- Existing Hero, Product Cards, COD, Checkout, Receipt, Orders and API behavior are not downgraded.
- Service worker cache is bumped so the browser does not keep the duplicate-header release.
- Browser E2E must pass at 390, 820, 1440 and 1920 px.
- Screenshots must be visually reviewed before merge.

## Change policy
This fix is based directly on the current production branch. It does not merge the abandoned 49-commit structural-cleanup PR. Changes are limited to the structural header runtime/CSS, cache release, and QA contracts needed to prove the fix.
