import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";

const PRIMARY = "#0274C1";

// @expo/ui requires a custom dev build — not available in Expo Go.
let glassAvailable = false;
let Host: any, Form: any, Section: any, Label: any, Picker: any;
let Slider: any, Stepper: any, UISwitch: any, UIText: any, ExpoButton: any;
let tagM: any, tintM: any;
try {
  const ui = require("@expo/ui/swift-ui");
  const mods = require("@expo/ui/swift-ui/modifiers");
  ({ Host, Form, Section, Label, Picker, Slider, Stepper, Switch: UISwitch, Text: UIText, Button: ExpoButton } = ui);
  ({ tag: tagM, tint: tintM } = mods);
  glassAvailable = true;
} catch {}

export function AccountExpoUI() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [faceId, setFaceId] = useState(true);
  const [currency, setCurrency] = useState<string>("USD");
  const [size, setSize] = useState<string>("M");
  const [priceAlert, setPriceAlert] = useState(120);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const tapHaptic = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  if (!glassAvailable) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.titleBar,
          { paddingTop: insets.top + 10, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Account</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Native iOS · Liquid Glass
        </Text>
      </View>

      <Host style={{ flex: 1 }} useViewportSizeMeasurement>
        <Form>
          <Section>
            <Label title="Ahmad M." systemImage="person.crop.circle.fill" color={PRIMARY} />
            <UIText>ahmad@example.com</UIText>
            <ExpoButton label="Edit Profile" systemImage="square.and.pencil" modifiers={[tintM(PRIMARY)]} onPress={tapHaptic} />
          </Section>

          <Section title="My Account">
            <ExpoButton label="My Orders" systemImage="shippingbox.fill" modifiers={[tintM(PRIMARY)]} onPress={tapHaptic} />
            <ExpoButton label="Wishlist" systemImage="heart.fill" modifiers={[tintM(PRIMARY)]} onPress={tapHaptic} />
            <ExpoButton label="Returns & Refunds" systemImage="arrow.uturn.backward" modifiers={[tintM(PRIMARY)]} onPress={tapHaptic} />
            <ExpoButton label="Addresses" systemImage="mappin.and.ellipse" modifiers={[tintM(PRIMARY)]} onPress={tapHaptic} />
            <ExpoButton label="Payment Methods" systemImage="creditcard.fill" modifiers={[tintM(PRIMARY)]} onPress={tapHaptic} />
          </Section>

          <Section title="Preferences" footer="Manage how Mora communicates with you.">
            <UISwitch value={pushNotifications} onValueChange={setPushNotifications} label="Push Notifications" color={PRIMARY} />
            <UISwitch value={emailUpdates} onValueChange={setEmailUpdates} label="Email Updates" color={PRIMARY} />
            <UISwitch value={darkMode} onValueChange={setDarkMode} label="Dark Mode" color={PRIMARY} />
            <UISwitch value={faceId} onValueChange={setFaceId} label="Unlock with Face ID" color={PRIMARY} />
            <Picker label="Currency" selection={currency} onSelectionChange={(v: string) => setCurrency(v)}>
              <UIText modifiers={[tagM("USD")]}>USD $</UIText>
              <UIText modifiers={[tagM("EUR")]}>EUR €</UIText>
              <UIText modifiers={[tagM("GBP")]}>GBP £</UIText>
              <UIText modifiers={[tagM("IQD")]}>IQD ع.د</UIText>
            </Picker>
          </Section>

          <Section title="Shopping" footer={`Notify me when items drop below $${priceAlert}. Show ${itemsPerPage} items per page.`}>
            <Picker label="Default Size" selection={size} onSelectionChange={(v: string) => setSize(v)}>
              <UIText modifiers={[tagM("XS")]}>XS</UIText>
              <UIText modifiers={[tagM("S")]}>S</UIText>
              <UIText modifiers={[tagM("M")]}>M</UIText>
              <UIText modifiers={[tagM("L")]}>L</UIText>
              <UIText modifiers={[tagM("XL")]}>XL</UIText>
            </Picker>
            <Slider value={priceAlert} min={0} max={500} step={10} onValueChange={(v: number) => setPriceAlert(Math.round(v))} label={<UIText>Price alert: ${priceAlert}</UIText>} />
            <Stepper label="Items per page" defaultValue={20} min={10} max={50} step={10} onValueChanged={(v: number) => setItemsPerPage(v)} />
          </Section>

          <Section title="Support">
            <ExpoButton label="Help & FAQs" systemImage="questionmark.circle.fill" modifiers={[tintM(PRIMARY)]} onPress={tapHaptic} />
            <ExpoButton label="Contact Us" systemImage="bubble.left.fill" modifiers={[tintM(PRIMARY)]} onPress={tapHaptic} />
            <ExpoButton label="About Mora" systemImage="info.circle.fill" modifiers={[tintM(PRIMARY)]} onPress={tapHaptic} />
            <ExpoButton label="Privacy Policy" systemImage="lock.shield.fill" modifiers={[tintM(PRIMARY)]} onPress={tapHaptic} />
          </Section>

          <Section>
            <ExpoButton role="destructive" label="Sign Out" systemImage="rectangle.portrait.and.arrow.right" onPress={tapHaptic} />
          </Section>
        </Form>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  titleBar: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontFamily: "Inter_700Bold", fontSize: 28, letterSpacing: -0.5 },
  subtitle: { fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 2 },
});
