// Non-iOS fallback — re-exports nothing (expo-router uses its default tab bar).
// The _layout.tsx renders WebLiquidTabBar on web, default Tabs on Android.
export function NativeGlassTabBar() { return null; }
