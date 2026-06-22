/**
 * Tab layout — native tab bar (expo-router NativeTabs).
 *
 * Uses the platform-native tab bar:
 *  • iOS 26+ : native Liquid Glass UITabBar (auto light/dark adaptation)
 *  • iOS <26 : native UITabBar
 *  • Android : native Material bottom navigation
 *  • Web     : native-tabs web bottom bar
 *
 * Tabs: Home · Search · Chat · Cart · Account
 *
 * IMPORTANT: We export ErrorBoundary so expo-router uses our custom error UI.
 */
import React from "react";
import { DynamicColorIOS, Platform } from "react-native";
import { NativeTabs } from "expo-router/unstable-native-tabs";

import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";
import { ErrorFallback } from "@/components/ErrorFallback";
import { TabEvents, TAB_HOME_SCROLL_TOP, TAB_SEARCH_FOCUS } from "@/lib/tabEvents";

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

const LABELS = {
  en: { index: "Home", search: "Search", chat: "Chat", cart: "Cart", account: "Account" },
  ar: { index: "الرئيسية", search: "بحث", chat: "المحادثة", cart: "السلة", account: "حسابي" },
} as const;

const ACCENT = "#0274C1";

// ─────────────────────────────────────────────────────────────────────────────
export default function TabLayout() {
  const { totalItems } = useCart();
  const { lang } = useLanguage();
  const L = LABELS[lang] ?? LABELS.en;

  const cartBadge =
    totalItems > 0 ? (totalItems > 9 ? "9+" : String(totalItems)) : undefined;

  // Selected tint — adaptive black/white on iOS, brand accent elsewhere
  const tintColor =
    Platform.OS === "ios"
      ? DynamicColorIOS({ dark: "#FFFFFF", light: "#000000" })
      : ACCENT;

  return (
    <NativeTabs
      tintColor={tintColor}
      badgeBackgroundColor={ACCENT}
      // Restore "re-press active tab" gestures that the old custom tab bars used
      // to emit: tapping Home again scrolls to top, tapping Search again focuses
      // the search field. Fired only when the tapped tab is already focused.
      screenListeners={({ navigation, route }) => ({
        tabPress: () => {
          if (!navigation.isFocused()) return;
          if (route.name === "index") {
            TabEvents.emit(TAB_HOME_SCROLL_TOP);
            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("mora-scroll-home-top"));
            }
          } else if (route.name === "search") {
            TabEvents.emit(TAB_SEARCH_FOCUS);
            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("mora-focus-search"));
            }
          }
        },
      })}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon
          sf={{ default: "house", selected: "house.fill" }}
          md="home"
        />
        <NativeTabs.Trigger.Label>{L.index}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="search">
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
        <NativeTabs.Trigger.Label>{L.search}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="chat">
        <NativeTabs.Trigger.Icon
          sf={{ default: "message", selected: "message.fill" }}
          md="chat_bubble"
        />
        <NativeTabs.Trigger.Label>{L.chat}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="cart">
        <NativeTabs.Trigger.Icon
          sf={{ default: "bag", selected: "bag.fill" }}
          md="shopping_bag"
        />
        <NativeTabs.Trigger.Label>{L.cart}</NativeTabs.Trigger.Label>
        {cartBadge && (
          <NativeTabs.Trigger.Badge>{cartBadge}</NativeTabs.Trigger.Badge>
        )}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Icon
          sf={{ default: "person", selected: "person.fill" }}
          md="person"
        />
        <NativeTabs.Trigger.Label>{L.account}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
