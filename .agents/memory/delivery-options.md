---
name: Checkout delivery options + Live Activity
description: How deliveryType (standard/express/pickup) flows from checkout through orders to the iOS Live Activity widget, and the rules that keep it consistent
---

## Three delivery types
`standard` (توصيل عادي), `express` (توصيل سريع), `pickup` (استلام من المحل). Stored in
`orders.delivery_type` (TEXT NOT NULL DEFAULT 'standard'). Normalized server-side — never trust
client to send a valid value.

## deliveryMessage rules — MUST be identical in two places
The same logic lives in `artifacts/mora/lib/deliveryMessage.ts` (initial LA message at checkout)
and api-server `deliveryMessage(type, stage)` (every server push). If they drift, the widget text
flickers between checkout-start and the first server stage update.
Rules: terminal stages (delivered/issue/cancelled) → "" (widget shows its own subtitle); pickup →
"سيتم تجهيزه لك في المحل"; standard|express + stage==shipping → "مدة التوصيل من 1-2 يوم"; express →
"يتم التوصيل الطلب من 1-3 ايام"; standard → "مدة التوصيل من 1-5 ايام".

## deliveryType must ride EVERY APNs path or pickup renders a 4-step widget
There are 4 server push sites that build LA content-state: delivery-stage update, start-live-activity,
and the payment-confirmed path (which has BOTH a direct update push AND a push-to-start fallback).
**Why:** the widget chooses 3-step (pickup) vs 4-step (delivery) flow from content-state.deliveryType;
any path that omits it defaults to "standard" and a pickup order shows the shipping step.
**Gotcha caught in review:** the payment-confirmed path originally sent `message: ""`, which
overwrites the delivery-duration line with a blank. Always send
`deliveryMessage(deliveryType, currentStage)` there, not empty.

## Swift ContentState.deliveryType is optional (String?) on purpose
Both the Expo module struct and the widget ContentState declare `deliveryType: String?`.
**Why:** back-compat across build/server combos — a new build decodes old pushes lacking the key, and
an old build ignores the extra key from new server pushes. Widget falls back to "standard" via
`?? "standard"` / `deliveryType == "pickup"` checks.

## Pickup stage flow = confirmed→preparing→delivered (NO shipping)
- Server: pickup orders are blocked from transitioning to the shipping stage.
- Widget: `kPickupStageFlow` (3) vs `kStageFlow` (4); `stageFlow(for:)` and `stageEta(for:)` are
  delivery-aware (pickup ETA → nil). issue/cancel always available.
- Admin detail.tsx: filters `shipping` out of the `stages` array for pickup — drives progress bar,
  stage controls, currentIndex, and stageBadge; shows a delivery-type badge in the header.

## Native widget step-count change REQUIRES an EAS rebuild
Server message changes take effect immediately on the currently installed build (the widget just
renders content-state.message). But the 3-step pickup flow / delivery-aware ETA is native Swift —
it only ships with a new EAS native build. Always warn the user: server-only deploy updates the text,
not the old widget's step UI.
