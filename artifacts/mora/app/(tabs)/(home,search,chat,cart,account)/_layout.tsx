/**
 * Shared per-tab Stack layout.
 *
 * Using expo-router's array-group syntax `(home,search,chat,cart,account)`, this
 * single file is expanded in memory into a Stack for EACH tab group. That gives
 * every tab its own navigation stack while the detail screens (product,
 * collection, wishlist, notifications, order) are shared across all of them —
 * with zero file duplication and identical public URLs. The tab bar (native on
 * iOS/Android, FloatingTabBar on web) stays fixed while these screens push in.
 *
 * `unstable_settings` sets each group's initial (root) route so the array syntax
 * resolves correctly: home → index, and search/chat/cart/account → their screen.
 */
import { Stack } from "expo-router";

export const unstable_settings = {
  initialRouteName: "index",
  search: { initialRouteName: "search" },
  chat: { initialRouteName: "chat" },
  cart: { initialRouteName: "cart" },
  account: { initialRouteName: "account" },
};

export default function TabStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
