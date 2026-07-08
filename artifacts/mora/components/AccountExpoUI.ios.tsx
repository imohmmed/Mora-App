/**
 * AccountExpoUI.ios.tsx
 * Native iOS SwiftUI Form with Liquid Glass — shown to logged-in users on iOS only.
 * Falls back to null if @expo/ui is unavailable (Expo Go, old iOS).
 */
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import type { AccountExpoUIProps } from "./AccountExpoUI";

export type { AccountExpoUIProps };

const PRIMARY = "#0274C1";

let glassAvailable = false;
let Host: any, Form: any, Section: any, Label: any, Picker: any;
let Slider: any, Stepper: any, UIToggle: any, UIText: any, ExpoButton: any;
let tagM: any, tintM: any;
try {
  const ui = require("@expo/ui/swift-ui");
  const mods = require("@expo/ui/swift-ui/modifiers");
  ({ Host, Form, Section, Label, Picker, Slider, Stepper, Toggle: UIToggle, Text: UIText, Button: ExpoButton } = ui);
  ({ tag: tagM, tint: tintM } = mods);
  // Only mark available if every component we actually render is defined
  glassAvailable = !!(Host && Form && Section && ExpoButton && UIToggle && Picker && Slider && Stepper && Label && UIText);
} catch {}

export function AccountExpoUI({ user, wishlistCount, onLogout, onOrdersPress, onWishlistPress }: AccountExpoUIProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(false);
  const [faceId, setFaceId] = useState(true);
  const [currency, setCurrency] = useState<string>("IQD");
  const [size, setSize] = useState<string>("M");
  const [priceAlert, setPriceAlert] = useState(50_000);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  const displayName = user
    ? `${user.firstName} ${user.lastName}`.trim()
    : "Mora Member";
  const email = user?.email ?? "";

  if (!glassAvailable) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Title bar ── */}
      <View style={[styles.titleBar, { paddingTop: insets.top + 10, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>My Account</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Mora · Liquid Glass
        </Text>
      </View>

      <Host style={{ flex: 1 }} useViewportSizeMeasurement>
        <Form>
          {/* ── Profile ── */}
          <Section>
            <Label title={displayName} systemImage="person.crop.circle.fill" color={PRIMARY} />
            <UIText>{email}</UIText>
            <ExpoButton
              label="Edit Profile"
              systemImage="square.and.pencil"
              modifiers={[tintM(PRIMARY)]}
              onPress={tap}
            />
          </Section>

          {/* ── My Account ── */}
          <Section title="My Account">
            <ExpoButton
              label="My Orders"
              systemImage="shippingbox.fill"
              modifiers={[tintM(PRIMARY)]}
              onPress={() => { tap(); onOrdersPress(); }}
            />
            <ExpoButton
              label={wishlistCount > 0 ? `Wishlist (${wishlistCount})` : "Wishlist"}
              systemImage="heart.fill"
              modifiers={[tintM(PRIMARY)]}
              onPress={() => { tap(); onWishlistPress(); }}
            />
            <ExpoButton
              label="Returns & Refunds"
              systemImage="arrow.uturn.backward"
              modifiers={[tintM(PRIMARY)]}
              onPress={tap}
            />
            <ExpoButton
              label="Addresses"
              systemImage="mappin.and.ellipse"
              modifiers={[tintM(PRIMARY)]}
              onPress={tap}
            />
            <ExpoButton
              label="Payment Methods"
              systemImage="creditcard.fill"
              modifiers={[tintM(PRIMARY)]}
              onPress={tap}
            />
          </Section>

          {/* ── Preferences ── */}
          <Section title="Preferences" footer="Manage how Mora communicates with you.">
            <UIToggle
              isOn={pushNotifications}
              onIsOnChange={setPushNotifications}
              label="Push Notifications"
              modifiers={tintM ? [tintM(PRIMARY)] : []}
            />
            <UIToggle
              isOn={emailUpdates}
              onIsOnChange={setEmailUpdates}
              label="Email Updates"
              modifiers={tintM ? [tintM(PRIMARY)] : []}
            />
            <UIToggle
              isOn={faceId}
              onIsOnChange={setFaceId}
              label="Unlock with Face ID"
              modifiers={tintM ? [tintM(PRIMARY)] : []}
            />
            <Picker
              label="Currency"
              selection={currency}
              onSelectionChange={(v: string) => setCurrency(v)}
            >
              <UIText modifiers={[tagM("IQD")]}>IQD ع.د</UIText>
              <UIText modifiers={[tagM("USD")]}>USD $</UIText>
              <UIText modifiers={[tagM("EUR")]}>EUR €</UIText>
              <UIText modifiers={[tagM("GBP")]}>GBP £</UIText>
            </Picker>
          </Section>

          {/* ── Shopping Preferences ── */}
          <Section
            title="Shopping"
            footer={`Notify when items drop below ${Math.round(priceAlert).toLocaleString()} IQD. Show ${itemsPerPage} items per page.`}
          >
            <Picker
              label="Default Size"
              selection={size}
              onSelectionChange={(v: string) => setSize(v)}
            >
              <UIText modifiers={[tagM("XS")]}>XS</UIText>
              <UIText modifiers={[tagM("S")]}>S</UIText>
              <UIText modifiers={[tagM("M")]}>M</UIText>
              <UIText modifiers={[tagM("L")]}>L</UIText>
              <UIText modifiers={[tagM("XL")]}>XL</UIText>
            </Picker>
            <Slider
              value={priceAlert}
              min={10_000}
              max={500_000}
              step={5_000}
              onValueChange={(v: number) => setPriceAlert(Math.round(v))}
              label={<UIText>Price alert: {Math.round(priceAlert).toLocaleString()} IQD</UIText>}
            />
            <Stepper
              label="Items per page"
              defaultValue={20}
              min={10}
              max={50}
              step={10}
              onValueChanged={(v: number) => setItemsPerPage(v)}
            />
          </Section>

          {/* ── Support ── */}
          <Section title="Support">
            <ExpoButton
              label="Help & FAQs"
              systemImage="questionmark.circle.fill"
              modifiers={[tintM(PRIMARY)]}
              onPress={tap}
            />
            <ExpoButton
              label="Contact Us"
              systemImage="bubble.left.fill"
              modifiers={[tintM(PRIMARY)]}
              onPress={tap}
            />
            <ExpoButton
              label="About Mora"
              systemImage="info.circle.fill"
              modifiers={[tintM(PRIMARY)]}
              onPress={tap}
            />
            <ExpoButton
              label="Privacy Policy"
              systemImage="lock.shield.fill"
              modifiers={[tintM(PRIMARY)]}
              onPress={tap}
            />
          </Section>

          {/* ── Sign Out ── */}
          <Section>
            <ExpoButton
              role="destructive"
              label="Sign Out"
              systemImage="rectangle.portrait.and.arrow.right"
              onPress={() => { tap(); onLogout(); }}
            />
          </Section>
        </Form>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  titleBar: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: { fontFamily: "Cairo_700Bold", fontSize: 28, letterSpacing: -0.5 },
  subtitle: { fontFamily: "Cairo_500Medium", fontSize: 12, marginTop: 2 },
});
