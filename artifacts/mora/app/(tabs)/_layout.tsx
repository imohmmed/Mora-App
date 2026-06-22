/**
 * Tab layout — ONE shared FloatingTabBar across the whole app.
 *
 * The exact same <FloatingTabBar /> is rendered here (for the tab screens) and
 * on the detail pages (product, collection, wishlist, notifications), so the bar
 * is visually identical and stays fixed everywhere while content scrolls beneath
 * it. No labels — icon only. Active icon uses the brand blue fill.
 *
 * We use a standard Tabs navigator (keeps per-tab state + tab semantics) but hide
 * its built-in bar and supply our floating bar via the `tabBar` prop.
 *
 * IMPORTANT: We export ErrorBoundary so expo-router uses our custom error UI.
 */
import React from "react";
import { Tabs } from "expo-router";

import { ErrorFallback } from "@/components/ErrorFallback";
import { FloatingTabBar } from "@/components/FloatingTabBar";

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
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={() => <FloatingTabBar />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="cart" />
      <Tabs.Screen name="account" />
    </Tabs>
  );
}
