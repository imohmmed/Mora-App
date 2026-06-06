import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { MoraLogo } from "@/components/MoraLogo";

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

type MenuItem = {
  id: string;
  icon: FeatherIconName;
  label: string;
  badge?: string;
  arrow?: boolean;
};

type ToggleItem = {
  id: string;
  icon: FeatherIconName;
  label: string;
  toggle: true;
};

type SectionItem = MenuItem | ToggleItem;

type Section = {
  title: string;
  items: SectionItem[];
};

const SECTIONS: Section[] = [
  {
    title: "MY ACCOUNT",
    items: [
      { id: "orders", icon: "package", label: "My Orders", badge: "3", arrow: true },
      { id: "wishlist", icon: "heart", label: "Wishlist", badge: "5", arrow: true },
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

function isToggleItem(item: SectionItem): item is ToggleItem {
  return (item as ToggleItem).toggle === true;
}

export default function AccountScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    notifications: true,
    emails: false,
  });

  const topPadding = isWeb ? 67 : insets.top;
  const bottomPadding = isWeb ? 34 : insets.bottom;

  const flipToggle = (id: string) => {
    setToggles((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 8,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <MoraLogo size="small" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding + 80 }}
      >
        {/* Profile Card */}
        <View
          style={[
            styles.profileCard,
            { backgroundColor: colors.secondary, borderColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.avatar,
              { backgroundColor: colors.primary },
            ]}
          >
            <Text style={styles.avatarText}>AM</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.foreground }]}>
              Ahmad M.
            </Text>
            <Text
              style={[styles.profileEmail, { color: colors.mutedForeground }]}
            >
              ahmad@example.com
            </Text>
            <View
              style={[styles.memberBadge, { backgroundColor: colors.accent }]}
            >
              <Text
                style={[styles.memberBadgeText, { color: colors.primary }]}
              >
                MORA MEMBER
              </Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.editBtn,
              { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="edit-2" size={15} color={colors.foreground} />
          </Pressable>
        </View>

        {/* Sections */}
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text
              style={[styles.sectionTitle, { color: colors.mutedForeground }]}
            >
              {section.title}
            </Text>
            <View
              style={[
                styles.sectionCard,
                { borderColor: colors.border, backgroundColor: colors.background },
              ]}
            >
              {section.items.map((item, idx) => (
                <View key={item.id}>
                  {isToggleItem(item) ? (
                    <View
                      style={[
                        styles.menuItem,
                        { borderBottomColor: colors.border },
                        idx === section.items.length - 1 && styles.lastItem,
                      ]}
                    >
                      <View style={styles.menuItemLeft}>
                        <View
                          style={[
                            styles.iconBox,
                            { backgroundColor: colors.secondary },
                          ]}
                        >
                          <Feather
                            name={item.icon}
                            size={16}
                            color={colors.primary}
                          />
                        </View>
                        <Text
                          style={[
                            styles.menuLabel,
                            { color: colors.foreground },
                          ]}
                        >
                          {item.label}
                        </Text>
                      </View>
                      <Switch
                        value={!!toggles[item.id]}
                        onValueChange={() => flipToggle(item.id)}
                        trackColor={{
                          false: colors.border,
                          true: colors.primary,
                        }}
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
                      testID={`menu-${item.id}`}
                    >
                      <View style={styles.menuItemLeft}>
                        <View
                          style={[
                            styles.iconBox,
                            { backgroundColor: colors.secondary },
                          ]}
                        >
                          <Feather
                            name={item.icon}
                            size={16}
                            color={colors.primary}
                          />
                        </View>
                        <Text
                          style={[
                            styles.menuLabel,
                            { color: colors.foreground },
                          ]}
                        >
                          {item.label}
                        </Text>
                      </View>
                      <View style={styles.menuItemRight}>
                        {(item as MenuItem).badge && (
                          <View
                            style={[
                              styles.badgePill,
                              { backgroundColor: colors.primary },
                            ]}
                          >
                            <Text style={styles.badgePillText}>
                              {(item as MenuItem).badge}
                            </Text>
                          </View>
                        )}
                        {(item as MenuItem).arrow && (
                          <Feather
                            name="chevron-right"
                            size={16}
                            color={colors.mutedForeground}
                          />
                        )}
                      </View>
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Sign Out */}
        <Pressable
          style={({ pressed }) => [
            styles.signOutBtn,
            {
              borderColor: colors.border,
              marginHorizontal: 16,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          testID="sign-out-btn"
        >
          <Feather name="log-out" size={16} color={colors.destructive} />
          <Text
            style={[styles.signOutText, { color: colors.destructive }]}
          >
            Sign Out
          </Text>
        </Pressable>

        <Text style={[styles.version, { color: colors.mutedForeground }]}>
          Mora v1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  profileCard: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 20,
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  profileName: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
  },
  profileEmail: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  memberBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
    marginTop: 4,
  },
  memberBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  editBtn: {
    padding: 8,
    borderWidth: 1,
    borderRadius: 20,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 8,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
  },
  menuItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgePillText: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 11,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 16,
  },
  signOutText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  version: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    textAlign: "center",
    paddingBottom: 8,
  },
});
