import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { LiveActivityBanner } from "@/components/LiveActivityBanner";

SplashScreen.preventAutoHideAsync();

// ─── Chatwoot SDK (web only) ──────────────────────────────────────────────
function useChatwoot() {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const BASE_URL = "https://chat.moramoda.tech";
    if ((window as any).chatwootSDK) return;

    // CSS to permanently hide the floating launcher bubble
    const style = document.createElement("style");
    style.id = "mora-chatwoot-hide-bubble";
    style.textContent = `
      .woot-widget-bubble,
      .woot--bubble-holder,
      #chatwoot-holder .woot-widget-bubble,
      .chatwoot-widget__bubble { display: none !important; opacity: 0 !important; }
    `;
    document.head.appendChild(style);

    const script = document.createElement("script");
    script.src = BASE_URL + "/packs/js/sdk.js";
    script.async = true;
    script.onload = () => {
      (window as any).chatwootSDK?.run({
        websiteToken: "WPeCyRzhWzff2TuFHRe27SaQ",
        baseUrl: BASE_URL,
        hideMessageBubble: true,
        position: "right",
        locale: "ar",
        type: "standard",
      });
      // Belt-and-suspenders: also call the API to hide the bubble
      window.addEventListener("chatwoot:ready", () => {
        (window as any).$chatwoot?.toggleBubbleVisibility("hide");
      });
    };
    document.head.appendChild(script);
  }, []);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
    },
  },
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="product/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="collection/[slug]" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useChatwoot();
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <ThemeProvider>
          <LanguageProvider>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <NotificationProvider>
                  <CartProvider>
                    <WishlistProvider>
                      <GestureHandlerRootView style={{ flex: 1 }}>
                        <KeyboardProvider>
                          <RootLayoutNav />
                          <LiveActivityBanner />
                        </KeyboardProvider>
                      </GestureHandlerRootView>
                    </WishlistProvider>
                  </CartProvider>
                </NotificationProvider>
              </AuthProvider>
            </QueryClientProvider>
          </LanguageProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
