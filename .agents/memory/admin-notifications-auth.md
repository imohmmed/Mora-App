---
name: Admin notifications/customers used dead x-admin-token auth
description: Why "Unauthorized" when sending push notifications from the admin, and the auth scheme all admin calls must use
---

# Admin auth: only `Authorization: Bearer <JWT>` is honored

`requireAdmin` (api-server `middlewares/auth.ts`) accepts **only** a JWT in the
`Authorization: Bearer …` header (verified with `ADMIN_JWT_SECRET`, owner-email
bypass + `admin_users` DB active check). There is **no** `x-admin-token` /
static-token path on the server anymore — the old hardcoded `"mora-admin-2025"`
scheme was removed.

**Symptom:** the admin Notifications page and the Customers "send notification"
action returned `Unauthorized` on send, while the rest of the admin worked. Those
two pages had their own local fetch helpers that sent `x-admin-token: "mora-admin-2025"`
instead of the JWT, so every `/admin/notifications/*` POST 401'd.

**Rule:** every admin→API call must send `Authorization: Bearer ${getAdminToken()}`
(from `@/lib/api`). Prefer `adminFetch` from `@/lib/api` (also auto-redirects to
/login on 401). Never reintroduce `x-admin-token` or any hardcoded admin token.

**Why:** the codebase migrated admin auth from a static bearer token (which shipped
in the public bundle) to real JWT sessions, but two pages were left on the old
header. The static token is dead weight and a security hole — don't bring it back.
