import { Stack } from "expo-router";

export default function CheckoutLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="complete" options={{ animation: "fade_from_bottom", gestureEnabled: false }} />
    </Stack>
  );
}
