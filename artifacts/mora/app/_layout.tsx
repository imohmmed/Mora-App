import {
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
  Cairo_900Black,
  useFonts,
} from "@expo-google-fonts/cairo";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Alert, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LiveActivityBanner } from "@/components/LiveActivityBanner";
import { useAuth, AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { ExchangeProvider } from "@/context/ExchangeContext";
import { useLanguage, LanguageProvider } from "@/context/LanguageContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { trackSessionStart, trackPing, trackPageView } from "@/lib/tracking";

try { SplashScreen.preventAutoHideAsync(); } catch {}

// ─── صيد الأخطاء الداخلية وعرضها كـ Alert على الشاشة مباشرة ────────────────
if (Platform.OS !== "web") {
  const handler = (error: Error, isFatal?: boolean) => {
    Alert.alert(
      isFatal ? "💥 خطأ قاتل" : "⚠️ خطأ",
      `النوع: ${error.name}\n\nالسبب: ${error.message}\n\n${(error.stack ?? "").slice(0, 400)}`,
      [{ text: "حسناً" }],
    );
  };
  // @ts-ignore — ErrorUtils موجود في RN runtime
  if (global.ErrorUtils) global.ErrorUtils.setGlobalHandler(handler);
}

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

// ─── Zero letter-spacing for Arabic (prevents disconnected letters) ───────────
function ArabicLetterSpacingEffect() {
  const { lang } = useLanguage();
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const id = "mora-ar-letter-spacing";
    if (!document.getElementById(id)) {
      const style = document.createElement("style");
      style.id = id;
      style.textContent = `.lang-ar * { letter-spacing: 0 !important; }`;
      document.head.appendChild(style);
    }
    if (lang === "ar") {
      document.body.classList.add("lang-ar");
      document.documentElement.lang = "ar";
      document.documentElement.dir = "rtl";
    } else {
      document.body.classList.remove("lang-ar");
      document.documentElement.lang = "en";
      document.documentElement.dir = "ltr";
    }
  }, [lang]);
  return null;
}

// ─── Chatwoot SDK (web only) ──────────────────────────────────────────────
function useChatwoot() {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const BASE_URL = "https://chat.moramoda.tech";
    if ((window as any).chatwootSDK) return;

    const getScheme = (): "dark" | "light" => {
      try {
        const stored = localStorage.getItem("mora_theme_mode_v1");
        if (stored === "dark") return "dark";
        if (stored === "light") return "light";
      } catch {}
      return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
    };

    const updateChatwoot = (scheme: "dark" | "light") => {
      if ((window as any).$chatwoot?.setColorScheme) {
        (window as any).$chatwoot.setColorScheme(scheme);
        return;
      }
      const msg = JSON.stringify({ event: "set-color-scheme", darkMode: scheme });
      document.querySelectorAll<HTMLIFrameElement>('iframe[src*="chat.moramoda.tech"]')
        .forEach((f) => { try { f.contentWindow?.postMessage(msg, "*"); } catch {} });
    };

    if (!document.getElementById("mora-chatwoot-hide-bubble")) {
      const style = document.createElement("style");
      style.id = "mora-chatwoot-hide-bubble";
      style.textContent = `
        .woot-widget-bubble, .woot--bubble-holder,
        #chatwoot-holder .woot-widget-bubble,
        .chatwoot-widget__bubble { display: none !important; opacity: 0 !important; }
      `;
      document.head.appendChild(style);
    }

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
        colorScheme: getScheme(),
      });
      window.addEventListener("chatwoot:ready", () => {
        (window as any).$chatwoot?.toggleBubbleVisibility("hide");
        updateChatwoot(getScheme());
      }, { once: true });
    };
    document.head.appendChild(script);

    const onStorage = (e: StorageEvent) => {
      if (e.key === "mora_theme_mode_v1") updateChatwoot(getScheme());
    };
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onMqChange = () => updateChatwoot(getScheme());
    window.addEventListener("storage", onStorage);
    mq?.addEventListener?.("change", onMqChange);

    return () => {
      window.removeEventListener("storage", onStorage);
      mq?.removeEventListener?.("change", onMqChange);
    };
  }, []);
}

// ─── Chatwoot identity (web only, needs AuthContext) ─────────────────────────
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

// ─── Session + page-view tracking ─────────────────────────────────────────────
function SessionTracking() {
  const pathname = usePathname();
  const { user } = useAuth();
  const started = React.useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    trackSessionStart(user?.id);
    const interval = setInterval(() => trackPing(), 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    trackPageView();
  }, [pathname]);

  return null;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="checkout" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useChatwoot();
  useNoInputZoom();
  const [fontsLoaded, fontError] = useFonts({
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
    Cairo_900Black,
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
            <ArabicLetterSpacingEffect />
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <ChatwootIdentity />
                <SessionTracking />
                <NotificationProvider>
                  <CartProvider>
                    <ExchangeProvider>
                    <WishlistProvider>
                      <GestureHandlerRootView style={{ flex: 1 }}>
                        <RootLayoutNav />
                        <LiveActivityBanner />
                      </GestureHandlerRootView>
                    </WishlistProvider>
                    </ExchangeProvider>
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
