import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";

const WIDGET_BASE =
  "https://chat.moramoda.tech/widget?website_token=WPeCyRzhWzff2TuFHRe27SaQ";

// Inject BEFORE Chatwoot Vue app mounts:
// 1. Forces Tailwind dark class on <html> (Chatwoot uses dark: variants)
// 2. Auto-clicks "Start Conversation" after load
function buildPreScript(isDark: boolean) {
  return `
(function () {
  // 1. Force dark/light Tailwind class on <html>
  if (${isDark}) {
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
  } else {
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light';
  }
})();
true;
`;
}

// After page loads: auto-click "Start Conversation" / "New conversation"
const POST_LOAD_SCRIPT = `
(function () {
  function tryOpen() {
    var all = Array.from(document.querySelectorAll('a, button, [role="button"]'));
    var btn = all.find(function (el) {
      var t = (el.textContent || '').trim().toLowerCase();
      return t.includes('start conversation') || t.includes('new conversation') || t.includes('محادثة جديدة') || t.includes('ابدأ محادثة');
    });
    if (btn) { btn.click(); return true; }
    return false;
  }
  var tries = 0;
  var iv = setInterval(function () {
    if (tryOpen() || ++tries > 20) clearInterval(iv);
  }, 250);
})();
true;
`;

// ── Web: use already-loaded Chatwoot SDK (opened in _layout.tsx)
function WebChat({ isDark }: { isDark: boolean }) {
  const bg  = isDark ? "#0D0D0F" : "#F2F2F7";
  const sub = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)";

  useEffect(() => {
    const open = () => {
      const cw = (window as any).$chatwoot;
      if (cw?.toggle) cw.toggle("open");
    };
    if ((window as any).$chatwoot) open();
    else window.addEventListener("chatwoot:ready", open);
    return () => {
      window.removeEventListener("chatwoot:ready", open);
      (window as any).$chatwoot?.toggle("close");
    };
  }, []);

  return (
    <View style={[wc.container, { backgroundColor: bg }]}>
      <View style={wc.icon}>
        <Feather name="message-circle" size={40} color={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"} />
      </View>
      <Text style={[wc.hint, { color: sub }]}>فتح الدعم...</Text>
    </View>
  );
}

const wc = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  icon:      { opacity: 0.6 },
  hint:      { fontSize: 13 },
});

// ── Native: full WebView
function NativeChat({ isDark, user }: {
  isDark: boolean;
  user: { id: string; firstName: string; lastName: string; email: string; phone?: string } | null;
}) {
  const WebView = require("react-native-webview").WebView;
  const [loading, setLoading] = useState(true);
  const bg = isDark ? "#0D0D0F" : "#F2F2F7";

  const safe = (s: string) => s.replace(/[\\'"]/g, "");
  const identityPart = user
    ? `
  if (window.$chatwoot && typeof window.$chatwoot.setUser === 'function') {
    window.$chatwoot.setUser('${safe(user.id)}', {
      name: '${safe(user.firstName + " " + user.lastName)}',
      email: '${safe(user.email)}',
      ${user.phone ? `phone_number: '${safe(user.phone)}',` : ""}
    });
  }`
    : "";

  const postLoadScript = `
(function () {
  ${identityPart}
  function tryOpen() {
    var all = Array.from(document.querySelectorAll('a, button, [role="button"]'));
    var btn = all.find(function (el) {
      var t = (el.textContent || '').trim().toLowerCase();
      return t.includes('start conversation') || t.includes('new conversation') || t.includes('محادثة جديدة') || t.includes('ابدأ محادثة');
    });
    if (btn) { btn.click(); return true; }
    return false;
  }
  var tries = 0;
  var iv = setInterval(function () {
    if (tryOpen() || ++tries > 20) clearInterval(iv);
  }, 250);
})();
true;
`;

  return (
    <View style={[{ flex: 1, backgroundColor: bg }]}>
      <WebView
        source={{ uri: WIDGET_BASE }}
        injectedJavaScriptBeforeContentLoaded={buildPreScript(isDark)}
        injectedJavaScript={postLoadScript}
        onLoadEnd={() => setLoading(false)}
        style={{ flex: 1, backgroundColor: bg }}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
      />
      {loading && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: bg, alignItems: "center", justifyContent: "center" }]}>
          <ActivityIndicator size="large" color="#0274C1" />
        </View>
      )}
    </View>
  );
}

export default function ChatScreen() {
  const { resolvedScheme } = useTheme();
  const { user } = useAuth();
  const isDark = resolvedScheme === "dark";

  if (Platform.OS === "web") return <WebChat isDark={isDark} />;
  return <NativeChat isDark={isDark} user={user} />;
}
