import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_bottom", title: "" }}>
      <Stack.Screen name="index" options={{ title: "Mora" }} />
      <Stack.Screen name="verify" options={{ title: "Mora", animation: "slide_from_right" }} />
    </Stack>
  );
}
