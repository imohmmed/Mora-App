import { Feather } from "@expo/vector-icons";
import { reloadAppAsync } from "expo";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PRIMARY = "#0274C1";
const RED     = "#FF3B30";

export type ErrorFallbackProps = {
  error: Error;
  resetError: () => void;
};

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const insets = useSafeAreaInsets();

  // Show the full error message + first 800 chars of stack so we can
  // identify the root cause without Xcode/Metro attached.
  const msg    = error?.message || "(no message)";
  const stack  = error?.stack   ? error.stack.slice(0, 800) : "(no stack)";
  const details = `${msg}\n\n${stack}`;

  const monoFont = Platform.select({
    ios: "Menlo", android: "monospace", default: "monospace",
  });

  const handleRestart = async () => {
    try { await reloadAppAsync(); } catch { resetError(); }
  };

  return (
    <View style={[styles.root, {
      paddingTop: insets.top + 20,
      paddingBottom: insets.bottom + 20,
    }]}>
      {/* Icon + title */}
      <View style={styles.header}>
        <Feather name="alert-triangle" size={26} color={RED} />
        <Text style={styles.title}>Something went wrong</Text>
      </View>

      <Text style={styles.hint}>
        Long-press the red box below to copy the error, then send it to the developer.
      </Text>

      {/* Error details — always visible, even in production */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator
      >
        <Text
          style={[styles.mono, { fontFamily: monoFont }]}
          selectable
        >
          {details}
        </Text>
      </ScrollView>

      {/* Actions */}
      <Pressable
        style={({ pressed }) => [styles.tryBtn, pressed && { opacity: 0.85 }]}
        onPress={handleRestart}
      >
        <Text style={styles.tryTxt}>Try Again</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.resetBtn, pressed && { opacity: 0.7 }]}
        onPress={resetError}
      >
        <Text style={styles.resetTxt}>Skip reload (reset only)</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: "#0A0A0A", paddingHorizontal: 18 },
  header:     { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  title:      { color: "#FFFFFF", fontSize: 20, fontWeight: "700" },
  hint:       { color: "#888", fontSize: 12, lineHeight: 18, marginBottom: 14 },
  scroll:     { flex: 1, backgroundColor: "#1C1C1E", borderRadius: 12, marginBottom: 16 },
  scrollInner:{ padding: 14, paddingBottom: 20 },
  mono:       { color: RED, fontSize: 11, lineHeight: 17 },
  tryBtn:     { backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 15,
                alignItems: "center", marginBottom: 10 },
  tryTxt:     { color: "#fff", fontSize: 15, fontWeight: "700" },
  resetBtn:   { alignItems: "center", paddingVertical: 8 },
  resetTxt:   { color: "#555", fontSize: 12 },
});
