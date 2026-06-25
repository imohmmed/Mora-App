---
name: Checkout keyboard avoidance
description: How forms with a sticky footer keep focused inputs above the keyboard without the crashing keyboard-controller lib
---
Forms with mid/bottom inputs AND an absolute sticky footer (e.g. checkout PLACE ORDER
bar) keep the focused field above the keyboard with a plain ScrollView, NOT a
screen-wrapping KeyboardAvoidingView:
- ScrollView props: `keyboardShouldPersistTaps="handled"`,
  `keyboardDismissMode="interactive"`, `automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}`.
- Keep a `contentContainerStyle.paddingBottom` reserve so content clears the footer.
- The absolute footer stays at `bottom:0`; it is simply overlaid by the keyboard while
  typing and reappears on dismiss — this matches the search page UX.

**Why:** Wrapping the WHOLE screen (header + ScrollView + absolute footer) in
`KeyboardAvoidingView behavior="padding"` did NOT scroll the focused input into view,
so deep fields stayed hidden behind the keyboard. `automaticallyAdjustKeyboardInsets`
is a core RN iOS ScrollView prop that adds keyboard-height bottom inset and scrolls the
caret into view. Android relies on default window resize (Expo default), no KAV needed.
Do NOT reach for react-native-keyboard-controller — it crashes iOS production
(see keyboard-controller-crash.md).
**How to apply:** any Expo form screen where inputs get covered by the keyboard;
the search page is the reference pattern (plain ScrollView + keyboardShouldPersistTaps).
