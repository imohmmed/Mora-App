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
<NativeTabs screenListeners={({ navigation, route }) => ({
  tabPress: () => {
    if (!navigation.isFocused()) return; // true only on re-press of active tab
    if (route.name === "index") TabEvents.emit(TAB_HOME_SCROLL_TOP);
  },
})}>
```

**Why:** the focused screen's `tabPress` listener fires with `isFocused()===true`
only when its own tab is re-pressed; switching tabs fires it while not yet
focused, so the guard cleanly isolates the re-press case. Keeps the whole change
in the layout file instead of editing every screen.

## Watch for double bottom padding (cosmetic, not fixed here)
Screens that hardcoded bottom padding for the OLD floating/overlay tab bar
(e.g. `paddingBottom: ~100`, `account` web `90`, `chat` WebView inset `83`)
can now double up because NativeTabs applies automatic content insets
(`disableAutomaticContentInsets` defaults false). Audit per-screen bottom
padding if a large gap appears above the native bar.
