import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Platform,
  View,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";

const CHAT_WIDGET_URL =
  "https://chat.moramoda.tech/widget?website_token=WPeCyRzhWzff2TuFHRe27SaQ";

function buildInjectedScript(
  isDark: boolean,
  user: { id: string; firstName: string; lastName: string; email: string; phone?: string } | null
): string {
  const scheme = isDark ? "dark" : "light";
  const safe = (s: string) => s.replace(/[\\'"]/g, "");
  const identityBlock = user
    ? `
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
})();`
    : "";

  return `
(function() {
  function applyScheme() {
    try {
      window.postMessage(JSON.stringify({ event: "set-color-scheme", darkMode: "${scheme}" }), "*");
    } catch(e) {}
    try {
      if (window.$chatwoot && typeof window.$chatwoot.setColorScheme === 'function') {
        window.$chatwoot.setColorScheme("${scheme}");
      }
    } catch(e) {}
  }
  applyScheme();
  window.addEventListener('chatwoot:ready', function() { applyScheme(); });
  setTimeout(applyScheme, 800);
  setTimeout(applyScheme, 2500);
})();
${identityBlock}
true;
`;
}

export default function ChatScreen() {
  const { resolvedScheme } = useTheme();
  const { user } = useAuth();
  const isDark = resolvedScheme === "dark";
  const bg = isDark ? "#0D0D0F" : "#FFFFFF";
  const iframeRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);

  const sendThemeToIframe = useCallback(() => {
    if (Platform.OS !== "web") return;
    try {
      const msg = JSON.stringify({
        event: "set-color-scheme",
        darkMode: isDark ? "dark" : "light",
      });
      iframeRef.current?.contentWindow?.postMessage(msg, "https://chat.moramoda.tech");
    } catch {}
  }, [isDark]);

  useEffect(() => {
    sendThemeToIframe();
  }, [sendThemeToIframe]);

  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        {/* @ts-ignore */}
        <iframe
          ref={iframeRef}
          src={CHAT_WIDGET_URL}
          style={{ width: "100%", height: "100%", border: "none", flex: 1 }}
          title="Mora Support"
          allow="microphone; camera"
          onLoad={sendThemeToIframe}
        />
      </View>
    );
  }

  const WebView = require("react-native-webview").WebView;
  const injectedScript = buildInjectedScript(isDark, user);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <WebView
        source={{ uri: CHAT_WIDGET_URL }}
        injectedJavaScript={injectedScript}
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
