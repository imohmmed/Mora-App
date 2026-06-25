---
name: Shipping system (zones, rules, free_shipping)
description: How Mora computes delivery cost per Iraqi governorate, free-delivery rules, and the server-authority rule for order totals.
---

# Shipping system

- `shipping_zones` = per-governorate delivery price (18 Iraqi governorates seeded, EN + AR names). `shipping_rules` = bilingual (textEn/textAr) customer-facing delivery messages + optional `threshold` (subtotal at which delivery becomes free).
- Public reads: `GET /api/store/shipping-zones`, `GET /api/store/shipping-rules` (enabled only). Admin CRUD under `/api/admin/shipping-*` behind `requireAdmin`. Bulk price save = `PUT /api/admin/shipping-zones` body `{ zones: [...] }`.
- `free_shipping` discount type (value 0, conditions minSubtotal/minItems) → `validateDiscount` returns `freeShipping:true`.

## Governorate names are ALWAYS displayed in Arabic
**Rule:** Governorate names must render in Arabic (`governorateAr || governorate`) everywhere users/admins see them, regardless of the UI language toggle — the mora checkout governorate picker (mobile+web) and the admin shipping page. The picker's option `value` stays the English `governorate` (canonical key for `selectedZone` matching + the `governorate` sent to the API); only the displayed label / `form.city` becomes Arabic.
**Why:** product decision — Iraqi governorate names are recognized in Arabic; English labels confused users even on the English UI.
**How to apply:** never gate governorate display on `lang==="ar"`. Checkout has a normalization effect that, once zones load, converts a prefilled/saved English `form.city` to its Arabic name and restores `selectedZone`. Admin shipping shows Arabic primary + English as a small muted reference line.

## Server-authoritative shipping (security rule)
**Rule:** `POST /store/orders` must derive `shipping` ONLY from the selected enabled zone's price. Never trust the client-sent `shipping` field. Require a valid governorate (400 if missing/invalid).
**Why:** an earlier version fell back to client `shipping` when governorate was missing/unmatched, letting a customer submit `shipping:0` (or a fake governorate) to zero out delivery and tamper with the total. Architect flagged it as a blocking integrity hole.
**How to apply:** any future change to order creation (drafts, abandoned-cart recovery, new checkout clients) must keep shipping server-computed; client values are display-only. Free shipping wins when ANY enabled rule `threshold <= subtotal` OR a `free_shipping` discount applies.
