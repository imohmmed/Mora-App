---
name: Firebase Auth Setup
description: Phone OTP + Google + Apple auth screens for Mora; Firebase Web SDK lazy-initialized from env vars.
---

## What was built
- `artifacts/mora/lib/firebase.ts` — lazy Firebase Web SDK init + helpers
- `artifacts/mora/app/auth/index.tsx` — phone input (+964 fixed) + Google + Apple buttons
- `artifacts/mora/app/auth/verify.tsx` — 6-digit OTP boxes
- `artifacts/mora/context/AuthContext.tsx` — loginWithPhone / loginWithSocial
- `artifacts/api-server/src/routes/auth.ts` — POST /store/auth/firebase (find-or-create by phone/email)

## Required env vars (mobile app — EXPO_PUBLIC_*)
```
EXPO_PUBLIC_FIREBASE_API_KEY
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
EXPO_PUBLIC_FIREBASE_PROJECT_ID
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
EXPO_PUBLIC_FIREBASE_APP_ID
```

## Required Firebase Console setup
1. Authentication → Sign-in method → Enable: Phone, Google, Apple
2. Authentication → Settings → Authorized domains → add `moramoda.tech`
3. For Apple sign-in: needs Apple Service ID + Team ID configured in Firebase

## Phone format
Accept: 07766699669 or 7766699669 → normalize to +9647766699669 (E.164)
Valid pattern: /^\+9647\d{9}$/ (14 chars total)

## Security note
Currently trusts Firebase client without server-side token verification.
When FIREBASE_SERVICE_ACCOUNT_JSON is provided, add firebase-admin to API server
and verify ID token in POST /store/auth/firebase before creating session.

**Why:** Firebase Admin SDK needs service account JSON which user hasn't provided yet.
**How to apply:** Add `firebase-admin` to api-server, call `admin.auth().verifyIdToken(idToken)` in the route.
