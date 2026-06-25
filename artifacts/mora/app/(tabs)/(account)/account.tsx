import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import LottieView from "lottie-react-native";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { useWishlist } from "@/context/WishlistContext";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { BlurView } from "expo-blur";
import { LiquidGlassBg, isIOS26Plus } from "@/components/LiquidGlassBg";

const PRIMARY = "#0274C1";

const STAR_THRESHOLD = 200000;
const STAR_SRC = require("@/assets/lottie/star.json");
const STAR_BURST_SRC = require("@/assets/lottie/star-burst.json");

const useGlassSurface = Platform.OS !== "web";
const SURFACE_TINT_LIGHT = isIOS26Plus ? "rgba(235,245,255,0.1)" : "rgba(235,245,255,0.5)";
const SURFACE_TINT_DARK  = isIOS26Plus ? "rgba(28,28,30,0.14)"  : "rgba(28,28,30,0.5)";

function GlassBase({ isDark, intensity = 55 }: { isDark: boolean; intensity?: number }) {
  if (isIOS26Plus) return <LiquidGlassBg />;
  if (Platform.OS !== "web") {
    return (
      <BlurView
        style={StyleSheet.absoluteFill}
        intensity={intensity}
        tint={isDark ? "systemThinMaterialDark" : "systemThinMaterial"}
      />
    );
  }
  return null;
}

/* ─────────────────────────────────────────────
   GUEST SCREEN
────────────────────────────────────────────── */
function GuestScreen({
  onSignIn, onJoin, onOpenSettings, insets,
}: { onSignIn: () => void; onJoin: () => void; onOpenSettings: () => void; insets: any }) {
  const colors = useColors();
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === "dark";
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 0 : insets.top;
  const botPad = Platform.OS === "web" ? 90 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.acctHeader, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <View style={{ width: 38 }} />
        <Text style={[styles.acctTitle, { color: colors.foreground }]}>MY ACCOUNT</Text>
        <Pressable style={styles.glassIconBtn} onPress={onOpenSettings} testID="btn-settings">
          {isIOS26Plus
            ? <LiquidGlassBg />
            : Platform.OS !== "web" && <BlurView style={StyleSheet.absoluteFill} intensity={60} tint={isDark ? "systemThinMaterialDark" : "systemThinMaterial"} />
          }
          <Feather name="settings" size={18} color={colors.foreground} />
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
              { borderColor: PRIMARY, overflow: "hidden", opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={onJoin}
            testID="btn-join"
          >
            {useGlassSurface && <GlassBase isDark={isDark} intensity={45} />}
            <Text style={[styles.joinBtnText, { color: PRIMARY }]}>JOIN</Text>
          </Pressable>
        </View>

        <Pressable style={[styles.helpRow, { bottom: botPad + 24 }]} onPress={() => router.push("/chat" as any)}>
          <Text style={[styles.helpText, { color: colors.mutedForeground }]}>Need help?</Text>
          <Feather name="help-circle" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>
    </View>
  );
}

