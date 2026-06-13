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
import { useAuth } from "@/context/AuthContext";
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

// ─── Prevent iOS Safari zoom on input focus (font-size < 16px triggers zoom) ──
function useNoInputZoom() {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const id = "mora-no-input-zoom";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      input, textarea, select {
        font-size: 16px !important;
      }
    `;
    document.head.appendChild(style);
  }, []);
}

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

    // Detect dark mode: check stored pref first, fall back to system
    const stored = localStorage.getItem("mora_theme_mode_v1");
    let prefersDark: boolean;
    if (stored === "dark") prefersDark = true;
    else if (stored === "light") prefersDark = false;
    else prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;

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
        colorScheme: prefersDark ? "dark" : "light",
      });
      // Belt-and-suspenders: also call the API to hide the bubble
      window.addEventListener("chatwoot:ready", () => {
        (window as any).$chatwoot?.toggleBubbleVisibility("hide");
      });
    };
    document.head.appendChild(script);

    // Re-sync color scheme if system theme changes while app is open
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onSchemeChange = () => {
      const nowDark = mq?.matches ?? false;
      // Chatwoot doesn't expose setColorScheme publicly, so we rely on the
      // initial detection above. For a full update, the user can reload.
    };
    mq?.addEventListener?.("change", onSchemeChange);
    return () => mq?.removeEventListener?.("change", onSchemeChange);
  }, []);
}

// ─── Chatwoot dark mode (web only) — CSS filter on the cross-origin iframe ───
// Server-side Chatwoot settings override any colorScheme we pass via SDK/URL.
// The only client-side escape hatch: apply a CSS filter to the iframe *element*
// in our own DOM (not inside it — that would need same-origin).
function ChatwootDarkMode() {
  const { resolvedScheme } = useTheme();
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const id = "mora-chatwoot-dark-filter";
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }
    if (resolvedScheme === "dark") {
      // invert colours + rotate hue back so blues/greens stay roughly correct
      el.textContent = `
        iframe[src*="chat.moramoda.tech"] {
          filter: invert(0.92) hue-rotate(180deg) contrast(0.9) !important;
        }`;
    } else {
      el.textContent = "";
    }
  }, [resolvedScheme]);
  return null;
}

// ─── Chatwoot identity (web only, needs AuthContext) ─────────────────────────
// Sets the logged-in user's email on the Chatwoot contact so the backend can
// match the contact to a push token and send notifications.
function ChatwootIdentity() {
  const { user } = useAuth();
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const trySet = () => {
      const cw = (window as any).$chatwoot;
      if (!cw?.setUser) return;
      if (user) {
        cw.setUser(user.id, {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          ...(user.phone ? { phone_number: user.phone } : {}),
        });
      } else {
        cw.reset?.();
      }
    };
    trySet();
    window.addEventListener("chatwoot:ready", trySet);
    return () => window.removeEventListener("chatwoot:ready", trySet);
  }, [user]);
  return null;
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
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="product/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="collection/[slug]" options={{ headerShown: false }} />
      <Stack.Screen name="checkout" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useChatwoot();
  useNoInputZoom();
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
          <ChatwootDarkMode />
          <LanguageProvider>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <ChatwootIdentity />
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
