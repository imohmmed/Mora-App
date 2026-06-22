---
name: Expo Router route collision loop
description: Why a leftover redirect file in (tabs) caused "Maximum update depth exceeded" on the wishlist screen
---

## Rule
Never let two route files resolve to the SAME path. Route groups like `(tabs)` do NOT add a
segment to the URL, so `app/wishlist.tsx` and `app/(tabs)/wishlist.tsx` BOTH resolve to `/wishlist`.

**Why:** When the colliding `(tabs)` file renders `<Redirect href="/wishlist" />`, the router can
re-match the `(tabs)` copy, which redirects again → infinite navigation → React throws
"Maximum update depth exceeded" the moment you open the screen.

**How to apply:**
- If a screen was promoted from a tab to a top-level Stack screen, DELETE the old
  `app/(tabs)/<name>.tsx` entirely — do not leave a `<Redirect>` stub behind.
- Point every navigation call at the canonical top-level path (`router.push("/wishlist")`),
  never at the group-qualified path (`router.push("/(tabs)/wishlist")`).
- After moving any screen, grep for the old group path AND check for duplicate basenames between
  `app/*.tsx` and `app/(tabs)/*.tsx`.
