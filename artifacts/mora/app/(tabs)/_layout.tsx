/**
 * Tab layout (native: iOS + Android).
 *
 * Renders Expo's real NativeTabs so iOS shows the genuine system Liquid Glass
 * tab bar (and Android the native Material bar). Icons only — no labels — with
 * the brand-blue selected tint and a live cart badge. The native bar stays fixed
 * on top while each tab's nested Stack pushes detail screens underneath it.
 *
 * Web uses `_layout.web.tsx` instead (keeps the existing FloatingTabBar).
 *
 * IMPORTANT: We export ErrorBoundary so expo-router uses our custom error UI.
 */
import React from "react";
import { NativeTabs } from "expo-router/unstable-native-tabs";

import { ErrorFallback } from "@/components/ErrorFallback";
import { useCart } from "@/context/CartContext";
import {
  TabEvents,
  TAB_HOME_SCROLL_TOP,
  TAB_SEARCH_FOCUS,
} from "@/lib/tabEvents";

const PRIMARY = "#0274C1";

// ── Segment-level ErrorBoundary for expo-router ───────────────────────────────
export function ErrorBoundary({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  return <ErrorFallback error={error} resetError={retry} />;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function TabLayout() {
  const { totalItems } = useCart();
  const cartBadge =
    totalItems > 0 ? (totalItems > 9 ? "9+" : String(totalItems)) : undefined;

  return (
    <NativeTabs
      tintColor={PRIMARY}
      // NOTE: react-navigation passes `{ route, navigation }` to the function
      // form at runtime; Expo's type only declares `route`, so we widen to any.
      screenListeners={({ route, navigation }: any) => ({
        // Re-pressing the already-active tab: home → scroll to top,
        // search → focus the search field. Guard with isFocused() so this
        // only fires on a re-press, not when switching to the tab.
        tabPress: () => {
          if (!navigation?.isFocused?.()) return;
          if (route.name === "(home)") TabEvents.emit(TAB_HOME_SCROLL_TOP);
          else if (route.name === "(search)")
            TabEvents.emit(TAB_SEARCH_FOCUS);
        },
      })}
    >
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Label hidden />
        <NativeTabs.Trigger.Icon
          sf={{ default: "house", selected: "house.fill" }}
          md="home"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(search)">
        <NativeTabs.Trigger.Label hidden />
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(chat)">
        <NativeTabs.Trigger.Label hidden />
        <NativeTabs.Trigger.Icon
          sf={{ default: "message", selected: "message.fill" }}
          md="chat"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(cart)">
        <NativeTabs.Trigger.Label hidden />
        <NativeTabs.Trigger.Icon
          sf={{ default: "bag", selected: "bag.fill" }}
          md="shopping_bag"
        />
        {cartBadge ? (
          <NativeTabs.Trigger.Badge>{cartBadge}</NativeTabs.Trigger.Badge>
        ) : null}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(account)">
        <NativeTabs.Trigger.Label hidden />
        <NativeTabs.Trigger.Icon
          sf={{ default: "person", selected: "person.fill" }}
          md="person"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
