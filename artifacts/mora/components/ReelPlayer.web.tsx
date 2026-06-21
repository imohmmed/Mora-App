import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

function extractShortcode(url: string): string | null {
  const m = url.match(/instagram\.com\/(?:reel|p)\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

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

  return (
    <View style={[s.wrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
      <View style={s.header}>
        <Feather name="instagram" size={13} color="#E1306C" />
        <Text style={[s.headerTxt, { color: colors.mutedForeground }]}>
          INSTAGRAM REEL
        </Text>
      </View>
      <View style={s.iframeWrap}>
        {/* @ts-ignore */}
        <iframe
          src={embedUrl}
          style={{ width: "100%", height: "100%", border: "none" }}
          scrolling="no"
          allowFullScreen
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper:    { marginHorizontal: 16, marginTop: 14, borderRadius: 20, overflow: "hidden", borderWidth: 1 },
  header:     { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 14, paddingVertical: 11 },
  headerTxt:  { fontSize: 10, fontWeight: "700", letterSpacing: 1.1, textTransform: "uppercase" },
  iframeWrap: { height: 500 },
});
