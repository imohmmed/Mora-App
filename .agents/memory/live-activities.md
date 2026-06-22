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

## Push-to-start (server-driven START) — the reliable path
On-device `Activity.request()` at checkout is fragile: if the per-activity push token never arrives, `live_activity_push_token` stays null and nothing can be updated remotely (root symptom of "no Live Activity appeared"). The robust pattern (iOS 17.2+) is **push-to-start**:
- Swift: `Activity<MoraOrderActivityAttributes>.pushToStartTokenUpdates` exposed via `getPushToStartToken` (one-shot async). There is NO static "current pushToStartToken" property — the stream is the only source; it emits the current token to new subscribers, so a one-shot await is fine (JS call is fire-and-forget, never blocks the app).
- App captures it when authenticated (effect on `authToken` in `NotificationContext`) → `POST /store/notifications/live-activity-pts-token` → stored on `customers.live_activity_pts_token`.
- Backend `sendLiveActivityStartPush` (lib/apns.ts) sends an APNs `event:"start"` push: payload needs `attributes-type:"MoraOrderActivityAttributes"` (MUST equal the struct name) + `attributes:{orderNumber,customerName}` + `content-state:{stage,message}` + `alert`; headers `apns-push-type:liveactivity`, topic `app.mora1.com.push-type.liveactivity`, priority `10`.
- Admin trigger `POST /admin/orders/:id/start-live-activity {stage?,message?}` starts one on the customer's device on demand (also the way to TEST a Live Activity on a specific device remotely).
- Requires `aps-environment` entitlement (added explicitly to app.json `ios.entitlements`; was implicitly present since Expo push works) AND the widget extension actually compiled into the build — push-to-start, like on-device start, silently does nothing if the widget isn't in the IPA.

**Why null token despite settings ON + regular push working:** regular push uses an Expo push token (`getExpoPushTokenAsync`), which proves aps-environment/APNs registration are fine. So a null LA token is NOT an entitlement problem — it means the on-device activity never produced a per-activity token (activity didn't start, or the widget/native module wasn't in the installed build). Cannot be verified remotely; needs a rebuild.

**Known follow-ups (not yet done):** (1) after a push-to-start START, the app should observe `Activity.activityUpdates`→`pushTokenUpdates` and POST that per-activity token to the order so later `delivery-stage` updates work — currently a push-started activity has no per-activity token stored (attributes carry `orderNumber` not `orderId`, so mapping needs orderId added to attributes). (2) Duplicate-activity risk if BOTH on-device start and server push-to-start fire for the same order — pick one start authority once the on-device path is confirmed working.

## Why no Dynamic Island appears — diagnostic playbook (verified June 2026)
Prod SQLite (`/var/www/mora/data/mora.db`, query via better-sqlite3 — no sqlite3 CLI on VPS): across ALL customers `COUNT(live_activity_pts_token)=0` and ALL orders `live_activity_push_token IS NULL`. ZERO LA tokens ever captured.
- Regular Expo push works → APNs/aps-environment is fine. So a universally-null LA token means the on-device Live Activity never starts/produces a token.
- Verified repo build config is CORRECT via `npx expo prebuild -p ios --no-install`: pbxproj contains `MoraOrderWidget` (com.apple.product-type.app-extension) AND it is embedded ("Embed Foundation Extensions" copy phase). `NSSupportsLiveActivities` is in `ios/Mora/Info.plist`, `aps-environment` in entitlements. Widget Swift has `@main MoraWidgetBundle` + `ActivityConfiguration` + full DynamicIsland. So a FRESH EAS build will work.
- → Root cause is runtime/install, not code: the IPA on the phone predates the working widget, OR Settings→Mora→Live Activities is OFF, OR testing on web. Fix = fresh native EAS build + install + enable LA in Settings. Cannot be verified/fixed from JS/server.
- **Silent-failure trap:** every layer swallowed errors (index.ts startActivity returns null; Swift catch returns nil; checkout fire-and-forget) → user saw nothing with no reason. Added `MoraLiveActivity.diagnose()` (moduleLoaded/iosVersion/areActivitiesEnabled/pushToStartSupported/activeActivities) + `startTestActivity()` (resolves {ok,error}) surfaced via an Account→Information "Test Live Activity" row (iOS-only Alert). Use it on the next build to get the exact reason.
