---
name: Live Activities Architecture
description: Full iOS Live Activity + Dynamic Island stack for Mora order tracking
---

## Rule
Live Activities for order tracking require 4 synchronized layers:

> MIGRATED OFF @bacons (Option Y): the widget is now produced by a hand-written self-contained
> config plugin `plugins/withMoraLiveActivity/index.js` (registered in app.json as
> `./plugins/withMoraLiveActivity`). The Expo native module was KEPT (autolinks fine) — only the
> @bacons widget was replaced. `targets/widget/` and the `@bacons/apple-targets` dep are deleted.
> Widget Swift now lives at `plugins/withMoraLiveActivity/ios/MoraOrderWidget/MoraOrderActivity.swift`
> (+ its own `Info.plist`). Verified: `expo prebuild -p ios --clean` emits a `MoraOrderWidget`
> app-extension target embedded via the host Embed-Foundation-Extensions phase (dstSubfolderSpec=13),
> DEVELOPMENT_TEAM resolved, GENERATE_INFOPLIST_FILE=NO.
>
> LOGO (June 2026 redesign): widget now embeds a WHITE Mora wordmark as a Base64 PNG string constant
> (`kMoraLogoBase64`) decoded to UIImage and rendered `.renderingMode(.template)` tinted white — same
> Base64 trick Carti uses, because asset-catalog/loose-PNG is unreliable in iOS17+ app-extensions. To
> regenerate: `magick assets/images/mora-wordmark.png -resize 240x -channel RGB -fill white -colorize 100
> +channel out.png` then `base64 -w0`. (sharp is NOT installed; ImageMagick `magick`/`convert` is.)
>
> GOTCHA (EAS prebuild failed, local passed): the plugin's widget source files must NOT live under
> any directory named `ios` — `artifacts/mora/.gitignore` has an `ios/` rule that ALSO matches
> `plugins/withMoraLiveActivity/ios/`, so those files were untracked and absent from the fresh EAS
> clone → the dangerousMod's "Missing source files" throw killed prebuild on EAS while local (where
> the files existed on disk) passed. Fix: source files live at `plugins/withMoraLiveActivity/MoraOrderWidget/`
> (no `ios` segment). Rule: never put committed plugin assets under a path segment named `ios`.
>
> GOTCHA 2 (eas credentials never showed "Select target"; EAS build "No profiles for app.mora1.com.widget"):
> node-xcode's `project.addTarget(name,"app_extension",...)` creates the widget PBXNativeTarget + the
> host's Embed-Foundation-Extensions copy phase + the `.appex` product ref, but does NOT create a
> `PBXTargetDependency`. `eas credentials` (GENERIC workflow, i.e. a local `ios/` exists) and EAS Build
> discover embedded extensions by walking the HOST target's `dependencies` array → with none, only the
> main app gets provisioned. WORSE: `addTargetDependency(host,[widget])` is a SILENT NO-OP on a fresh
> prebuild because xcode@3.0.1 guards on `if (proxySection && depSection)` and those two object sections
> don't exist yet. Fix in the plugin (after creating the target): pre-create
> `objects.PBXTargetDependency = {}` and `objects.PBXContainerItemProxy = {}`, ensure host
> `.dependencies` is an array, THEN call `project.addTargetDependency(hostUuid,[widgetUuid])`. Verify:
> prebuild → pbxproj must contain `isa = PBXTargetDependency` + `remoteInfo = "MoraOrderWidget"` and the
> host target's `dependencies = ( ... PBXTargetDependency )` non-empty.
>
> GOTCHA 3 (THE actual credentials blocker — build reaches Xcode archive then fails "No profiles for
> 'app.mora1.com.widget' ... Automatic signing is disabled and unable to generate a profile"):
> EAS Build signs with MANUAL signing using ONLY the profiles in EAS's OWN credential store. A profile
> created by hand in the Apple portal is NOT used. In MANAGED workflow (ios/ gitignored) `eas credentials`
> only ever sees the main app target, so the widget profile never enters EAS's store → archive fails on
> the widget target even though the target-dependency fix made the widget build correctly. FIX: declare
> the extension in app.json at `expo.extra.eas.build.experimental.ios.appExtensions` =
> [{ targetName:"MoraOrderWidget", bundleIdentifier:"app.mora1.com.widget" }] (+ `entitlements` only if
> the widget needs App Groups/Push — Mora's needs none). Then re-run `eas credentials -p ios` (now it
> exposes the widget target → set up all) OR re-run `eas build` (it provisions+stores the widget cert &
> profile before upload). targetName MUST equal the plugin's EXT_TARGET_NAME; bundleIdentifier MUST equal
> EXT_BUNDLE_ID. This is the documented Expo path for app-extension credentials in managed workflow.
>
> GOTCHA 4 (build succeeded + widget signed, but app's diagnose alert still said "Native module NOT in
> this build" → `requireNativeModule("MoraLiveActivity")` threw): this is the HOST-side Expo native
> module `modules/MoraLiveActivity/` (separate from the widget extension). It silently never compiled
> into the IPA. THREE compounding causes, all required to fix:
>   (a) `expo-module.config.json` declared `"platforms":["ios"]` with no platform block. Expo SDK 56
>       autolinking uses the `"apple"` platform key — `search` still finds the module (reads config) but
>       `resolve -p apple` DROPS any module that doesn't declare `apple` support, so it never becomes a
>       pod. Fix: `{ "platforms":["apple"], "apple": { "modules": ["MoraLiveActivityModule"] } }`
>       (the class name = the Swift class that `: Module`, NOT the `Name()` string).
>   (b) There was NO `.podspec` at all (and the Swift sat at the module root). Autolinking only resolves
>       an apple module when it finds a podspec, and it expects it under the module's `ios/` dir
>       (podspecDir). A root-level podspec is NOT discovered. Fix: `modules/MoraLiveActivity/ios/<Name>.podspec`
>       + move the Swift into that same `ios/` dir (podspec `source_files = '**/*.{swift,...}'` is relative
>       to podspecDir).
>   (c) But `ios/` is gitignored (the generic `ios/` rule), so the committed module dir would be stripped
>       from the EAS clone (same trap as GOTCHA 1). Fix: add negations to `artifacts/mora/.gitignore`:
>       `!modules/MoraLiveActivity/ios/` + `!modules/MoraLiveActivity/ios/**`. Verify with
>       `git status --porcelain` showing `?? modules/MoraLiveActivity/ios/` (untracked, NOT ignored) —
>       `git check-ignore -v` is misleading here (it prints the negation pattern line).
> VERIFY the whole fix on Linux without macOS/pods via:
> `npx expo-modules-autolinking resolve -p apple --json` → the module must appear with
> `pods[0].podName` + `modules[0].class`. That's the authoritative pre-pod-install signal that EAS's
> macOS `pod install` will compile + register it. Requires a NEW EAS build + reinstall to take effect.
>
> ENV GOTCHA: eas-cli is NOT installed globally in Replit, and `npx eas-cli`/`npm` hit a corrupted
> `~/.npm` cache (ECOMPROMISED lock, then ENOTEMPTY in `_npx`). Use `pnpm dlx eas-cli ...` (pnpm store
> is healthy) and run it FROM `artifacts/mora` (running from repo root makes eas-cli link to the wrong
> project `@itmohmmed/workspace` + write a stray root app.json). iOS prebuild can't run on Windows, so
> credentials/builds for the widget target must be driven from the Replit Linux shell.

### 1. Swift Widget (`plugins/withMoraLiveActivity/MoraOrderWidget/MoraOrderActivity.swift`)
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
- WHERE they live on the VPS (configured June 25 2026): in `/var/www/mora/artifacts/api-server/.env`
  (the dotenv-loaded file, SAME place as `WAYL_API_KEY`) — NOT in `ecosystem.config.js`. The ecosystem
  `env` block holds only infra (`PORT`,`NODE_ENV`,`DATABASE_PATH`,`GOOGLE_ADMIN_CLIENT_ID`,`ADMIN_JWT_SECRET`);
  app secrets go in `.env`. Store the key as ONE-LINE base64 with NO PEM headers — `apns.ts` wraps it in
  `-----BEGIN/END PRIVATE KEY-----\n...\n` and Node `crypto` parses single-line base64 between headers fine.
  This sidesteps all `.env` multiline-quoting fragility. Validate before trusting: read the value, wrap it
  the same way, `crypto.createSign("SHA256").sign({key,dsaEncoding:"ieee-p1363"})` — if it doesn't throw the
  key is valid for ES256 APNs JWTs. After editing `.env`, restart with
  `pm2 restart /var/www/mora/ecosystem.config.js --update-env && pm2 save` (dotenv re-reads `.env` at boot).
- FOOTGUN: `pm2 restart mora-api --update-env` with vars exported in your ssh shell pulls env FROM the shell,
  so it can drop infra vars the app expects — always restart from the ecosystem FILE, never the bare name+shell.
- VERIFY GOTCHA: do NOT use `/proc/<pid>/environ` to check a pm2 CLUSTER worker's env — workers are
  `cluster.fork()`ed from the daemon so `/proc/environ` shows only the daemon's (systemd) env and looks
  empty even when the app's `process.env` is fully populated. It will mislead you into thinking env was
  stripped. Check by app behavior (a 200 from a DB-backed endpoint proves DATABASE_PATH) or the key-sign test.

### Critical sync requirement
`MoraOrderActivityAttributes` struct MUST be identical in both `MoraOrderActivity.swift` AND `MoraLiveActivityModule.swift`. As of the June 2026 redesign the attributes are FOUR fields: `orderNumber`, `customerName`, `priceText` (String), `isPaid` (Bool) — and ContentState stays `{stage, message}`. `priceText`/`isPaid` are START-ONLY (ActivityKit attributes are immutable; per-activity updates only change content-state), so they must be set at the on-device `startActivity` (checkout) AND the server `start-live-activity` push, and propagated through `index.ts` startActivity, `NotificationContext.startOrderActivity`, and `apns.ts` `sendLiveActivityStartPush` attributes. Any name/type/count drift silently breaks the whole LA decode. The widget renders price normally, or a green "تم دفع الطلب" badge when `isPaid` (set true only for online+paid).

**Why:** expo-live-activity (software-mansion) was deprecated June 2026; expo-widgets requires SDK 56. @bacons/apple-targets was the interim approach but has now been replaced by the hand-written `withMoraLiveActivity` plugin (see banner at top) for build reliability and to drop the third-party dep.

## Order delivery_stage — 6-state model
The order status is a single `delivery_stage` string with 6 values: `confirmed`, `preparing`, `shipping`, `delivered`, `issue`, `cancelled`. This list must stay synchronized across FOUR layers or stages silently mismatch:
1. API `VALID_STAGES` allow-list + `STAGE_NOTIF` Arabic copy map in `routes/orders.ts` (the `delivery-stage` endpoint rejects unknown stages and skips notif if no copy entry).
2. Mobile `OrderStage` union type in `modules/MoraLiveActivity/index.ts`.
3. Swift `stageIcon`/`stageColor`/`stageLabel` switches in `MoraOrderActivity.swift`.
4. Admin order detail UI.

**Exception states (`issue`/`cancelled`) are NOT sequential progress** — first 4 are the linear flow; in BOTH the admin UI and the Swift widget they REPLACE the progress bar with an exception block, and they deep-link to chat: admin/push url = `/(tabs)/chat`, Swift `ContactButton` = `mora://chat` (resolves to `app/(tabs)/chat.tsx`).

**Single trigger point:** `POST /admin/orders/:id/delivery-stage` is the one place that fires all three customer signals together — APNs Live Activity update (`sendLiveActivityPush`) + regular push + in-app notification (`doSendNotification`). `apns.ts` treats `delivered` and `cancelled` as END states; `issue` is an UPDATE (NOT ended) so its "تواصل معنا" action persists. Dismissal windows: delivered ~6h (so the delivered "انطينا رأيك" rating CTA lingers), cancelled ~1h (contact action). Notification deep-link routing per stage: confirmed/preparing/shipping → `/orders`; delivered/issue/cancelled → `/(tabs)/chat`. Widget `widgetURL` mirrors this: confirmed/preparing/shipping → `mora://orders`, the rest → `mora://chat`. The widget is a Dribbble-style 4-step tracker (icon nodes + connecting line + checkmarks for completed steps), per-stage Arabic headline+subtitle (ContentState.message overrides subtitle only when non-empty — server sends empty by default so the widget's own subtitle shows), ETA pill (confirmed/preparing "3-4 أيام", shipping "1-2 يوم").

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

## Why no Dynamic Island appears — diagnostic playbook
UPDATE (June 25 2026): RESOLVED. The post-#47 EAS build DOES capture per-activity LA tokens — prod logs
show `POST /store/orders/:id/live-activity-token` → 200 from a live customer device, and a Live Activity
renders on the lock screen. The ONLY remaining blocker was that the APNs key was missing on the server, so
`delivery-stage` updates failed with "APPLE_PUSH_KEY_ID / APPLE_PUSH_KEY not configured". That key is now
configured in `.env` (see section 5). So for an ACTIVE LA, changing order status now updates the Island.
The pre-#47 "zero tokens" snapshot below is HISTORICAL (old IPA predated the working widget):

Prod SQLite (`/var/www/mora/data/mora.db`, query via better-sqlite3 — no sqlite3 CLI on VPS): across ALL customers `COUNT(live_activity_pts_token)=0` and ALL orders `live_activity_push_token IS NULL`. ZERO LA tokens ever captured.
- Regular Expo push works → APNs/aps-environment is fine. So a universally-null LA token means the on-device Live Activity never starts/produces a token.
- Verified repo build config is CORRECT via `npx expo prebuild -p ios --no-install`: pbxproj contains `MoraOrderWidget` (com.apple.product-type.app-extension) AND it is embedded ("Embed Foundation Extensions" copy phase). `NSSupportsLiveActivities` is in `ios/Mora/Info.plist`, `aps-environment` in entitlements. Widget Swift has `@main MoraWidgetBundle` + `ActivityConfiguration` + full DynamicIsland. So a FRESH EAS build will work.
- → Root cause is runtime/install, not code: the IPA on the phone predates the working widget, OR Settings→Mora→Live Activities is OFF, OR testing on web. Fix = fresh native EAS build + install + enable LA in Settings. Cannot be verified/fixed from JS/server.
- **Silent-failure trap:** every layer swallowed errors (index.ts startActivity returns null; Swift catch returns nil; checkout fire-and-forget) → user saw nothing with no reason. Added `MoraLiveActivity.diagnose()` (moduleLoaded/iosVersion/areActivitiesEnabled/pushToStartSupported/activeActivities) + `startTestActivity()` (resolves {ok,error}) surfaced via an Account→Information "Test Live Activity" row (iOS-only Alert). Use it on the next build to get the exact reason.

## Reference: imohmmed's Carti-app LA (the PROVEN-working approach, same author as Mora)
Carti (github.com/imohmmed/Carti-app, artifacts/carti-merchant) is the SAME author's other app where Live Activity works in production after ~20 build iterations (#52–#71). It uses a fundamentally MORE ROBUST approach than Mora — worth migrating Mora to if the widget keeps missing from builds:
- **Custom hand-written Expo config plugin** `plugins/withLiveActivity/index.js` (registered in app.json plugins as `./plugins/withLiveActivity`). On every `expo prebuild --clean` (ios/ is gitignored, so EAS regenerates from scratch) it PROGRAMMATICALLY: (1) sets NSSupportsLiveActivities; (2) adds the RN bridge .swift+.m to the MAIN app target's Compile Sources via withXcodeProject; (3) creates the widget extension PBXNativeTarget via project.addTarget(name,"app_extension",folder,bundleId) incl. the host's "Embed Foundation Extensions" copy phase; (4) withDangerousMod physically copies all source files into ios/. Fully idempotent, zero third-party magic.
- **Classic RN bridge, NOT Expo Modules API:** `@objc(CartiLiveActivityModule)` Swift + a `.m` with `RCT_EXTERN_MODULE`/`RCT_EXTERN_METHOD`; JS calls `NativeModules.CartiLiveActivityModule`. (Mora uses Expo `requireNativeModule("MoraLiveActivity")` + `@bacons/apple-targets` for the widget — both rely on autolinking/3rd-party plugin, which is the fragile part.)
- **Shared Attributes file is PHYSICALLY DUPLICATED** into both the host target and the widget target (not "target membership"). ActivityKit matches across the host↔widget process boundary on the UNQUALIFIED type name + Codable structure, so two byte-identical copies are equivalent and more robust on EAS. Source of truth lives in the extension folder; plugin copies it to host on every prebuild.
- **Battle-tested gotchas Carti solved (apply to Mora too):** (a) widget logo rendered as grey square via loose PNG AND asset-catalog on iOS17+ extensions (actool unreliable for app-extensions) → fix = embed the PNG as Base64 in a generated `CartiLogoData.swift` (`let X_LOGO_BASE64="..."`), decode to UIImage at first render, zero bundle lookup. (b) Xcode14+ refuses to archive the extension target without DEVELOPMENT_TEAM → plugin resolves it from APPLE_TEAM_ID env / app.json appleTeamId / host target's DEVELOPMENT_TEAM. (c) `autoStart:false` by default — auto-starting on mount with all-zero stats made iOS render a permanently black/empty Dynamic Island that later pushes couldn't recover; let server Push-to-Start own the lifecycle so it appears with REAL data. (d) cold-restart adoption: re-bind to `Activity.activities.first` so end()/update() work after the app was killed. (e) token reads race `pushTokenUpdates` against a 5–10s timeout so a stuck ActivityKit never hangs the JS promise.
