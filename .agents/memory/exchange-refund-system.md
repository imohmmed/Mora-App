---
name: Exchange & Refund system
description: Durable rules for the order exchange/refund flow (API + mobile + admin)
---

# Exchange & Refund system

- Flow: delivered/partial_return orders only → customer creates request with description + photos + return items in ONE call; exchange goes to `awaiting_items` (customer shops, submits new items → `pending`), refund goes straight to `pending`. Admin approves with a price → new order `#OLD(E)`/`#OLD(R)` (numeric suffix on collision), total = admin price; exchange decrements inventory of new items.
- **One active request per order** is enforced by a partial unique index on `exchange_requests(order_id) WHERE status IN ('awaiting_items','pending','approved')` — the read-then-insert check alone is not race-safe; INSERT constraint errors map to 409.
  - **Why:** architect review flagged read-then-insert as bypassable under concurrency.
- **Approval must aggregate quantities per variantId** before the stock check/decrement — duplicate lines for the same variant can individually pass a per-line check while the combined qty exceeds stock. Exchange items with missing variantId or qty<=0 are rejected outright.
- **Mobile exchange-mode state is customer-scoped**: AsyncStorage key `mora_active_exchange_v2` stores `{requestId, orderNumber, customerId}`; context returns null and purges storage if the logged-in user id doesn't match (prevents cross-account leak on shared devices).
- Prod API listens on **port 3001** behind nginx (dev uses 8080); admin JWTs for testing can be minted with `ADMIN_JWT_SECRET` env + owner email from middlewares/auth.ts.
