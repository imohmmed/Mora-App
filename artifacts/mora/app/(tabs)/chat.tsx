import React, { useState } from "react";
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

function buildIdentityScript(user: { id: string; firstName: string; lastName: string; email: string; phone?: string } | null): string {
  if (!user) return "true;";
  const safe = (s: string) => s.replace(/[\\'"]/g, "");
  const id = safe(user.id);
  const name = safe(`${user.firstName} ${user.lastName}`);
  const email = safe(user.email);
  const phone = safe(user.phone ?? "");
  return `
(function () {
  function setUser() {
    if (window.$chatwoot && typeof window.$chatwoot.setUser === 'function') {
      window.$chatwoot.setUser('${id}', {
        name: '${name}',
        email: '${email}',
        ${phone ? `phone_number: '${phone}',` : ""}
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
  const isDark = resolvedScheme === "dark";
  const bg = isDark ? "#0D0D0F" : "#FFFFFF";

  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        {/* @ts-ignore */}
        <iframe
          src={CHAT_WIDGET_URL}
          style={{ width: "100%", height: "100%", border: "none", flex: 1 }}
          title="Mora Support"
          allow="microphone; camera"
        />
      </View>
    );
  }

  const WebView = require("react-native-webview").WebView;
  const [loading, setLoading] = useState(true);
  const identityScript = buildIdentityScript(user);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <WebView
        source={{ uri: CHAT_WIDGET_URL }}
        injectedJavaScript={identityScript}
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
