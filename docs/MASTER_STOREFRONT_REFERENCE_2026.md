# KHONCHAIHERB — Master Storefront Reference 2026

Status: APPROVED / CANONICAL

This document locks the customer-facing direction approved for KHONCHAIHERB. New storefront work must preserve this direction unless the owner explicitly approves a replacement reference.

## Brand direction

- Official English brand: KHONCHAIHERB
- Thai brand: คุณชายสมุนไพร
- Visual character: Premium Herbal, clean, bright, modern, trustworthy, commerce-first.
- Primary palette: white + deep herbal green + soft botanical green; red only for meaningful price/promotion emphasis; gold only for rating/accent use.
- Avoid dark luxury layouts, excessive gradients, clutter, developer/debug messaging, fake urgency, fake reviews, fake sold counts, and decorative effects that slow purchase flow.

## Canonical homepage order

1. White commerce header: brand, prominent search, account, favorites, cart.
2. Secondary navigation row with clear current state.
3. Light botanical hero: strong Thai value proposition on the left; verified product imagery on the right; primary shopping CTA and secondary guided-shopping/AI CTA.
4. Circular category/intent shortcuts.
5. Two-column promotional/guided-shopping band. Promotions must be backed by real configured offers; otherwise use evergreen brand/service messaging rather than fabricated discounts.
6. Best-selling / recommended product shelf using only sale-ready products with verified image, price, and stock.
7. Video commerce area only when real usable media exists.
8. Customer review area only when verified review content exists.
9. Trust/service strip.
10. Structured footer.
11. Floating AI shopping assistant affordance that does not obstruct purchase controls.

## Product card standard

- Product image is visually dominant and never stretched.
- Product name is readable in Thai.
- Show only real price, availability, promotion, rating, review count, or sold count.
- Primary add-to-cart action uses the brand green.
- Favorites remain available without competing with the purchase CTA.
- Desktop target: up to five cards per row where width supports it.
- Mobile target: two cards per row with touch-safe controls.

## Mobile standard

Mobile is a first-class storefront, not a shrunken desktop page.

- Search and cart remain immediately discoverable.
- Horizontal shortcut/category rails may scroll with snap behavior.
- Hero copy remains concise and product imagery remains visible without excessive page height.
- Primary purchase actions must have touch-safe targets and remain easy to reach.
- Bottom/floating UI must never cover checkout, add-to-cart, or consent controls.

## Commerce safety

Existing production protections remain authoritative:

- Do not expose products that are not sale-ready.
- COD and checkout availability are controlled by runtime production configuration.
- Online payments remain disabled until a real gateway and signed webhook are connected.
- Do not create synthetic orders, reviews, ratings, sold counts, promotions, stock, or financial events to make the storefront look populated.
- Product detail, cart, checkout, receipt, packing, shipping, COD reconciliation, return/refund, member, loyalty/favorites, and Seller Center behavior must not be broken by visual work.

## AI assistant standard

AI is a shopping/service assistant, not decoration. It should help with product discovery, navigation, order support, and after-sales flows. It must not make unsupported medical claims or invent product facts.

## Engineering rule

Customer-facing visual authority should converge on one final Master Reference layer loaded after legacy presentation layers. Legacy assets may remain for backward compatibility, but they must not be allowed to override the approved 2026 storefront presentation.

Any future redesign that changes the visual language or page hierarchy requires explicit owner approval before implementation.