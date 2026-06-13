import React, { useState } from "react";
import {
  Platform,
  View,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";

const WIDGET_BASE =
  "https://chat.moramoda.tech/widget?website_token=WPeCyRzhWzff2TuFHRe27SaQ";

function widgetUrl(isDark: boolean) {
  return `${WIDGET_BASE}&color_scheme=${isDark ? "dark" : "light"}`;
}

// Auto-open conversation + identify user
function buildScript(
  user: { id: string; firstName: string; lastName: string; email: string; phone?: string } | null
): string {
  const safe = (s: string) => s.replace(/[\\'"]/g, "");
  const identityPart = user
    ? `
    if (typeof window.$chatwoot?.setUser === 'function') {
      window.$chatwoot.setUser('${safe(user.id)}', {
        name: '${safe(`${user.firstName} ${user.lastName}`)}',
        email: '${safe(user.email)}',
        ${user.phone ? `phone_number: '${safe(user.phone)}',` : ""}
      });
    }`
    : "";

  return `
(function () {
  function init() {
    if (!window.$chatwoot) return;
    ${identityPart}
    if (typeof window.$chatwoot.toggle === 'function') {
      window.$chatwoot.toggle('open');
    }
  }
  window.addEventListener('chatwoot:ready', init);
  setTimeout(init, 2500);
})();
true;
`;
}

export default function ChatScreen() {
  const { resolvedScheme } = useTheme();
  const { user } = useAuth();
  const isDark = resolvedScheme === "dark";
  const bg = isDark ? "#0D0D0F" : "#F2F2F7";
  const url = widgetUrl(isDark);

  // ── Web
  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        {/* @ts-ignore */}
        <iframe
          src={url}
          style={{ width: "100%", height: "100%", border: "none", flex: 1 }}
          title="Mora Support"
          allow="microphone; camera"
        />
      </View>
    );
  }

  // ── Native (iOS / Android)
  const WebView = require("react-native-webview").WebView;
  const [loading, setLoading] = useState(true);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <WebView
        source={{ uri: url }}
        injectedJavaScript={buildScript(user)}
        onLoadEnd={() => setLoading(false)}
        style={{ flex: 1, backgroundColor: bg }}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
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
