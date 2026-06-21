---
name: Admin JWT secret rotation strands logged-in admins
description: Why rotating/dropping ADMIN_JWT_SECRET makes the admin panel show empty data, and the 401 self-recovery that fixes it.
---

Rotating `ADMIN_JWT_SECRET` (or it being dropped from the prod pm2 env on restart) invalidates the *signature* of every existing admin session token. But the admin SPA's auth gate only checks the JWT `exp` claim, not the signature — so an admin holding a not-yet-expired token stays "logged in" (dashboard renders) while every API call 401s → blank screens / "No products found".

**Why:** the auth gate derives `user` from `localStorage.mora_admin_user` and validates only `exp`; it cannot detect a signature mismatch. The codegen client throws on 401 but does not redirect.

**How to apply:** the admin App.tsx QueryClient now has a `QueryCache`/`MutationCache` `onError` that, on a 401 while a token is present, clears the token and reloads (dropping the user to the login screen). So after any secret rotation expect admins to be auto-bounced to re-login — that is intended, not a bug. Never put this redirect in the shared `lib/api-client-react` custom-fetch (mobile app + store treat 401s as normal).