/* ─────────────────────────────────────────────
   ACCOUNT MAIN (logged-in)
────────────────────────────────────────────── */
function AccountMain({ insets, onOpenSettings }: { insets: any; onOpenSettings: () => void }) {
  const colors = useColors();
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === "dark";
  const card   = isDark ? "#1C1C1E" : "#EBF5FF";
  const bg     = isDark ? "#0A0A0A" : "#FFFFFF";
  const { user, logout } = useAuth();
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const router = useRouter();
  const { count: wishlistCount } = useWishlist();
  const topPad = Platform.OS === "web" ? 0 : insets.top;
  const botPad = Platform.OS === "web" ? 0 : insets.bottom;

  const initials = user
    ? (user.firstName[0] ?? "") + (user.lastName[0] ?? "")
    : "M";

  const isStar = (user?.totalSpent ?? 0) >= STAR_THRESHOLD;
  const [showBurst, setShowBurst] = useState(false);
  const [burstKey, setBurstKey]   = useState(0);
  const burstRef         = useRef<LottieView>(null);
  const burstPlayedRef   = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!isStar) return undefined;
      burstPlayedRef.current = false;
      setBurstKey((k) => k + 1);
      setShowBurst(true);
      const t = setTimeout(() => setShowBurst(false), 1400);
      return () => clearTimeout(t);
    }, [isStar]),
  );

  const SECTIONS = [
    {
      titleEn: "MY ACCOUNT",
      titleAr: "حسابي",
      items: [
        { id: "orders",   icon: "package",       labelEn: "My Orders",      labelAr: "طلباتي",                  arrow: true },
        { id: "wishlist", icon: "heart",          labelEn: "Wishlist",       labelAr: "المفضلة",                 badge: wishlistCount > 0 ? String(wishlistCount) : undefined, arrow: true },
        { id: "address",  icon: "map-pin",        labelEn: "Addresses",      labelAr: "العناوين",                arrow: true },
        { id: "mysize",   icon: "sliders",        labelEn: "My Size",        labelAr: "مقاسي",                   arrow: true },
      ],
    },
    {
      titleEn: "SUPPORT",
      titleAr: "الدعم",
      items: [
        { id: "help",    icon: "help-circle",    labelEn: "Help & FAQs",    labelAr: "المساعدة والأسئلة",       arrow: true },
        { id: "contact", icon: "message-circle", labelEn: "Contact Us",     labelAr: "تواصل معنا",              arrow: true },
        { id: "privacy", icon: "shield",         labelEn: "Privacy Policy", labelAr: "سياسة الخصوصية",         arrow: true },
      ],
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* ── Header ── */}
      <View style={[styles.acctHeader, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <View style={{ width: 38 }} />
        <Text style={[styles.acctTitle, { color: colors.foreground }]}>
          {isAr ? "حسابي" : "MY ACCOUNT"}
        </Text>
        <Pressable style={styles.glassIconBtn} onPress={onOpenSettings} testID="btn-settings">
          {isIOS26Plus
            ? <LiquidGlassBg />
            : Platform.OS !== "web" && <BlurView style={StyleSheet.absoluteFill} intensity={60} tint={isDark ? "systemThinMaterialDark" : "systemThinMaterial"} />
          }
          <Feather name="settings" size={18} color={colors.foreground} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: botPad + 80 }}
      >
        {/* ── Profile card ── */}
        <View style={[
          styles.profileCard,
          { backgroundColor: useGlassSurface ? "transparent" : card, overflow: "hidden" },
          isAr && { flexDirection: "row-reverse" },
        ]}>
          {useGlassSurface && <GlassBase isDark={isDark} />}
          {useGlassSurface && (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? SURFACE_TINT_DARK : SURFACE_TINT_LIGHT }]} />
          )}
          <View style={[styles.avatar, { backgroundColor: PRIMARY }]}>
            <Text style={styles.avatarText}>{initials.toUpperCase()}</Text>
          </View>
          <View style={[styles.profileInfo, isAr && { alignItems: "flex-end" }]}>
            <Text style={[styles.profileName, { color: colors.foreground }, isAr && { textAlign: "right" }]}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={[styles.profileEmail, { color: colors.mutedForeground }, isAr && { textAlign: "right" }]}>
              {user?.email}
            </Text>
            {isStar ? (
              <View style={[styles.starBadgeRow, isAr && { flexDirection: "row-reverse" }]}>
                <View style={styles.starBadge}>
                  <Text style={styles.starBadgeText}>{isAr ? "نجوم مورا" : "MORA STAR"}</Text>
                </View>
                <LottieView
                  source={STAR_SRC}
                  autoPlay
                  loop
                  style={styles.starIcon}
                  webStyle={{ width: 30, height: 30 }}
                />
              </View>
            ) : (
              <View style={[styles.memberBadge, { backgroundColor: colors.accent }]}>
                <Text style={[styles.memberBadgeText, { color: colors.accentForeground }]}>
                  {isAr ? "عضو مورا" : "MORA MEMBER"}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Sections ── */}
        {SECTIONS.map((section) => (
          <View key={section.titleEn} style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }, isAr && { textAlign: "right" }]}>
              {isAr ? section.titleAr : section.titleEn}
            </Text>
            <View style={[styles.sectionCard, { backgroundColor: useGlassSurface ? "transparent" : card }]}>
              {useGlassSurface && <GlassBase isDark={isDark} />}
              {useGlassSurface && (
                <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? SURFACE_TINT_DARK : SURFACE_TINT_LIGHT }]} />
              )}
              {section.items.map((item, idx) => {
                const isLast = idx === section.items.length - 1;
                return (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [
                      styles.menuRow,
                      { borderBottomColor: colors.border },
                      isLast && styles.lastRow,
                      pressed && { backgroundColor: colors.secondary },
                      isAr && { flexDirection: "row-reverse" },
                    ]}
                    onPress={() => {
                      if (item.id === "orders")   router.push("/orders");
                      else if (item.id === "wishlist") router.push("/wishlist");
                      else if (item.id === "address")  router.push("/address");
                      else if (item.id === "mysize")   router.push("/my-size");
                    }}
                    testID={`menu-${item.id}`}
                  >
                    {/* Icon + label — on right in Arabic */}
                    <View style={[styles.menuLeft, isAr && { flexDirection: "row-reverse" }]}>
                      <View style={[styles.iconBox, { backgroundColor: isDark ? "#1C1C1E" : "#EBF5FF" }]}>
                        <Feather name={item.icon as any} size={16} color={PRIMARY} />
                      </View>
                      <Text style={[styles.menuLabel, { color: colors.foreground }]}>
                        {isAr ? item.labelAr : item.labelEn}
                      </Text>
                    </View>
                    {/* Badge + arrow — on left in Arabic */}
                    <View style={styles.menuRight}>
                      {item.badge && (
                        <View style={[styles.badgePill, { backgroundColor: PRIMARY }]}>
                          <Text style={styles.badgePillTxt}>{item.badge}</Text>
                        </View>
                      )}
                      {item.arrow && (
                        <Feather
                          name={isAr ? "chevron-left" : "chevron-right"}
                          size={16}
                          color={colors.mutedForeground}
                        />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        {/* ── Sign Out ── */}
        <Pressable
          style={({ pressed }) => [
            styles.signOutRow,
            { borderColor: colors.border, marginHorizontal: 16, overflow: "hidden", opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={logout}
          testID="btn-sign-out"
        >
          {useGlassSurface && <GlassBase isDark={isDark} intensity={45} />}
          <Feather name="log-out" size={16} color="#DC2626" />
          <Text style={styles.signOutTxt}>{isAr ? "تسجيل الخروج" : "Sign Out"}</Text>
        </Pressable>
        <Text style={[styles.version, { color: colors.mutedForeground }]}>Mora v1.0.0</Text>
      </ScrollView>

      {showBurst && (
        <View pointerEvents="none" style={styles.burstOverlay}>
          <LottieView
            key={burstKey}
            ref={burstRef}
            source={STAR_BURST_SRC}
            autoPlay
            loop={false}
            resizeMode="cover"
            style={StyleSheet.absoluteFill}
            webStyle={{ width: "100%", height: "100%" }}
            onLayout={() => {
              if (Platform.OS === "web" || burstPlayedRef.current) return;
              burstPlayedRef.current = true;
              burstRef.current?.reset();
              burstRef.current?.play();
            }}
          />
        </View>
      )}
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

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  if (user) {
    return <AccountMain insets={insets} onOpenSettings={() => router.push("/settings")} />;
  }

  return (
    <GuestScreen
      onSignIn={() => router.push("/auth")}
      onJoin={() => router.push("/auth")}
      onOpenSettings={() => router.push("/settings")}
      insets={insets}
    />
  );
}

/* ─────────────────────────────────────────────
   STYLES
────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1 },
  center:    { alignItems: "center", justifyContent: "center" },

  acctHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  acctTitle:    { fontFamily: "Inter_700Bold", fontSize: 15, letterSpacing: 1 },
  iconBtn:      { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  glassIconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", overflow: "hidden" },

  /* ── Guest ── */
  guestBody:    { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 16 },
  moraEmoji:    { width: 90, height: 90, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  emojiOuter:   { width: 80, height: 80, borderRadius: 40, position: "relative", alignItems: "center", justifyContent: "center" },
  emojiPx:      { position: "absolute" },
  comeOnIn:     { fontFamily: "Inter_700Bold", fontSize: 22, letterSpacing: 1, textAlign: "center" },
  comeOnInSub:  { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20 },
  authBtns:     { width: "100%", gap: 12, marginTop: 8 },
  signInBtn:    { width: "100%", paddingVertical: 16, alignItems: "center", borderRadius: 50 },
  signInBtnText:{ fontFamily: "Inter_700Bold", fontSize: 14, letterSpacing: 1 },
  joinBtn:      { width: "100%", paddingVertical: 15, alignItems: "center", borderRadius: 50, borderWidth: 1 },
  joinBtnText:  { fontFamily: "Inter_700Bold", fontSize: 14, letterSpacing: 1 },
  helpRow:      { flexDirection: "row", alignItems: "center", gap: 6, position: "absolute" },
  helpText:     { fontFamily: "Inter_400Regular", fontSize: 14 },

  /* ── Auth form ── */
  formScroll: { padding: 20, gap: 0 },
  formRow:    { marginBottom: 16 },
  label:      { fontFamily: "Inter_500Medium", fontSize: 13, marginBottom: 6 },
  input:      { borderWidth: 1, borderRadius: 6, paddingHorizontal: 14, paddingVertical: 12, fontFamily: "Inter_400Regular", fontSize: 15 },
  passWrap:   { position: "relative" },
  passInput:  { paddingRight: 46 },
  eyeBtn:     { position: "absolute", right: 12, top: 12 },
  errorBox:   { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 6, borderWidth: 1, marginBottom: 16 },
  errorMsg:   { color: "#DC2626", fontFamily: "Inter_400Regular", fontSize: 13, flex: 1 },
  submitBtn:  { paddingVertical: 16, alignItems: "center", borderRadius: 2, marginTop: 8 },
  submitBtnText: { fontFamily: "Inter_700Bold", fontSize: 14, letterSpacing: 1 },

  /* ── Account main ── */
  profileCard:  { margin: 16, padding: 16, borderRadius: 16, flexDirection: "row", alignItems: "center", gap: 14 },
  avatar:       { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  avatarText:   { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 20 },
  profileInfo:  { flex: 1, gap: 4 },
  profileName:  { fontFamily: "Inter_700Bold", fontSize: 17 },
  profileEmail: { fontFamily: "Inter_400Regular", fontSize: 13 },
  memberBadge:  { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 4 },
  memberBadgeText: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.5 },

  /* ── MORA STAR tier ── */
  starBadgeRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  starBadge:    { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: "#F5B301" },
  starBadgeText:{ fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.5, color: "#1A1A1A" },
  starIcon:     { width: 30, height: 30 },
  burstOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", zIndex: 50 },

  section:      { paddingHorizontal: 16, marginBottom: 16 },
  sectionLabel: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1, marginBottom: 8 },
  sectionCard:  { borderRadius: 16, overflow: "hidden" },
  menuRow:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1 },
  lastRow:      { borderBottomWidth: 0 },
  menuLeft:     { flexDirection: "row", alignItems: "center", gap: 12 },
  menuRight:    { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBox:      { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  menuLabel:    { fontFamily: "Inter_500Medium", fontSize: 15 },
  badgePill:    { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, minWidth: 20, alignItems: "center" },
  badgePillTxt: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },

  signOutRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderWidth: 1, borderRadius: 16, marginBottom: 16 },
  signOutTxt: { color: "#DC2626", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  version:    { textAlign: "center", fontFamily: "Inter_400Regular", fontSize: 12, paddingBottom: 8 },
});
