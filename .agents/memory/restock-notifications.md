---
name: Restock notifications (notify-me when back in stock)
description: How the out-of-stock "notify me" → auto-push-on-restock pipeline works across mora/api/admin, and the variant-sync gotcha.
---

# Restock notifications

OOS flow: mora product page shows a "Notify me / ابلغني عند توفره" CTA instead of ADD TO BAG when the **active variant** inventory<=0. Logged-in only (login prompt → `/auth`). Subscribing POSTs `/store/restock-requests`.

## Data model
- `restock_requests` table: unique on `(customer_id, variant_id)`; index on `(variant_id, notified)`. Stores email + a snapshot `push_token` (send-time still reads `push_tokens` for the freshest token — snapshot is just a record).
- The endpoint validates the variant exists AND `variant.product_id === productId` before inserting — a bad row would poison the deep-link/content for ALL waiters on that variant because `notifyRestock` uses `pending[0].product_id` as the shared link source.

## Trigger (the important part)
`notifyRestock(variantId)` fires on a **0 → >0 inventory transition**, in two places in products.ts:
1. admin variant update endpoint
2. **variant sync** — sync DELETEs + reinserts variants with NEW ids, so it must migrate `restock_requests.variant_id` to the new id before/while detecting restocked keys, or pending rows get orphaned.

**Why:** because the trigger only fires on the 0→>0 edge, a missed/orphaned migration means the alert never re-fires (it won't repeat unless it goes OOS again). Any future change to variant id handling in sync must keep the restock migration in lockstep.

Delivery: rows marked `notified=1` after `doSendNotification`. This is acceptable because the in-app notification is saved unconditionally (guaranteed channel) and a thrown send error skips the marking (await throws → mark loop never runs) → retry-safe for hard failures. Push tickets that "fail soft" are best-effort.

## Templates (editable in admin)
- `restock:available` and `cart:abandoned` are editable templates in the admin notification editor (new group; `notifications.group.engagement` i18n key). Both support `{productName}` substitution (replaceVars + PhonePreview).
- **`cart:abandoned` is template-only** — there is NO server cron/trigger for it (cart is client-side). It exists so copy is ready; wiring a trigger is future work. Communicated to user.

## Schema migration note
This table was added fresh, so `CREATE TABLE IF NOT EXISTS` adds it (with all columns incl. push_token) on first prod boot. Adding columns later to an EXISTING prod table needs ALTER — CREATE IF NOT EXISTS won't add them. Dev DB is in-memory (reseeds every restart).
