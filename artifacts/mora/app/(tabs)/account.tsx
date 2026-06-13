import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useTheme, type ThemeMode } from "@/context/ThemeContext";
import { useLanguage, LANGUAGES } from "@/context/LanguageContext";
import { AppleActionSheet } from "@/components/AppleActionSheet";
import { useWishlist } from "@/context/WishlistContext";
import { useAuth } from "@/context/AuthContext";
import { fetchOrders } from "@/lib/api";
import { AccountExpoUI } from "@/components/AccountExpoUI";

// ── glass detection (AccountExpoUI renders null if unavailable) ────────────────
const IS_IOS = Platform.OS === "ios";
let glassUIAvailable = false;
try {
  require("@expo/ui/swift-ui");
  glassUIAvailable = true;
} catch {}

const PRIMARY = "#0274C1";

type ViewT = "guest" | "sign-in" | "register";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch { return iso; }
}
function statusColor(s: string) {
  const l = s.toLowerCase();
  if (l === "delivered" || l === "fulfilled") return "#43A047";
  if (l === "shipped" || l === "in_transit") return "#0274C1";
  if (l === "cancelled" || l === "refunded") return "#E53935";
  return "#888";
}

/* ─────────────────────────────────────────────
   SETTINGS SCREEN
   Only shows: Appearance · Language · About · Privacy
────────────────────────────────────────────── */
function SettingsScreen({ onBack, insets }: { onBack: () => void; insets: any }) {
  const colors = useColors();
  const { mode, setMode } = useTheme();
  const { lang, language, setLang } = useLanguage();
  const [showLangPicker, setShowLangPicker] = useState(false);
  const topPad = Platform.OS === "web" ? 0 : insets.top;
  const botPad = Platform.OS === "web" ? 0 : insets.bottom;

  const THEME_OPTIONS: { value: ThemeMode; label: string; icon: string }[] = [
    { value: "light", label: "Light", icon: "sun" },
    { value: "dark", label: "Dark", icon: "moon" },
    { value: "system", label: "System", icon: "smartphone" },
  ];

  const langOptions = LANGUAGES.map((l) => ({
    value: l.code,
    label: l.nativeLabel,
    sublabel: l.label,
    flag: l.flag,
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.acctHeader, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={onBack} style={styles.iconBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.acctTitle, { color: colors.foreground }]}>SETTINGS</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: botPad + 80 }}
      >
        {/* ── Appearance ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>APPEARANCE</Text>
          <View style={[styles.sectionCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <View style={[styles.themeRow, { borderBottomColor: colors.border }]}>
              {THEME_OPTIONS.map((opt) => {
                const active = mode === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setMode(opt.value)}
                    style={[
                      styles.themeOption,
                      {
                        backgroundColor: active ? PRIMARY : colors.secondary,
                        borderColor: active ? PRIMARY : colors.border,
                      },
                    ]}
                  >
                    <Feather
                      name={opt.icon as any}
                      size={17}
                      color={active ? "#fff" : colors.foreground}
                    />
                    <Text
                      style={[
                        styles.themeOptionLabel,
                        { color: active ? "#fff" : colors.foreground },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── Language ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>LANGUAGE</Text>
          <View style={[styles.sectionCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Pressable
              style={({ pressed }) => [
                styles.settingsRow,
                styles.lastRow,
                { borderBottomColor: colors.border },
                pressed && { backgroundColor: colors.secondary },
              ]}
              onPress={() => setShowLangPicker(true)}
              accessibilityRole="button"
              accessibilityLabel="Select language"
            >
              <View style={styles.settingsLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: colors.secondary }]}>
                  <Feather name="globe" size={16} color={PRIMARY} />
                </View>
                <Text style={[styles.settingsLabel, { color: colors.foreground }]}>Language</Text>
              </View>
              <View style={styles.settingsRight}>
                <Text style={[styles.settingsValue, { color: colors.mutedForeground }]}>
                  {language.flag} {language.nativeLabel}
                </Text>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </View>
            </Pressable>
          </View>
        </View>

        {/* ── Apple-style language picker ── */}
        <AppleActionSheet
          visible={showLangPicker}
          title="Choose Language"
          options={langOptions}
          selectedValue={lang}
          onSelect={(val) => {
            setLang(val as any);
            setShowLangPicker(false);
          }}
          onCancel={() => setShowLangPicker(false)}
        />

        {/* ── Information ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>INFORMATION</Text>
          <View style={[styles.sectionCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Pressable
              style={({ pressed }) => [
                styles.settingsRow,
                { borderBottomColor: colors.border },
                pressed && { backgroundColor: colors.secondary },
              ]}
            >
              <View style={styles.settingsLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: colors.secondary }]}>
                  <Feather name="info" size={16} color={PRIMARY} />
                </View>
                <Text style={[styles.settingsLabel, { color: colors.foreground }]}>About Mora</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.settingsRow,
                styles.lastRow,
                { borderBottomColor: colors.border },
                pressed && { backgroundColor: colors.secondary },
              ]}
            >
              <View style={styles.settingsLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: colors.secondary }]}>
                  <Feather name="shield" size={16} color={PRIMARY} />
                </View>
                <Text style={[styles.settingsLabel, { color: colors.foreground }]}>Privacy Policy</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>

        <Text style={[styles.version, { color: colors.mutedForeground }]}>Mora v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

/* ─────────────────────────────────────────────
   GUEST SCREEN
────────────────────────────────────────────── */
function GuestScreen({
  onSignIn, onJoin, onOpenSettings, insets,
}: { onSignIn: () => void; onJoin: () => void; onOpenSettings: () => void; insets: any }) {
  const colors = useColors();
  const topPad = Platform.OS === "web" ? 0 : insets.top;
  // On web the floating tab bar is ~90px tall, so push content above it
  const botPad = Platform.OS === "web" ? 90 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.acctHeader, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <View style={{ width: 38 }} />
        <Text style={[styles.acctTitle, { color: colors.foreground }]}>MY ACCOUNT</Text>
        <Pressable style={styles.iconBtn} onPress={onOpenSettings} testID="btn-settings">
          <Feather name="settings" size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <View style={[styles.guestBody, { paddingBottom: botPad + 80 }]}>
        <View style={styles.moraEmoji}>
          <View style={[styles.emojiOuter, { backgroundColor: "#F3D54E" }]}>
            <View style={[styles.emojiPx, { top: 10, left: 10, width: 8, height: 8, backgroundColor: "#1A1A1A" }]} />
            <View style={[styles.emojiPx, { top: 10, right: 10, width: 8, height: 8, backgroundColor: "#1A1A1A" }]} />
            <View style={[styles.emojiPx, { top: 10, right: 22, width: 4, height: 4, backgroundColor: "#F3D54E" }]} />
            <View style={[styles.emojiPx, { bottom: 14, left: 10, right: 10, height: 6, backgroundColor: "#1A1A1A" }]} />
          </View>
        </View>

        <Text style={[styles.comeOnIn, { color: colors.foreground }]}>COME ON IN</Text>
        <Text style={[styles.comeOnInSub, { color: colors.mutedForeground }]}>
          View orders and update your details
        </Text>

        <View style={styles.authBtns}>
          <Pressable
            style={({ pressed }) => [
              styles.signInBtn,
              { backgroundColor: PRIMARY, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={onSignIn}
            testID="btn-sign-in"
          >
            <Text style={[styles.signInBtnText, { color: "#FFFFFF" }]}>SIGN IN</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.joinBtn,
              { borderColor: PRIMARY, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={onJoin}
            testID="btn-join"
          >
            <Text style={[styles.joinBtnText, { color: PRIMARY }]}>JOIN</Text>
          </Pressable>
        </View>

        <Pressable style={[styles.helpRow, { bottom: botPad + 24 }]}>
          <Text style={[styles.helpText, { color: colors.mutedForeground }]}>Need help?</Text>
          <Feather name="help-circle" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>
    </View>
  );
}

/* ─────────────────────────────────────────────
   AUTH FORM
────────────────────────────────────────────── */
function AuthForm({
  mode, onClose, colors, insets,
}: { mode: "sign-in" | "register"; onClose: () => void; colors: any; insets: any }) {
  const { login, register } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const topPad = Platform.OS === "web" ? 0 : insets.top;
  const isRegister = mode === "register";

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) { setError("Please fill in all required fields"); return; }
    if (isRegister && !firstName.trim()) { setError("First name is required"); return; }
    setLoading(true);
    setError("");
    try {
      if (isRegister) {
        await register(firstName.trim(), lastName.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
    } catch (e) {
      setError((e as Error).message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.acctHeader, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={onClose} style={styles.iconBtn}>
          <Feather name="x" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.acctTitle, { color: colors.foreground }]}>
          {isRegister ? "JOIN MORA" : "SIGN IN"}
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.formScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {isRegister && (
          <>
            <View style={styles.formRow}>
              <Text style={[styles.label, { color: colors.foreground }]}>First Name *</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.secondary }]}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Sara"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.formRow}>
              <Text style={[styles.label, { color: colors.foreground }]}>Last Name</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.secondary }]}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Ahmed"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="words"
              />
            </View>
          </>
        )}

        <View style={styles.formRow}>
          <Text style={[styles.label, { color: colors.foreground }]}>Email *</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.secondary }]}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.formRow}>
          <Text style={[styles.label, { color: colors.foreground }]}>Password *</Text>
          <View style={styles.passWrap}>
            <TextInput
              style={[styles.input, styles.passInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.secondary }]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry={!showPass}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable style={styles.eyeBtn} onPress={() => setShowPass(!showPass)}>
              <Feather name={showPass ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>

        {!!error && (
          <View style={[styles.errorBox, { backgroundColor: "#FEE2E2", borderColor: "#FECACA" }]}>
            <Feather name="alert-circle" size={14} color="#DC2626" />
            <Text style={styles.errorMsg}>{error}</Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.submitBtn,
            { backgroundColor: colors.foreground, opacity: (pressed || loading) ? 0.75 : 1 },
          ]}
          onPress={handleSubmit}
          disabled={loading}
          testID="btn-submit-auth"
        >
          {loading
            ? <ActivityIndicator color={colors.background} size="small" />
            : <Text style={[styles.submitBtnText, { color: colors.background }]}>
                {isRegister ? "CREATE ACCOUNT" : "SIGN IN"}
              </Text>
          }
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ─────────────────────────────────────────────
   ACCOUNT MAIN (logged-in)
────────────────────────────────────────────── */
function AccountMain({ insets, onOpenSettings }: { insets: any; onOpenSettings: () => void }) {
  const colors = useColors();
  const { user, logout } = useAuth();
  const router = useRouter();
  const { count: wishlistCount } = useWishlist();
  const [toggles, setToggles] = useState<Record<string, boolean>>({ notifications: true, emails: false });
  const [showOrders, setShowOrders] = useState(false);
  const topPad = Platform.OS === "web" ? 0 : insets.top;
  const botPad = Platform.OS === "web" ? 0 : insets.bottom;

  const { data: orders, isLoading: ordersLoading, isRefetching, refetch } = useQuery({
    queryKey: ["orders", user?.email],
    queryFn: () => fetchOrders(user?.email ?? ""),
    enabled: !!user?.email && showOrders,
  });

  const initials = user
    ? (user.firstName[0] ?? "") + (user.lastName[0] ?? "")
    : "M";

  // ── iOS: native SwiftUI Form with Liquid Glass ────────────────────────────────
  if (!showOrders && IS_IOS && glassUIAvailable) {
    return (
      <AccountExpoUI
        user={user}
        wishlistCount={wishlistCount}
        onLogout={logout}
        onOrdersPress={() => setShowOrders(true)}
        onWishlistPress={() => router.push("/(tabs)/wishlist")}
      />
    );
  }

  if (showOrders) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.acctHeader, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => setShowOrders(false)} style={styles.iconBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.acctTitle, { color: colors.foreground }]}>MY ORDERS</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: botPad + 80, gap: 10 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={PRIMARY} />}
        >
          {ordersLoading ? (
            <View style={styles.centeredBox}>
              <ActivityIndicator color={PRIMARY} size="large" />
            </View>
          ) : !orders || orders.length === 0 ? (
            <View style={styles.centeredBox}>
              <Feather name="package" size={48} color={colors.border} />
              <Text style={[styles.centeredText, { color: colors.mutedForeground }]}>No orders yet</Text>
            </View>
          ) : (
            orders.map((order) => (
              <View key={order.id} style={[styles.orderCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <View style={styles.orderCardTop}>
                  <View>
                    <Text style={[styles.orderNum, { color: colors.foreground }]}>
                      Order #{order.orderNumber ?? order.id.slice(0, 8).toUpperCase()}
                    </Text>
                    <Text style={[styles.orderDate, { color: colors.mutedForeground }]}>{formatDate(order.createdAt)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor(order.status) + "20" }]}>
                    <Text style={[styles.statusTxt, { color: statusColor(order.status) }]}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Text>
                  </View>
                </View>
                <View style={[styles.orderCardBottom, { borderTopColor: colors.border }]}>
                  <Text style={[styles.orderItems, { color: colors.mutedForeground }]}>
                    {order.lineItems?.length ?? 0} item{(order.lineItems?.length ?? 0) !== 1 ? "s" : ""}
                  </Text>
                  <Text style={[styles.orderTotal, { color: colors.foreground }]}>{Math.round(order.total).toLocaleString("en-US")} IQD</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.acctHeader, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <View style={{ width: 38 }} />
        <Text style={[styles.acctTitle, { color: colors.foreground }]}>MY ACCOUNT</Text>
        <Pressable style={styles.iconBtn} onPress={onOpenSettings} testID="btn-settings">
          <Feather name="settings" size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: botPad + 80 }}
      >
        <View style={[styles.profileCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: PRIMARY }]}>
            <Text style={styles.avatarText}>{initials.toUpperCase()}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.foreground }]}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={[styles.profileEmail, { color: colors.mutedForeground }]}>{user?.email}</Text>
            <View style={[styles.memberBadge, { backgroundColor: colors.accent }]}>
              <Text style={[styles.memberBadgeText, { color: colors.accentForeground }]}>MORA MEMBER</Text>
            </View>
          </View>
        </View>

        {[
          {
            title: "MY ACCOUNT",
            items: [
              { id: "orders", icon: "package", label: "My Orders", arrow: true },
              { id: "wishlist", icon: "heart", label: "Wishlist", badge: wishlistCount > 0 ? String(wishlistCount) : undefined, arrow: true },
              { id: "address", icon: "map-pin", label: "Addresses", arrow: true },
              { id: "payment", icon: "credit-card", label: "Payment Methods", arrow: true },
            ],
          },
          {
            title: "PREFERENCES",
            items: [
              { id: "notifications", label: "Push Notifications", icon: "bell", toggle: true },
              { id: "emails", label: "Email Updates", icon: "mail", toggle: true },
            ],
          },
          {
            title: "SUPPORT",
            items: [
              { id: "help", icon: "help-circle", label: "Help & FAQs", arrow: true },
              { id: "contact", icon: "message-circle", label: "Contact Us", arrow: true },
              { id: "privacy", icon: "shield", label: "Privacy Policy", arrow: true },
            ],
          },
        ].map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{section.title}</Text>
            <View style={[styles.sectionCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
              {section.items.map((item, idx) => {
                const isLast = idx === section.items.length - 1;
                if ((item as any).toggle) {
                  return (
                    <View
                      key={item.id}
                      style={[styles.menuRow, { borderBottomColor: colors.border }, isLast && styles.lastRow]}
                    >
                      <View style={styles.menuLeft}>
                        <View style={[styles.iconBox, { backgroundColor: colors.secondary }]}>
                          <Feather name={item.icon as any} size={16} color={PRIMARY} />
                        </View>
                        <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
                      </View>
                      <Switch
                        value={!!toggles[item.id]}
                        onValueChange={() => setToggles((p) => ({ ...p, [item.id]: !p[item.id] }))}
                        trackColor={{ false: colors.border, true: PRIMARY }}
                        thumbColor="#fff"
                      />
                    </View>
                  );
                }
                return (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [
                      styles.menuRow,
                      { borderBottomColor: colors.border },
                      isLast && styles.lastRow,
                      pressed && { backgroundColor: colors.secondary },
                    ]}
                    onPress={() => {
                      if (item.id === "orders") setShowOrders(true);
                      else if (item.id === "wishlist") router.push("/(tabs)/wishlist");
                    }}
                    testID={`menu-${item.id}`}
                  >
                    <View style={styles.menuLeft}>
                      <View style={[styles.iconBox, { backgroundColor: colors.secondary }]}>
                        <Feather name={item.icon as any} size={16} color={PRIMARY} />
                      </View>
                      <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
                    </View>
                    <View style={styles.menuRight}>
                      {(item as any).badge && (
                        <View style={[styles.badgePill, { backgroundColor: PRIMARY }]}>
                          <Text style={styles.badgePillTxt}>{(item as any).badge}</Text>
                        </View>
                      )}
                      {(item as any).arrow && (
                        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        <Pressable
          style={({ pressed }) => [
            styles.signOutRow,
            { borderColor: colors.border, marginHorizontal: 16, opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={logout}
          testID="btn-sign-out"
        >
          <Feather name="log-out" size={16} color="#DC2626" />
          <Text style={styles.signOutTxt}>Sign Out</Text>
        </Pressable>
        <Text style={[styles.version, { color: colors.mutedForeground }]}>Mora v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

/* ─────────────────────────────────────────────
   ROOT SCREEN (orchestrator)
────────────────────────────────────────────── */
export default function AccountScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [showSettings, setShowSettings] = useState(false);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  if (showSettings) {
    return <SettingsScreen onBack={() => setShowSettings(false)} insets={insets} />;
  }

  if (user) {
    return <AccountMain insets={insets} onOpenSettings={() => setShowSettings(true)} />;
  }

  return (
    <GuestScreen
      onSignIn={() => router.push("/auth")}
      onJoin={() => router.push("/auth")}
      onOpenSettings={() => setShowSettings(true)}
      insets={insets}
    />
  );
}

/* ─────────────────────────────────────────────
   STYLES
────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },

  acctHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  acctTitle: { fontFamily: "Inter_700Bold", fontSize: 15, letterSpacing: 1 },
  iconBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },

  /* ── Settings ── */
  themeRow: {
    flexDirection: "row",
    padding: 12,
    gap: 10,
  },
  themeOption: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  themeOptionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.3,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  settingsLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  settingsRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  settingsIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsLabel: { fontFamily: "Inter_500Medium", fontSize: 15 },
  settingsValue: { fontFamily: "Inter_400Regular", fontSize: 14 },

  /* ── Guest ── */
  guestBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  moraEmoji: { width: 90, height: 90, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  emojiOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  emojiPx: { position: "absolute" },
  comeOnIn: { fontFamily: "Inter_700Bold", fontSize: 22, letterSpacing: 1, textAlign: "center" },
  comeOnInSub: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20 },
  authBtns: { width: "100%", gap: 12, marginTop: 8 },
  signInBtn: { width: "100%", paddingVertical: 16, alignItems: "center", borderRadius: 50 },
  signInBtnText: { fontFamily: "Inter_700Bold", fontSize: 14, letterSpacing: 1 },
  joinBtn: { width: "100%", paddingVertical: 15, alignItems: "center", borderRadius: 50, borderWidth: 1 },
  joinBtnText: { fontFamily: "Inter_700Bold", fontSize: 14, letterSpacing: 1 },
  helpRow: { flexDirection: "row", alignItems: "center", gap: 6, position: "absolute" },
  helpText: { fontFamily: "Inter_400Regular", fontSize: 14 },

  /* ── Auth form ── */
  formScroll: { padding: 20, gap: 0 },
  formRow: { marginBottom: 16 },
  label: { fontFamily: "Inter_500Medium", fontSize: 13, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  passWrap: { position: "relative" },
  passInput: { paddingRight: 46 },
  eyeBtn: { position: "absolute", right: 12, top: 12 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorMsg: { color: "#DC2626", fontFamily: "Inter_400Regular", fontSize: 13, flex: 1 },
  submitBtn: { paddingVertical: 16, alignItems: "center", borderRadius: 2, marginTop: 8 },
  submitBtnText: { fontFamily: "Inter_700Bold", fontSize: 14, letterSpacing: 1 },

  /* ── Account main ── */
  profileCard: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 20 },
  profileInfo: { flex: 1, gap: 4 },
  profileName: { fontFamily: "Inter_700Bold", fontSize: 17 },
  profileEmail: { fontFamily: "Inter_400Regular", fontSize: 13 },
  memberBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
    marginTop: 4,
  },
  memberBadgeText: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.5 },

  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionLabel: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1, marginBottom: 8 },
  sectionCard: { borderRadius: 8, borderWidth: 1, overflow: "hidden" },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  lastRow: { borderBottomWidth: 0 },
  menuLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  menuRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBox: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  menuLabel: { fontFamily: "Inter_500Medium", fontSize: 15 },
  badgePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: "center",
  },
  badgePillTxt: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },

  /* ── Orders ── */
  orderCard: { borderWidth: 1, borderRadius: 8, overflow: "hidden" },
  orderCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  orderNum: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  orderDate: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  statusTxt: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  orderCardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  orderItems: { fontFamily: "Inter_400Regular", fontSize: 13 },
  orderTotal: { fontFamily: "Inter_700Bold", fontSize: 14 },

  signOutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
  },
  signOutTxt: { color: "#DC2626", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  version: { textAlign: "center", fontFamily: "Inter_400Regular", fontSize: 12, paddingBottom: 8 },

  centeredBox: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 12 },
  centeredText: { fontFamily: "Inter_400Regular", fontSize: 15 },
});
