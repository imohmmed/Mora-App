---
name: Discount codes (COD + Wayl)
description: How discount-code redemption is split between COD (immediate) and online/Wayl (deferred), and why webhook auth was left as-is.
---

# Discount code redemption model

- `validateDiscount(code, subtotal, itemCount)` is the single server-side authority: checks status, date window, usage limit (`usage_count >= usage_limit` rejects), conditions (minSubtotal, minItems), computes amount, applies `maxDiscount` cap, clamps to subtotal. Client values are never trusted — order creation re-validates.
- Order total = subtotal + shipping − discount, clamped ≥ 0.

## Redemption timing differs by payment method
- **COD**: `redeemDiscount(code)` runs immediately at order creation.
- **Online (Wayl)**: redemption is DEFERRED until the order transitions to paid. Redeeming at creation would over-count codes for abandoned online payments.
  - The paid transition happens via `markOrderPaid` (webhook OR status-poll path), which is an **atomic** `UPDATE ... WHERE financial_status != 'paid'` and only redeems when `info.changes > 0`. This makes redemption idempotent against duplicate/forged/replayed paid events.
- **Zero-total online order** (fully discounted): `create-link` returns `{url:null, paid:true}` and settles immediately; the mobile client checks `paid` and routes straight to the success screen instead of opening Wayl.

## redeemDiscount is conditionally capped
- `UPDATE discounts SET usage_count = usage_count + 1 WHERE ... AND (usage_limit IS NULL OR usage_count < usage_limit)` — concurrent redemptions can never push `usage_count` past the limit (no-op at cap).
- **Known soft-limit tradeoff**: validate and redeem are separate steps, so at the exact usage-limit boundary under simultaneous checkouts a couple of orders may receive a discounted total even though the counter no-ops. Accepted as normal store-promo behavior (Shopify is similar). The counter itself is always accurate as a cap.

## Wayl webhook signature verification intentionally NOT added
**Why:** the `/store/wayl/webhook` endpoint trusts body `referenceId/status` with no HMAC check — this PRE-DATES the discount feature (it already marked orders paid). Adding signature verification blind to Wayl's exact signing scheme risks rejecting all real payments and breaking checkout.
**How to apply:** if hardening this later, get Wayl's documented signature/HMAC scheme first, verify against `WAYL_WEBHOOK_SECRET`, and test against a real payment before shipping. Until then, the atomic `markOrderPaid` keeps redemption idempotent so a forged event can't double-count.
