---
name: NativeTabs migration (expo-router unstable-native-tabs)
description: Gotchas when replacing a custom JS tab bar with platform-native NativeTabs in the mora Expo app
---

# Migrating to expo-router NativeTabs

`NativeTabs` from `expo-router/unstable-native-tabs` (Expo SDK 56) renders the
real platform tab bar (iOS Liquid Glass UITabBar on 26+, Material on Android,
a web bottom bar on web). Composition: `NativeTabs` > `NativeTabs.Trigger name=...`
> `.Trigger.Icon` (props `sf` {default,selected} | `md` | `src`) / `.Trigger.Label`
/ `.Trigger.Badge` (conditional render of Badge child is fine — children optional).

## Re-press the active tab (scroll-to-top / focus search)
When you delete a custom tab bar, you also delete whatever it emitted on
re-press. Restore it from the layout via `screenListeners` — NativeTabs forwards
it to the underlying navigator and emits a `tabPress` event on every native tap
(including tapping the already-focused tab):

```tsx
<NativeTabs screenListeners={({ route, navigation }: any) => ({
  tabPress: () => {
    if (!navigation?.isFocused?.()) return; // true only on re-press of active tab
    if (route.name === "(home)") TabEvents.emit(TAB_HOME_SCROLL_TOP);
  },
})}>
```

**Why:** the focused screen's `tabPress` listener fires with `isFocused()===true`
only when its own tab is re-pressed; switching tabs fires it while not yet
focused, so the guard cleanly isolates the re-press case. Keeps the whole change
in the layout file instead of editing every screen.
**Gotcha:** Expo's TYPE for the `screenListeners` function form only declares
`{ route }` (no `navigation`) — but react-navigation passes `{ route, navigation }`
at runtime. Widen the param to `any` or tsc fails. Also `route.name` is the GROUP
name (`"(home)"`, `"(search)"`) when tabs are route groups, not `"index"`.

## Persistent bar over detail screens = nest details in per-tab stacks
For the native bar (and web FloatingTabBar) to stay fixed while product/collection/
wishlist/notifications/order pages push underneath, those detail screens must live
INSIDE each tab's stack — done via expo-router array-group shared routes
`app/(tabs)/(home,search,chat,cart,account)/` (one physical dir, expanded per group
in memory; URLs stay identical). That shared `_layout.tsx` is a `<Stack>` plus
`unstable_settings` setting each group's `initialRouteName` (home→index,
search→search, ...). Tab roots stay in their own single-group dirs
(`(home)/index.tsx`, `(search)/search.tsx`, ...).
**Per-platform tab layout:** `(tabs)/_layout.tsx` = NativeTabs (native default),
`(tabs)/_layout.web.tsx` = `Tabs` + `FloatingTabBar` (keep `ErrorBoundary` export in
BOTH). Trigger/Screen `name`s are the GROUP names `"(home)"` etc.
**Remove manual `<FloatingTabBar/>` from detail pages** once nested: web's `Tabs`
tabBar and native's NativeTabs both persist the bar automatically, so a manual one
double-renders. Remove the root `Stack.Screen` entries for the moved detail routes.
**Absolute push paths break:** `router.push("/(tabs)/cart")` etc. must become plain
`/cart`, `/account`, `/chat`, `/` — groups are URL-invisible, so the `(tabs)` segment
no longer resolves after grouping.

## Watch for double bottom padding (cosmetic, not fixed here)
Screens that hardcoded bottom padding for the OLD floating/overlay tab bar
(e.g. `paddingBottom: ~100`, `account` web `90`, `chat` WebView inset `83`)
can now double up because NativeTabs applies automatic content insets
(`disableAutomaticContentInsets` defaults false). Audit per-screen bottom
padding if a large gap appears above the native bar.
