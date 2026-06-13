import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Platform,
  View,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";

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
    if (window.$chatwoot && typeof window.$chatwoot.setUser === 'function') {
      window.$chatwoot.setUser('${safe(user.id)}', {
        name: '${safe(user.firstName + " " + user.lastName)}',
        email: '${safe(user.email)}',
        ${user.phone ? `phone_number: '${safe(user.phone)}',` : ""}
      });
    }
  }
  window.addEventListener('chatwoot:ready', setUser);
  setTimeout(setUser, 3000);
})();
true;
`;
}

export default function ChatScreen() {
  const { resolvedScheme } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const isDark = resolvedScheme === "dark";
  const bg = isDark ? "#0D0D0F" : "#FFFFFF";

  // Pass darkMode in URL so show.html.erb can apply it via Vuex directly
  const widgetUrl = `${WIDGET_BASE}&darkMode=${isDark ? "dark" : "light"}`;

  const iframeRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);

  // For web iframe: send theme whenever isDark changes or iframe loads
  const sendThemeToIframe = useCallback(() => {
    if (Platform.OS !== "web") return;
    // The URL already carries darkMode; reload the iframe if scheme changed
    // (handled by React re-render with updated src)
  }, []);

  useEffect(() => {
    sendThemeToIframe();
  }, [sendThemeToIframe]);

  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        {/* @ts-ignore */}
        <iframe
          key={isDark ? "dark" : "light"}   /* force reload when scheme changes */
          ref={iframeRef}
          src={widgetUrl}
          style={{ width: "100%", height: "100%", border: "none", flex: 1 }}
          title="Mora Support"
          allow="microphone; camera"
        />
      </View>
    );
  }

  // ── Native (iOS / Android) ────────────────────────────────────────────────
  const WebView = require("react-native-webview").WebView;
  const identityScript = buildIdentityScript(user);

  // Bottom inset so the chat input is not hidden behind the tab bar
  const tabBarHeight = 83 + insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <WebView
        key={isDark ? "dark" : "light"}   /* reload when scheme changes */
        source={{ uri: widgetUrl }}
        injectedJavaScript={identityScript}
        onLoadEnd={() => setLoading(false)}
        style={{ flex: 1, backgroundColor: bg }}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        // Push WebView content up so the chat input clears the tab bar
        contentInset={{ bottom: tabBarHeight }}
        scrollIndicatorInsets={{ bottom: tabBarHeight }}
      />
      {loading && (
        <View style={[styles.loader, { backgroundColor: bg }]}>
          <ActivityIndicator size="large" color="#0274C1" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});
