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
