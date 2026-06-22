/**
 * Tab layout (web).
 *
 * Web keeps its existing experience exactly as before: a standard Tabs navigator
 * with its built-in bar hidden, and our custom <FloatingTabBar /> supplied via
 * the `tabBar` prop. Because the detail screens (product, collection, wishlist,
 * notifications, order) now live inside each tab's nested Stack, this floating
 * bar stays mounted and fixed while those pages push underneath it — same as the
 * manual bar each page used to render.
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
      <Tabs.Screen name="(home)" />
      <Tabs.Screen name="(search)" />
      <Tabs.Screen name="(chat)" />
      <Tabs.Screen name="(cart)" />
      <Tabs.Screen name="(account)" />
    </Tabs>
  );
}
