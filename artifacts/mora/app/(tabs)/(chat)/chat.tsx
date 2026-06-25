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
let WebView: any = null;
try {
  WebView = require("react-native-webview").WebView;
} catch {}

const PRIMARY = "#0274C1";
const CHAT_DOMAIN = "https://chat.moramoda.tech";
const WEBSITE_TOKEN = "WPeCyRzhWzff2TuFHRe27SaQ";
const WIDGET_BASE = `${CHAT_DOMAIN}/widget?website_token=${WEBSITE_TOKEN}`;

// Bootstraps the Chatwoot SDK. We load the SDK ourselves so we have full
// control over CSS (to hide the X close button) and JS injection.
function buildChatHtml(isDark: boolean): string {
  const scheme = isDark ? "dark" : "light";
  const bg = isDark ? "#0D0D0F" : "#FFFFFF";
  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
    <style>
      html, body { margin: 0; padding: 0; height: 100%; background: ${bg}; overflow: hidden; }

      /* ── Hide Chatwoot's X / close / back button ── */
      .woot--close-button,
      .chatwoot-widget-button--close,
      button[aria-label="Close Widget"],
      button[aria-label="close"],
      button[aria-label="Close"],
      button[aria-label="Go back"],
      .back-button,
      .close-button { display: none !important; opacity: 0 !important; pointer-events: none !important; }
    </style>
  </head>
  <body>
    <script>
      /* Extra safety: MutationObserver to hide close button whenever it appears */
      (function () {
        function hideCloseBtn() {
          var btns = document.querySelectorAll('button');
          btns.forEach(function(btn) {
            var label = (btn.getAttribute('aria-label') || '').toLowerCase();
            var cls   = btn.className || '';
            if (
              label.indexOf('close') !== -1 ||
              label.indexOf('back')  !== -1 ||
              cls.indexOf('close')   !== -1 ||
              cls.indexOf('back')    !== -1
            ) {
              btn.style.display = 'none';
            }
          });
        }
        var observer = new MutationObserver(hideCloseBtn);
        observer.observe(document.body, { childList: true, subtree: true });
        setInterval(hideCloseBtn, 1000);
      })();

      window.chatwootSettings = {
        hideMessageBubble: true,
        position: "right",
        locale: "ar",
        type: "standard",
        darkMode: "${scheme}",
        showPopoutButton: false,
      };
      (function (d, t) {
        var g = d.createElement(t), s = d.getElementsByTagName(t)[0];
        g.src = "${CHAT_DOMAIN}/packs/js/sdk.js";
        g.async = true; g.defer = true;
        g.onload = function () {
          window.chatwootSDK.run({ websiteToken: "${WEBSITE_TOKEN}", baseUrl: "${CHAT_DOMAIN}" });
        };
        s.parentNode.insertBefore(g, s);
      })(document, "script");
      window.addEventListener("chatwoot:ready", function () {
        try { window.$chatwoot.toggle("open"); } catch (e) {}
      });
    </script>
  </body>
</html>`;
}

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

// ── Fallback when WebView is not available (Expo Go) ─────────────────────────
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
      <Text style={[styles.fallbackNote, { color: muted }]}>Opens in your browser</Text>
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

  const [loading,  setLoading]  = useState(true);
  const [hasError, setHasError] = useState(false);

  // ── Web ──────────────────────────────────────────────────────────────────
  if (Platform.OS === "web") {
    // Load the widget URL directly (same-origin iframe gives CORS-safe API
    // calls to chat.moramoda.tech). Using position:absolute with bottom:"84px"
    // ensures the iframe never overlaps the FloatingTabBar area.
    const widgetUrl = `${WIDGET_BASE}&darkMode=${isDark ? "dark" : "light"}`;
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        {/* @ts-ignore */}
        <iframe
          key={isDark ? "dark" : "light"}
          src={widgetUrl}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: "84px",
            width: "100%",
            border: "none",
          }}
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
  // NativeTabs handles bottom safe area; we add top inset so content stays
  // below the status bar / Dynamic Island.
  const identityScript = buildIdentityScript(user);

  return (
    <View style={[styles.container, { backgroundColor: bg, paddingTop: insets.top }]}>
      <WebView
        key={isDark ? "dark" : "light"}
        source={{ html: buildChatHtml(isDark), baseUrl: CHAT_DOMAIN }}
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
      />

      {loading && (
        <View style={[styles.loader, { backgroundColor: bg }]}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={[styles.loaderText, { color: muted }]}>Loading chat…</Text>
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
