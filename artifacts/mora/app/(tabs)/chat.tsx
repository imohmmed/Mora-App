import React from "react";
import {
  Platform,
  View,
  Text,
  Pressable,
  Linking,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";

const CHAT_URL = "https://chat.moramoda.tech";

export default function ChatScreen() {
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === "dark";
  const bg = isDark ? "#0D0D0F" : "#FFFFFF";
  const text = isDark ? "#FFFFFF" : "#000000";
  const sub = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";

  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        {/* @ts-ignore — iframe is valid on web */}
        <iframe
          src={CHAT_URL}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            flex: 1,
          }}
          title="Mora Support"
          allow="microphone; camera"
        />
      </View>
    );
  }

  return (
    <View style={[styles.center, { backgroundColor: bg }]}>
      <Text style={[styles.emoji]}>💬</Text>
      <Text style={[styles.title, { color: text }]}>تواصل مع الدعم</Text>
      <Text style={[styles.sub, { color: sub }]}>
        يسعدنا مساعدتك — فريق المبيعات والدعم جاهز
      </Text>
      <Pressable
        style={({ pressed }) => [
          styles.btn,
          { opacity: pressed ? 0.75 : 1 },
        ]}
        onPress={() => Linking.openURL(CHAT_URL)}
      >
        <Text style={styles.btnText}>ابدأ المحادثة</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  sub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  btn: {
    marginTop: 16,
    backgroundColor: "#0274C1",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  btnText: {
    color: "#FFF",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
