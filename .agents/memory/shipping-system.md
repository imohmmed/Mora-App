---
name: Shipping system (zones, rules, free_shipping)
description: How Mora computes delivery cost per Iraqi governorate, free-delivery rules, and the server-authority rule for order totals.
---

# Shipping system

- `shipping_zones` = per-governorate delivery price (18 Iraqi governorates seeded, EN + AR names). `shipping_rules` = bilingual (textEn/textAr) customer-facing delivery messages + optional `threshold` (subtotal at which delivery becomes free).
- Public reads: `GET /api/store/shipping-zones`, `GET /api/store/shipping-rules` (enabled only). Admin CRUD under `/api/admin/shipping-*` behind `requireAdmin`. Bulk price save = `PUT /api/admin/shipping-zones` body `{ zones: [...] }`.
- `free_shipping` discount type (value 0, conditions minSubtotal/minItems) → `validateDiscount` returns `freeShipping:true`.

## Server-authoritative shipping (security rule)
**Rule:** `POST /store/orders` must derive `shipping` ONLY from the selected enabled zone's price. Never trust the client-sent `shipping` field. Require a valid governorate (400 if missing/invalid).
**Why:** an earlier version fell back to client `shipping` when governorate was missing/unmatched, letting a customer submit `shipping:0` (or a fake governorate) to zero out delivery and tamper with the total. Architect flagged it as a blocking integrity hole.
**How to apply:** any future change to order creation (drafts, abandoned-cart recovery, new checkout clients) must keep shipping server-computed; client values are display-only. Free shipping wins when ANY enabled rule `threshold <= subtotal` OR a `free_shipping` discount applies.
