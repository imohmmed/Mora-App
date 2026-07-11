---
name: Restock notifications (notify-me when back in stock)
description: How the out-of-stock "notify me" → auto-push-on-restock pipeline works across mora/api/admin, and the variant-sync gotcha.
---

# Restock notifications

OOS flow: mora product page shows a "Notify me / ابلغني عند توفره" CTA instead of ADD TO BAG when the **active variant** inventory<=0. Logged-in only (login prompt → `/auth`). Subscribing POSTs `/store/restock-requests`.

## Web-safe prompts (critical)
`react-native-web`'s `Alert.alert` is a **silent no-op** — the notify-me login prompt and error feedback did nothing on web. Always branch on `Platform.OS === "web"` → use `window.confirm`/`window.alert`; keep native `Alert.alert`. This applies anywhere a notify/login prompt must work on Expo web (product page, QuickAddSheet).

## Notify surfaces (besides product page)
- **QuickAddSheet**: when the WHOLE product is OOS (`variants.every(inventory<=0)`), CTA becomes Notify me and subscribes ALL variant ids via `Promise.all(requestRestockNotify)`.
- **Collection list**: OOS cards show "NOTIFY ME" + bell (still open QuickAddSheet); list sorts in-stock first, sold-out last (`useMemo` sort). OOS detection = product has variants and none have inventory>0; no top-level inventory field on Product.

## Admin "Wanted Products"
`GET /admin/restock-requests` (requireAdmin) aggregates `restock_requests` by product: total/pending(notified=0)/distinct customers/last requested + joined title+first image+price. Page at `/products/wanted` (sidebar under Store, `nav.wanted`, `wanted.*` i18n in products dict). Counts are historical+pending; pending-only filter is future work.

## Data model
- `restock_requests` table: unique on `(customer_id, variant_id)`; index on `(variant_id, notified)`. Stores email + a snapshot `push_token` (send-time still reads `push_tokens` for the freshest token — snapshot is just a record).
- The endpoint validates the variant exists AND `variant.product_id === productId` before inserting — a bad row would poison the deep-link/content for ALL waiters on that variant because `notifyRestock` uses `pending[0].product_id` as the shared link source.

## Trigger (the important part)
`notifyRestock(variantId)` fires on a **0 → >0 inventory transition**, in two places in products.ts:
1. admin variant update endpoint
2. **variant sync** — sync DELETEs + reinserts variants, but as of July 2026 it **reuses the existing variant id** when the option1/option2 combination matches. The old `restock_requests.variant_id` migration was removed because ids are now stable across saves.

**Why:** regenerating ids on every save orphaned every id reference (orders' line_items, restock_requests, returns) — a full return silently restocked nothing (UPDATE hit 0 rows). Stable ids fix the class of bug. If option combos genuinely change (renamed size), old references still orphan — the return route handles that with a product+size/title fallback resolver and 409s if unresolvable.

Delivery: rows marked `notified=1` after `doSendNotification`. This is acceptable because the in-app notification is saved unconditionally (guaranteed channel) and a thrown send error skips the marking (await throws → mark loop never runs) → retry-safe for hard failures. Push tickets that "fail soft" are best-effort.

## Templates (editable in admin)
- `restock:available` and `cart:abandoned` are editable templates in the admin notification editor (new group; `notifications.group.engagement` i18n key). Both support `{productName}` substitution (replaceVars + PhonePreview).
- **`cart:abandoned` is template-only** — there is NO server cron/trigger for it (cart is client-side). It exists so copy is ready; wiring a trigger is future work. Communicated to user.

## Schema migration note
This table was added fresh, so `CREATE TABLE IF NOT EXISTS` adds it (with all columns incl. push_token) on first prod boot. Adding columns later to an EXISTING prod table needs ALTER — CREATE IF NOT EXISTS won't add them. Dev DB is in-memory (reseeds every restart).
