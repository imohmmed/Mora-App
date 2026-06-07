import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { MoraLogo } from "@/components/MoraLogo";
import { AccountExpoUI } from "@/components/AccountExpoUI";
import { useWishlist } from "@/context/WishlistContext";
import { fetchOrders } from "@/lib/api";
import type { Order } from "@/lib/types";

const EMAIL_KEY = "mora_account_email_v1";

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

type MenuItem = { id: string; icon: FeatherIconName; label: string; badge?: string; arrow?: boolean };
type ToggleItem = { id: string; icon: FeatherIconName; label: string; toggle: true };
type SectionItem = MenuItem | ToggleItem;
type Section = { title: string; items: SectionItem[] };

function isToggleItem(item: SectionItem): item is ToggleItem {
  return (item as ToggleItem).toggle === true;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch { return iso; }
}

function statusColor(status: string): string {
  const s = status.toLowerCase();
  if (s === "delivered" || s === "fulfilled") return "#43A047";
  if (s === "shipped" || s === "in_transit") return "#0274C1";
  if (s === "cancelled" || s === "refunded") return "#E53935";
  return "#888888";
}

export default function AccountScreen() {
  return <AccountClassic />;
}

function OrdersSection({ email, onBack }: { email: string; onBack: () => void }) {
  const colors = useColors();
  const { data: orders, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["orders", email],
    queryFn: () => fetchOrders(email),
    enabled: email.trim().length > 0,
  });

  return (
    <View style={styles.ordersContainer}>
      <View style={styles.ordersHeader}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.ordersTitle, { color: colors.foreground }]}>My Orders</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        {isLoading ? (
          <View style={styles.centeredBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.centeredText, { color: colors.mutedForeground }]}>Loading orders...</Text>
          </View>
        ) : isError ? (
          <View style={styles.centeredBox}>
            <Feather name="wifi-off" size={36} color={colors.border} />
            <Text style={[styles.centeredText, { color: colors.mutedForeground }]}>
              Could not load orders
            </Text>
            <Pressable onPress={() => refetch()} style={[styles.retryBtn, { borderColor: colors.border }]}>
              <Text style={[styles.retryText, { color: colors.foreground }]}>Retry</Text>
            </Pressable>
          </View>
        ) : !orders || orders.length === 0 ? (
          <View style={styles.centeredBox}>
            <Feather name="package" size={40} color={colors.border} />
            <Text style={[styles.centeredText, { color: colors.mutedForeground }]}>
              No orders found for this email
            </Text>
          </View>
        ) : (
          <View style={styles.ordersList}>
            {orders.map((order) => (
              <View
                key={order.id}
                style={[styles.orderCard, { borderColor: colors.border, backgroundColor: colors.background }]}
              >
                <View style={styles.orderCardTop}>
                  <View>
                    <Text style={[styles.orderNumber, { color: colors.foreground }]}>
                      Order #{order.orderNumber ?? order.id.slice(0, 8).toUpperCase()}
                    </Text>
                    <Text style={[styles.orderDate, { color: colors.mutedForeground }]}>
                      {formatDate(order.createdAt)}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor(order.status) + "20" }]}>
                    <Text style={[styles.statusText, { color: statusColor(order.status) }]}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Text>
                  </View>
                </View>
                <View style={[styles.orderCardBottom, { borderTopColor: colors.border }]}>
                  <Text style={[styles.orderItemCount, { color: colors.mutedForeground }]}>
                    {order.lineItems?.length ?? 0} item{(order.lineItems?.length ?? 0) !== 1 ? "s" : ""}
                  </Text>
                  <Text style={[styles.orderTotal, { color: colors.foreground }]}>
                    ${order.total.toFixed(2)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function AccountClassic() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [toggles, setToggles] = useState<Record<string, boolean>>({ notifications: true, emails: false });
  const [showOrders, setShowOrders] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [savedEmail, setSavedEmail] = useState("");
  const [emailLoaded, setEmailLoaded] = useState(false);
  const { count: wishlistCount } = useWishlist();

  const topPadding = isWeb ? 0 : insets.top;
  const bottomPadding = isWeb ? 0 : insets.bottom;

  useEffect(() => {
    AsyncStorage.getItem(EMAIL_KEY).then((val) => {
      if (val) {
        setSavedEmail(val);
        setEmailInput(val);
      }
      setEmailLoaded(true);
    });
  }, []);

  const handleSaveEmail = () => {
    const trimmed = emailInput.trim();
    if (!trimmed) return;
    setSavedEmail(trimmed);
    AsyncStorage.setItem(EMAIL_KEY, trimmed).catch(() => {});
  };

  const handleClearEmail = () => {
    setSavedEmail("");
    setEmailInput("");
    AsyncStorage.removeItem(EMAIL_KEY).catch(() => {});
  };

  const SECTIONS: Section[] = [
    {
      title: "MY ACCOUNT",
      items: [
        { id: "orders", icon: "package", label: "My Orders", arrow: true },
        { id: "wishlist", icon: "heart", label: "Wishlist", badge: wishlistCount > 0 ? String(wishlistCount) : undefined, arrow: true },
        { id: "returns", icon: "refresh-cw", label: "Returns", arrow: true },
        { id: "address", icon: "map-pin", label: "Addresses", arrow: true },
        { id: "payment", icon: "credit-card", label: "Payment Methods", arrow: true },
      ],
    },
    {
      title: "PREFERENCES",
      items: [
        { id: "notifications", icon: "bell", label: "Push Notifications", toggle: true },
        { id: "emails", icon: "mail", label: "Email Updates", toggle: true },
        { id: "country", icon: "globe", label: "Country / Region", arrow: true },
        { id: "currency", icon: "dollar-sign", label: "Currency", arrow: true },
      ],
    },
    {
      title: "SUPPORT",
      items: [
        { id: "help", icon: "help-circle", label: "Help & FAQs", arrow: true },
        { id: "contact", icon: "message-circle", label: "Contact Us", arrow: true },
        { id: "about", icon: "info", label: "About Mora", arrow: true },
        { id: "privacy", icon: "shield", label: "Privacy Policy", arrow: true },
      ],
    },
  ];

  if (showOrders) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 8, borderBottomColor: colors.border }]}>
          <MoraLogo size="small" />
        </View>

        {!savedEmail ? (
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            <Pressable onPress={() => setShowOrders(false)} style={styles.inlineBack}>
              <Feather name="arrow-left" size={16} color={colors.foreground} />
              <Text style={[styles.inlineBackText, { color: colors.foreground }]}>Back</Text>
            </Pressable>
            <View style={styles.emailPrompt}>
              <Feather name="mail" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emailPromptTitle, { color: colors.foreground }]}>Find your orders</Text>
              <Text style={[styles.emailPromptSub, { color: colors.mutedForeground }]}>
                Enter the email you used when placing your order
              </Text>
              <TextInput
                style={[styles.emailInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.secondary }]}
                placeholder="your@email.com"
                placeholderTextColor={colors.mutedForeground}
                value={emailInput}
                onChangeText={setEmailInput}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                style={({ pressed }) => [styles.emailSubmit, { backgroundColor: colors.foreground, opacity: pressed ? 0.85 : 1 }]}
                onPress={handleSaveEmail}
              >
                <Text style={styles.emailSubmitText}>FIND MY ORDERS</Text>
              </Pressable>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.flex1}>
            <View style={styles.emailRow}>
              <Text style={[styles.emailShown, { color: colors.mutedForeground }]}>{savedEmail}</Text>
              <Pressable onPress={handleClearEmail}>
                <Text style={[styles.changeEmail, { color: colors.primary }]}>Change</Text>
              </Pressable>
            </View>
            <OrdersSection email={savedEmail} onBack={() => setShowOrders(false)} />
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8, borderBottomColor: colors.border }]}>
        <MoraLogo size="small" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding + 80 }}
      >
        <View
          style={[styles.profileCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{savedEmail ? savedEmail[0].toUpperCase() : "M"}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.foreground }]}>Mora Member</Text>
            <Text style={[styles.profileEmail, { color: colors.mutedForeground }]}>
              {savedEmail || "Tap My Orders to set email"}
            </Text>
            <View style={[styles.memberBadge, { backgroundColor: colors.accent }]}>
              <Text style={[styles.memberBadgeText, { color: colors.primary }]}>MORA MEMBER</Text>
            </View>
          </View>
        </View>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{section.title}</Text>
            <View style={[styles.sectionCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
              {section.items.map((item, idx) => (
                <View key={item.id}>
                  {isToggleItem(item) ? (
                    <View style={[styles.menuItem, { borderBottomColor: colors.border }, idx === section.items.length - 1 && styles.lastItem]}>
                      <View style={styles.menuItemLeft}>
                        <View style={[styles.iconBox, { backgroundColor: colors.secondary }]}>
                          <Feather name={item.icon} size={16} color={colors.primary} />
                        </View>
                        <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
                      </View>
                      <Switch
                        value={!!toggles[item.id]}
                        onValueChange={() => setToggles((p) => ({ ...p, [item.id]: !p[item.id] }))}
                        trackColor={{ false: colors.border, true: colors.primary }}
                        thumbColor="#FFFFFF"
                        testID={`toggle-${item.id}`}
                      />
                    </View>
                  ) : (
                    <Pressable
                      style={({ pressed }) => [
                        styles.menuItem,
                        { borderBottomColor: colors.border },
                        idx === section.items.length - 1 && styles.lastItem,
                        pressed && { backgroundColor: colors.secondary },
                      ]}
                      onPress={() => { if (item.id === "orders") setShowOrders(true); }}
                      testID={`menu-${item.id}`}
                    >
                      <View style={styles.menuItemLeft}>
                        <View style={[styles.iconBox, { backgroundColor: colors.secondary }]}>
                          <Feather name={item.icon} size={16} color={colors.primary} />
                        </View>
                        <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
                      </View>
                      <View style={styles.menuItemRight}>
                        {(item as MenuItem).badge && (
                          <View style={[styles.badgePill, { backgroundColor: colors.primary }]}>
                            <Text style={styles.badgePillText}>{(item as MenuItem).badge}</Text>
                          </View>
                        )}
                        {(item as MenuItem).arrow && (
                          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                        )}
                      </View>
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        <Pressable
          style={({ pressed }) => [
            styles.signOutBtn,
            { borderColor: colors.border, marginHorizontal: 16, opacity: pressed ? 0.7 : 1 },
          ]}
          testID="sign-out-btn"
        >
          <Feather name="log-out" size={16} color={colors.destructive} />
          <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign Out</Text>
        </Pressable>
        <Text style={[styles.version, { color: colors.mutedForeground }]}>Mora v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex1: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  profileCard: { margin: 16, padding: 16, borderRadius: 8, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 20 },
  profileInfo: { flex: 1, gap: 4 },
  profileName: { fontFamily: "Inter_700Bold", fontSize: 17 },
  profileEmail: { fontFamily: "Inter_400Regular", fontSize: 13 },
  memberBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 2, marginTop: 4 },
  memberBadgeText: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.5 },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1, marginBottom: 8 },
  sectionCard: { borderWidth: 1, borderRadius: 8, overflow: "hidden" },
  menuItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1 },
  lastItem: { borderBottomWidth: 0 },
  menuItemLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: { width: 32, height: 32, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  menuLabel: { fontFamily: "Inter_500Medium", fontSize: 15 },
  menuItemRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  badgePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgePillText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 11 },
  signOutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderWidth: 1, borderRadius: 8, paddingVertical: 14, marginTop: 8, marginBottom: 16 },
  signOutText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  version: { fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center", paddingBottom: 8 },
  ordersContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  ordersHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 16 },
  backBtn: { padding: 4 },
  inlineBack: { flexDirection: "row", alignItems: "center", gap: 8 },
  inlineBackText: { fontFamily: "Inter_500Medium", fontSize: 14 },
  ordersTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  centeredBox: { alignItems: "center", paddingVertical: 60, gap: 12 },
  centeredText: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", paddingHorizontal: 16 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderWidth: 1, borderRadius: 4 },
  retryText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  ordersList: { gap: 12, paddingBottom: 80 },
  orderCard: { borderWidth: 1, borderRadius: 8, overflow: "hidden" },
  orderCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: 14 },
  orderNumber: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  orderDate: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  orderCardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, borderTopWidth: 1 },
  orderItemCount: { fontFamily: "Inter_400Regular", fontSize: 13 },
  orderTotal: { fontFamily: "Inter_700Bold", fontSize: 15 },
  emailPrompt: { alignItems: "center", gap: 12, paddingVertical: 16 },
  emailPromptTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  emailPromptSub: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20 },
  emailInput: { width: "100%", borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  emailSubmit: { width: "100%", paddingVertical: 14, alignItems: "center", borderRadius: 4 },
  emailSubmitText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 13, letterSpacing: 1 },
  emailRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  emailShown: { fontFamily: "Inter_400Regular", fontSize: 14 },
  changeEmail: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
});
