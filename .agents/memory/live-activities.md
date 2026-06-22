---
name: Live Activities Architecture
description: Full iOS Live Activity + Dynamic Island stack for Mora order tracking
---

## Rule
Live Activities for order tracking require 4 synchronized layers:

### 1. Swift Widget (`targets/widget/MoraOrderActivity.swift`)
- `MoraOrderActivityAttributes` struct with `orderNumber` + `customerName` static, `stage` + `message` as ContentState
- `MoraOrderActivityWidget` for Lock Screen + Dynamic Island (expanded/compact/minimal)
- `@main MoraWidgetBundle` wraps it

### 2. Native Module (`modules/MoraLiveActivity/`)
- `MoraLiveActivityModule.swift` — Expo Modules with `startActivity`, `updateActivity`, `endActivity`, `getPushToken` (async), `getActiveActivityIds`
- `index.ts` — `MoraLiveActivity` object with graceful fallback when native not available

### 3. NotificationContext integration
- `startOrderActivity({ orderId, orderNumber, customerName, stage?, message? })` — starts native Live Activity, sends APNs push token to backend via `POST /api/store/orders/:id/live-activity-token`
- `updateOrderStage(stage, message?)` — updates both React state AND native Live Activity
- `endOrderActivity()` — ends native Live Activity

### 4. Backend (`api-server/`)
- `POST /store/orders/:id/live-activity-token` — saves APNs Live Activity push token to `live_activity_push_token` column
- `POST /admin/orders/:id/delivery-stage` — updates `delivery_stage` column + sends APNs push via `lib/apns.ts`
- `lib/apns.ts` — HTTP/2 APNs push with JWT auth (.p8 key), topic `{bundleId}.push-type.liveactivity`

### 5. Required env vars for APNs push (production)
- `APPLE_PUSH_KEY_ID` — 10-char Key ID from Apple Developer
- `APPLE_PUSH_KEY` — contents of .p8 file (with or without PEM headers)

### Critical sync requirement
`MoraOrderActivityAttributes` struct MUST be identical in both `MoraOrderActivity.swift` AND `MoraLiveActivityModule.swift`.

**Why:** expo-live-activity (software-mansion) was deprecated June 2026; expo-widgets requires SDK 56; @bacons/apple-targets is the correct SDK 54 approach.

## Order delivery_stage — 6-state model
The order status is a single `delivery_stage` string with 6 values: `confirmed`, `preparing`, `shipping`, `delivered`, `issue`, `cancelled`. This list must stay synchronized across FOUR layers or stages silently mismatch:
1. API `VALID_STAGES` allow-list + `STAGE_NOTIF` Arabic copy map in `routes/orders.ts` (the `delivery-stage` endpoint rejects unknown stages and skips notif if no copy entry).
2. Mobile `OrderStage` union type in `modules/MoraLiveActivity/index.ts`.
3. Swift `stageIcon`/`stageColor`/`stageLabel` switches in `MoraOrderActivity.swift`.
4. Admin order detail UI.

**Exception states (`issue`/`cancelled`) are NOT sequential progress** — first 4 are the linear flow; in BOTH the admin UI and the Swift widget they REPLACE the progress bar with an exception block, and they deep-link to chat: admin/push url = `/(tabs)/chat`, Swift `ContactButton` = `mora://chat` (resolves to `app/(tabs)/chat.tsx`).

**Single trigger point:** `POST /admin/orders/:id/delivery-stage` is the one place that fires all three customer signals together — APNs Live Activity update (`sendLiveActivityPush`) + regular push + in-app notification (`doSendNotification`). `apns.ts` treats `delivered` and `cancelled` as end states (cancelled stays visible ~1h for the contact action, delivered dismisses fast).

**Wayl payment auto-confirm:** the webhook marks `financial_status='paid'` server-side; `checkout/complete.tsx` polls `GET /store/wayl/status/:orderNumber` a few times on mount (native + web) so the screen flips to paid without a manual tap. LA styling: black bg, white text, accent `#0373C2` = `rgb(0.01,0.45,0.76)`.
