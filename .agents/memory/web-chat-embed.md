---
name: Web Chat (Chatwoot) embedded tab
description: How the Mora Expo-web Chat tab embeds Chatwoot as an in-page iframe, the dark-mode workaround, and the nested-height race fix
---

# Web Chat tab — embedded Chatwoot (Expo web)

The web Chat tab must be EMBEDDED in the chat section (never a body-level popup),
must disappear on other tabs, and must follow the app dark/light theme.

## Architecture
- `chat.tsx` `WebChatScreen` renders a same-origin `<iframe src="/chat-widget.html">`,
  absolutely positioned `top:0` → `bottom: 84 + safe-area` (leaves the FloatingTabBar
  strip clickable; the bar is body-portaled at max z-index).
- `public/chat-widget.html` runs the Chatwoot SDK and forces `.woot-widget-holder`
  to fill 100% (no popup box/radius/shadow), hides close/back buttons.
- Expo copies `public/` → `dist/` on `expo export`, so `/chat-widget.html` is served.

## Why a body-level SDK injection was rejected
Injecting the Chatwoot SDK into the main window makes a `position:fixed` overlay that
persists across tabs (tab screens stay mounted, so unmount cleanup never fires) and
can't be scoped to the section. The iframe-in-React-tree approach scopes it correctly.

## Disappear-on-other-tabs (the reliable fix)
Gate rendering on `useIsFocused()` (`@react-navigation/native`): render the iframe
ONLY while the tab is focused. Do NOT rely on navigator hide policy or unmount
cleanup. Conversation state persists server-side, so remounting on each visit is fine.

## Dark mode — CRITICAL
Chatwoot's OWN dark mode (`darkMode:"dark"` / `setColorScheme("dark")`) renders the
widget text far too faint/low-contrast on this instance — verified by screenshotting
`/chat-widget.html?dark=1`. And the widget is cross-origin (`chat.moramoda.tech`), so
you CANNOT inject CSS to recolor it.
**Solution:** keep Chatwoot always LIGHT, and apply `filter: invert(0.92) hue-rotate(180deg)`
on the iframe ELEMENT from `chat.tsx` when the app is dark. The filter is on the
parent-side iframe box, so cross-origin doesn't block it. Tradeoff: avatars/images
get inverted, acceptable for a text support chat.

## Nested-iframe height race (header-only render)
When `chat-widget.html` is itself inside the app's iframe, height isn't stable at SDK
boot → Chatwoot renders a collapsed (header-only) widget over the page bg (looks like
a split white/black screen). Standalone it renders fine. Fix: after `chatwoot:ready`,
re-dispatch `window.resize` via a `ResizeObserver` on `documentElement` + `visualViewport`
resize listener, plus a few timed nudges for first paint.

## Native chat is separate
Native uses `buildChatHtml` in a react-native-webview WebView — works fine, do not touch.
