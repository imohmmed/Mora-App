import React, { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";

// react-native-webview requires a custom dev build — not available in Expo Go.
// We try to load it at module level so the fallback UI shows immediately.
let WebView: any = null;
try {
  WebView = require("react-native-webview").WebView;
} catch {}

const PRIMARY = "#0274C1";
const WIDGET_BASE =
  "https://chat.moramoda.tech/widget?website_token=WPeCyRzhWzff2TuFHRe27SaQ";

function buildIdentityScript(
  user: { id: string; firstName: string; lastName: string; email: string; phone?: string } | null
): string {
  if (!user) return "true;";
  const safe = (s: string) => s.replace(/[\\'"]/g, "");
  return `
(function () {
  function setUser() {
    if (window.$chatwoot && typeof window.$chatwoot.setUser === "function") {
      window.$chatwoot.setUser("${safe(user.id)}", {
        name: "${safe(user.firstName + " " + user.lastName)}",
        email: "${safe(user.email)}",
        ${user.phone ? `phone_number: "${safe(user.phone)}",` : ""}
      });
    }
  }
  window.addEventListener("chatwoot:ready", setUser);
  setTimeout(setUser, 3000);
})();
true;
`;
}

// ── Fallback when WebView is not available (Expo Go / web) ───────────────────
function ChatFallback({ bg, fg, muted }: { bg: string; fg: string; muted: string }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.fallback, { backgroundColor: bg, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
      <View style={[styles.fallbackIcon, { backgroundColor: `${PRIMARY}18` }]}>
        <Feather name="message-circle" size={48} color={PRIMARY} />
      </View>

      <Text style={[styles.fallbackTitle, { color: fg }]}>Mora Support</Text>
      <Text style={[styles.fallbackBody, { color: muted }]}>
        Chat with us for help with your orders, products, and anything else.
      </Text>

      <Pressable
        style={({ pressed }) => [styles.openBtn, { opacity: pressed ? 0.8 : 1 }]}
        onPress={() => Linking.openURL(WIDGET_BASE)}
      >
        <Feather name="external-link" size={17} color="#FFFFFF" />
        <Text style={styles.openBtnText}>Open Chat</Text>
      </Pressable>

      <Text style={[styles.fallbackNote, { color: muted }]}>
        Opens in your browser
      </Text>
    </View>
  );
}

export default function ChatScreen() {
  const { resolvedScheme } = useTheme();
  const { user }   = useAuth();
  const insets     = useSafeAreaInsets();
  const isDark     = resolvedScheme === "dark";
  const bg         = isDark ? "#0D0D0F" : "#FFFFFF";
  const fg         = isDark ? "#FFFFFF" : "#000000";
  const muted      = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.44)";

  const widgetUrl  = `${WIDGET_BASE}&darkMode=${isDark ? "dark" : "light"}`;

  const [loading,  setLoading]  = useState(true);
  const [hasError, setHasError] = useState(false);

  // ── Web (iframe) ─────────────────────────────────────────────────────────
  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        {/* @ts-ignore */}
        <iframe
          key={isDark ? "dark" : "light"}
          src={widgetUrl}
          style={{ width: "100%", height: "100%", border: "none" }}
          title="Mora Support"
          allow="microphone; camera"
        />
      </View>
    );
  }

  // ── Native without WebView (Expo Go) — fallback ───────────────────────────
  if (!WebView) {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <ChatFallback bg={bg} fg={fg} muted={muted} />
      </View>
    );
  }

  // ── Native with WebView error ─────────────────────────────────────────────
  if (hasError) {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <ChatFallback bg={bg} fg={fg} muted={muted} />
      </View>
    );
  }

  // ── Native (iOS / Android) with WebView ───────────────────────────────────
  const identityScript = buildIdentityScript(user);
  const tabBarHeight   = 83 + insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <WebView
        key={isDark ? "dark" : "light"}
        source={{ uri: widgetUrl }}
        injectedJavaScript={identityScript}
        onLoadEnd={() => setLoading(false)}
        onError={() => { setLoading(false); setHasError(true); }}
        onHttpError={(e: any) => {
          if (e.nativeEvent?.statusCode >= 400) { setLoading(false); setHasError(true); }
        }}
        style={{ flex: 1, backgroundColor: bg }}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        contentInset={{ bottom: tabBarHeight }}
        scrollIndicatorInsets={{ bottom: tabBarHeight }}
      />

      {loading && (
        <View style={[styles.loader, { backgroundColor: bg }]}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={[styles.loaderText, { color: muted }]}>
            Loading chat…
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* ── Fallback ── */
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 36,
  },
  fallbackIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  fallbackTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    textAlign: "center",
  },
  fallbackBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: PRIMARY,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  openBtnText: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  fallbackNote: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },

  /* ── Loader ── */
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loaderText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
});
