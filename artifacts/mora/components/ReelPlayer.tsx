import React, { useRef, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import WebView from "react-native-webview";
import { Feather } from "@expo/vector-icons";

function extractShortcode(url: string): string | null {
  const m = url.match(/instagram\.com\/(?:reel|p)\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

const INIT_JS = `
(function() {
  function tryControl() {
    var v = document.querySelector("video");
    if (v) {
      v.muted = true;
      v.loop  = true;
      try { v.play(); } catch(e) {}
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ muted: true }));
      }
    } else {
      setTimeout(tryControl, 700);
    }
  }
  document.addEventListener("DOMContentLoaded", tryControl);
  setTimeout(tryControl, 1200);
})();
true;
`;

const TOGGLE_MUTE_JS = `
(function() {
  var v = document.querySelector("video");
  if (v) {
    v.muted = !v.muted;
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ muted: v.muted }));
    }
  }
})();
true;
`;

type Colors = {
  background: string;
  border: string;
  mutedForeground: string;
  text: string;
};

export function ReelPlayer({ url, colors }: { url: string; colors: Colors }) {
  const shortcode = extractShortcode(url);
  if (!shortcode) return null;

  const embedUrl = `https://www.instagram.com/reel/${shortcode}/embed/captioned/`;
  const webRef   = useRef<WebView>(null);
  const [muted, setMuted]           = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  const handleMsg = (e: { nativeEvent: { data: string } }) => {
    try {
      const d = JSON.parse(e.nativeEvent.data) as { muted?: boolean };
      if (d.muted !== undefined) setMuted(d.muted);
    } catch {}
  };

  const toggleMute = () => webRef.current?.injectJavaScript(TOGGLE_MUTE_JS);

  return (
    <View style={[s.wrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={s.header}>
        <Feather name="instagram" size={13} color="#E1306C" />
        <Text style={[s.headerTxt, { color: colors.mutedForeground }]}>
          INSTAGRAM REEL
        </Text>
      </View>

      {/* ── Video ── */}
      <View style={s.videoWrap}>
        <WebView
          ref={webRef}
          source={{ uri: embedUrl }}
          style={s.webview}
          scrollEnabled={false}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          injectedJavaScript={INIT_JS}
          onMessage={handleMsg}
          onLoadEnd={() => webRef.current?.injectJavaScript(INIT_JS)}
        />

        {/* Overlay buttons */}
        <View style={s.overlay} pointerEvents="box-none">
          <Pressable onPress={toggleMute} style={s.btn} hitSlop={10}>
            <Feather name={muted ? "volume-x" : "volume-2"} size={15} color="#fff" />
          </Pressable>
          <Pressable onPress={() => setFullscreen(true)} style={s.btn} hitSlop={10}>
            <Feather name="maximize-2" size={15} color="#fff" />
          </Pressable>
        </View>
      </View>

      {/* ── Fullscreen modal ── */}
      <Modal
        visible={fullscreen}
        animationType="slide"
        supportedOrientations={["portrait", "landscape"]}
        onRequestClose={() => setFullscreen(false)}
      >
        <View style={s.modalRoot}>
          <WebView
            source={{ uri: embedUrl }}
            style={{ flex: 1 }}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled
            injectedJavaScript={INIT_JS.replace("v.muted = true", "v.muted = false")}
          />
          <Pressable
            onPress={() => setFullscreen(false)}
            style={s.closeBtn}
            hitSlop={12}
          >
            <Feather name="x" size={22} color="#fff" />
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper:   { marginHorizontal: 16, marginTop: 14, borderRadius: 20, overflow: "hidden", borderWidth: 1 },
  header:    { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 14, paddingVertical: 11 },
  headerTxt: { fontSize: 10, fontWeight: "700", letterSpacing: 1.1, textTransform: "uppercase" },
  videoWrap: { height: 500, position: "relative" },
  webview:   { flex: 1, backgroundColor: "#000" },
  overlay:   { position: "absolute", bottom: 14, right: 14, gap: 9 },
  btn:       { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.58)", alignItems: "center", justifyContent: "center" },
  modalRoot: { flex: 1, backgroundColor: "#000" },
  closeBtn:  { position: "absolute", top: 54, right: 18, width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(0,0,0,0.65)", alignItems: "center", justifyContent: "center" },
});
