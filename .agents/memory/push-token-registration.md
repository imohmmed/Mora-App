---
name: Push token registration flow (mora)
description: Why admin shows "0 devices" — push tokens only register for logged-in customers, and login must be wired to NotificationContext
---

# Push notification device registration (mora app)

## How it works (by design)
- The server stores a push token ONLY against a logged-in customer: `POST /api/store/notifications/token` calls `getCustomerId(req)` (looks up the Bearer token in the `sessions` table) and rejects with 401 if there is no valid customer session. So **anonymous users can never register a device** — push is tied to an account.
- The app's `services/notifications.ts#registerForPushNotificationsAsync()` returns `null` on `Platform.OS === "web"`. **Web can never receive Expo push** — testing on app.moramoda.tech / moramoda.tech will always show 0 devices. Push requires the native iOS/Android build.
- Admin "registered devices" = `SELECT COUNT(*) FROM push_tokens` (stats endpoint). 0 means the table is empty.

## The bug that caused "0 devices"
`NotificationContext.onUserLogin(authToken)` is the ONLY path that calls `sendTokenToServer`. It was **never invoked** — `AuthContext` had zero references to notifications, so the token was obtained on the device (init effect only `setPushToken`) but never sent to the backend.

**Fix:** `NotificationProvider` consumes `useAuth()` and an effect calls `onUserLogin(token)` / `onUserLogout()` whenever the auth token changes. Safe because `AuthProvider` wraps `NotificationProvider` (no circular import — AuthContext doesn't import NotificationContext). Effect early-returns on web.

**Why:** without this wiring, logging in never registered the device; with it, the token is (re)sent on login and removed on logout.

## To actually reach a user's phone
A JS change to this flow only takes effect after a NEW native build (EAS/TestFlight) or an OTA update — the already-installed app keeps the old bundle. Rebuilding/redeploying the Expo **web** export does nothing for push (web returns no token).

## projectId
`getExpoPushTokenAsync` is called with `process.env.EXPO_PUBLIC_PROJECT_ID` (usually unset) → passes `undefined` → expo-notifications auto-infers from `app.json` `extra.eas.projectId` (present: f245a229-...). So projectId is not the blocker; the wiring was.
