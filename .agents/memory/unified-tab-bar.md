---
name: Unified FloatingTabBar
description: The whole app uses ONE FloatingTabBar component; Hermes Event() crash; expo-router vendors bottom-tabs
---

# Unified tab bar architecture

`components/FloatingTabBar.tsx` is THE single tab bar for the entire Mora mobile app.
It renders on tab screens (via `(tabs)/_layout.tsx` using expo-router `Tabs` with
`tabBar={() => <FloatingTabBar/>}`) AND on detail pages (product/[id], collection/[slug],
wishlist, notifications each render `<FloatingTabBar/>` directly). Same component everywhere
→ icon-only, no labels, fixed/floating, content scrolls beneath it.

**Why:** User wanted the bar identical and fixed across all screens. Previously tab screens
used native `NativeTabs` (labels) while detail pages used the floating pill — visibly different.

**How to apply:** To change tab-bar look/behavior, edit ONLY FloatingTabBar.tsx — it has 3
variants (iOS 26+ glass, iOS <26 BlurView, web pill). Active fill color = `PRIMARY` (#0274C1).
It navigates via `router.push` + `usePathname` (not navigator props) and emits `TabEvents`
(TAB_HOME_SCROLL_TOP / TAB_SEARCH_FOCUS) which index.tsx & search.tsx subscribe to.
Tab screens already pad bottom ~80–100px, so the overlay (0 layout height) doesn't clip content.

## Hermes has no `Event` constructor
Double-tapping a tab crashed with `ReferenceError: Property 'Event' doesn't exist` because
old NativeTabs screenListeners called `window.dispatchEvent(new Event(...))`. In Hermes,
`window` exists but the `Event`/`CustomEvent` constructors do NOT. Never construct DOM events
in code that runs under Hermes — use the `TabEvents` emitter (lib/tabEvents.ts) for native and
guard any `new CustomEvent(...)` with a web check.

## expo-router 56 vendors bottom-tabs
`@react-navigation/bottom-tabs` is NOT installed, but `import { Tabs } from "expo-router"`
works anyway — expo-router 56 bundles its own copy at `expo-router/build/react-navigation/
bottom-tabs`. So you can use `Tabs` (custom `tabBar` prop etc.) without adding a dependency.
(`components/WebLiquidTabBar.tsx` is dead code that imports bottom-tabs directly → TS error.)
