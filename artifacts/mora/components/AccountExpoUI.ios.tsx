import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Button,
  Form,
  Host,
  Label,
  Picker,
  Section,
  Slider,
  Stepper,
  Switch,
  Text as UIText,
} from "@expo/ui/swift-ui";
import { tag, tint } from "@expo/ui/swift-ui/modifiers";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";

const PRIMARY = "#0274C1";

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

  const tapHaptic = () =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.titleBar,
          {
            paddingTop: insets.top + 10,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>
          Account
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Native iOS · Liquid Glass
        </Text>
      </View>

      <Host style={{ flex: 1 }} useViewportSizeMeasurement>
        <Form>
          {/* Profile */}
          <Section>
            <Label
              title="Ahmad M."
              systemImage="person.crop.circle.fill"
              color={PRIMARY}
            />
            <UIText>ahmad@example.com</UIText>
            <Button
              label="Edit Profile"
              systemImage="square.and.pencil"
              modifiers={[tint(PRIMARY)]}
              onPress={tapHaptic}
            />
          </Section>

          {/* My Account */}
          <Section title="My Account">
            <Button
              label="My Orders"
              systemImage="shippingbox.fill"
              modifiers={[tint(PRIMARY)]}
              onPress={tapHaptic}
            />
            <Button
              label="Wishlist"
              systemImage="heart.fill"
              modifiers={[tint(PRIMARY)]}
              onPress={tapHaptic}
            />
            <Button
              label="Returns & Refunds"
              systemImage="arrow.uturn.backward"
              modifiers={[tint(PRIMARY)]}
              onPress={tapHaptic}
            />
            <Button
              label="Addresses"
              systemImage="mappin.and.ellipse"
              modifiers={[tint(PRIMARY)]}
              onPress={tapHaptic}
            />
            <Button
              label="Payment Methods"
              systemImage="creditcard.fill"
              modifiers={[tint(PRIMARY)]}
              onPress={tapHaptic}
            />
          </Section>

          {/* Preferences */}
          <Section
            title="Preferences"
            footer="Manage how Mora communicates with you."
          >
            <Switch
              value={pushNotifications}
              onValueChange={setPushNotifications}
              label="Push Notifications"
              color={PRIMARY}
            />
            <Switch
              value={emailUpdates}
              onValueChange={setEmailUpdates}
              label="Email Updates"
              color={PRIMARY}
            />
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              label="Dark Mode"
              color={PRIMARY}
            />
            <Switch
              value={faceId}
              onValueChange={setFaceId}
              label="Unlock with Face ID"
              color={PRIMARY}
            />
            <Picker
              label="Currency"
              selection={currency}
              onSelectionChange={(v) => setCurrency(v)}
            >
              <UIText modifiers={[tag("USD")]}>USD $</UIText>
              <UIText modifiers={[tag("EUR")]}>EUR €</UIText>
              <UIText modifiers={[tag("GBP")]}>GBP £</UIText>
              <UIText modifiers={[tag("IQD")]}>IQD ع.د</UIText>
            </Picker>
          </Section>

          {/* Shopping preferences */}
          <Section
            title="Shopping"
            footer={`Notify me when items drop below $${priceAlert}. Show ${itemsPerPage} items per page.`}
          >
            <Picker
              label="Default Size"
              selection={size}
              onSelectionChange={(v) => setSize(v)}
            >
              <UIText modifiers={[tag("XS")]}>XS</UIText>
              <UIText modifiers={[tag("S")]}>S</UIText>
              <UIText modifiers={[tag("M")]}>M</UIText>
              <UIText modifiers={[tag("L")]}>L</UIText>
              <UIText modifiers={[tag("XL")]}>XL</UIText>
            </Picker>
            <Slider
              value={priceAlert}
              min={0}
              max={500}
              step={10}
              onValueChange={(v) => setPriceAlert(Math.round(v))}
              label={<UIText>Price alert: ${priceAlert}</UIText>}
            />
            <Stepper
              label="Items per page"
              defaultValue={20}
              min={10}
              max={50}
              step={10}
              onValueChanged={(v) => setItemsPerPage(v)}
            />
          </Section>

          {/* Support */}
          <Section title="Support">
            <Button
              label="Help & FAQs"
              systemImage="questionmark.circle.fill"
              modifiers={[tint(PRIMARY)]}
              onPress={tapHaptic}
            />
            <Button
              label="Contact Us"
              systemImage="bubble.left.fill"
              modifiers={[tint(PRIMARY)]}
              onPress={tapHaptic}
            />
            <Button
              label="About Mora"
              systemImage="info.circle.fill"
              modifiers={[tint(PRIMARY)]}
              onPress={tapHaptic}
            />
            <Button
              label="Privacy Policy"
              systemImage="lock.shield.fill"
              modifiers={[tint(PRIMARY)]}
              onPress={tapHaptic}
            />
          </Section>

          {/* Sign out */}
          <Section>
            <Button
              role="destructive"
              label="Sign Out"
              systemImage="rectangle.portrait.and.arrow.right"
              onPress={tapHaptic}
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
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginTop: 2,
  },
});
