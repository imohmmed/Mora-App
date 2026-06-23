---
name: Wayl online payment flow
description: How Mora's checkout gates order completion on verified Wayl payment, and a known webhook security gap
---

# Wayl online payment (Mora checkout)

Online payment must NOT reach the order-complete screen until payment is verified.

**Native flow (checkout/index.tsx):** create order (financial_status=pending, payment_method=online) → create Wayl link → `WebBrowser.openBrowserAsync` (blocks until the user dismisses the in-app browser) → after dismissal, POLL `/store/wayl/status/:orderNumber` a few times → only `router.replace('/checkout/complete', {paid:'1'})` when status resolves to "paid"; otherwise stay on checkout, Alert, and keep `pendingOnline` state so a retry reuses the SAME order + link (no duplicate orders).
- `pendingOnline` is split into two steps: order creation (once) then link creation (regenerated on retry if it failed), so a link-creation failure never spawns a duplicate order.

**Status check is trustworthy:** `GET /store/wayl/status/:referenceId` (wayl.ts) calls Wayl's API directly with `WAYL_API_KEY` and marks `financial_status='paid'` when Wayl reports `completed`. This is the authenticated path the app relies on.

**Web flow:** redirects out to Wayl; complete.tsx verifies on return via `?fromWayl=1` + sessionStorage snapshot. Left unchanged.

**Admin:** order shows paid badge when `financialStatus==='paid'` and electronic payment when `paymentMethod==='online'`.

**Why / known gap:** `POST /store/wayl/webhook` updates orders to paid based only on `referenceId`+`status` with NO signature/secret validation — an attacker could forge it. We send `webhookSecret` on create-link but never verify it on receipt. The app's own confirmation uses the authenticated status GET, not the webhook, so the live flow is safe; harden the webhook (validate Wayl signature/secret) before trusting it for anything.

**Operational:** abandoned online orders stay `pending` forever (no TTL/reconciliation job). Acceptable for now; revisit if pending orders accumulate.
