import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { MoraLogo } from "@/components/MoraLogo";
import { useCart } from "@/context/CartContext";

export default function CartScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { items, updateQty, subtotal } = useCart();

  const topPadding = isWeb ? 0 : insets.top;
  const bottomPadding = isWeb ? 0 : insets.bottom;

  const delivery = subtotal > 50 ? 0 : 4.99;
  const total = subtotal + delivery;

  const handleQty = (productId: string, variantId: string, delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateQty(productId, variantId, delta);
  };

  if (items.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.header,
            { paddingTop: topPadding + 8, borderBottomColor: colors.border },
          ]}
        >
          <MoraLogo size="small" />
        </View>
        <View style={styles.emptyContainer}>
          <View
            style={[styles.emptyIconBg, { backgroundColor: colors.secondary }]}
          >
            <Feather name="shopping-bag" size={48} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Your bag is empty
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            Add items to your bag to get started
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.shopBtn,
              { backgroundColor: colors.foreground, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.shopBtnText}>CONTINUE SHOPPING</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPadding + 8, borderBottomColor: colors.border },
        ]}
      >
        <MoraLogo size="small" />
        <Text style={[styles.itemCount, { color: colors.mutedForeground }]}>
          {items.length} {items.length === 1 ? "item" : "items"}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding + 80 }}
      >
        {subtotal < 50 ? (
          <View style={[styles.deliveryBanner, { backgroundColor: colors.accent }]}>
            <Feather name="package" size={15} color={colors.primary} />
            <Text style={[styles.deliveryText, { color: colors.primary }]}>
              Spend ${(50 - subtotal).toFixed(2)} more for FREE delivery
            </Text>
          </View>
        ) : (
          <View style={[styles.deliveryBanner, { backgroundColor: "#E8F5E9" }]}>
            <Feather name="check-circle" size={15} color="#43A047" />
            <Text style={[styles.deliveryText, { color: "#43A047" }]}>
              You qualify for FREE delivery!
            </Text>
          </View>
        )}

        <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 16 }}>
          {items.map((item) => (
            <View
              key={`${item.productId}-${item.variantId}`}
              style={[styles.cartItem, { borderBottomColor: colors.border }]}
            >
              <View style={[styles.itemImage, { backgroundColor: colors.secondary }]}>
                <Feather name="shopping-bag" size={32} color={colors.mutedForeground} />
              </View>
              <View style={styles.itemDetails}>
                <Text style={[styles.itemBrand, { color: colors.mutedForeground }]}>
                  {item.vendor}
                </Text>
                <Text
                  style={[styles.itemTitle, { color: colors.foreground }]}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
                {(item.size || item.color) && (
                  <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>
                    {[item.size && `Size: ${item.size}`, item.color].filter(Boolean).join(" · ")}
                  </Text>
                )}
                <View style={styles.itemBottom}>
                  <Text style={[styles.itemPrice, { color: colors.foreground }]}>
                    ${(item.price * item.quantity).toFixed(2)}
                  </Text>
                  <View style={[styles.qtyRow, { borderColor: colors.border }]}>
                    <Pressable
                      onPress={() => handleQty(item.productId, item.variantId, -1)}
                      style={styles.qtyBtn}
                    >
                      <Feather
                        name={item.quantity === 1 ? "trash-2" : "minus"}
                        size={14}
                        color={item.quantity === 1 ? colors.destructive : colors.foreground}
                      />
                    </Pressable>
                    <Text style={[styles.qtyText, { color: colors.foreground }]}>
                      {item.quantity}
                    </Text>
                    <Pressable
                      onPress={() => handleQty(item.productId, item.variantId, 1)}
                      style={styles.qtyBtn}
                    >
                      <Feather name="plus" size={14} color={colors.foreground} />
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View
          style={[styles.summary, { marginHorizontal: 16, borderColor: colors.border }]}
        >
          <Text style={[styles.summaryTitle, { color: colors.foreground }]}>
            ORDER SUMMARY
          </Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
              Subtotal
            </Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              ${subtotal.toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
              Delivery
            </Text>
            <Text
              style={[
                styles.summaryValue,
                { color: delivery === 0 ? "#43A047" : colors.foreground },
              ]}
            >
              {delivery === 0 ? "FREE" : `$${delivery.toFixed(2)}`}
            </Text>
          </View>
          <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.foreground }]}>Total</Text>
            <Text style={[styles.totalValue, { color: colors.foreground }]}>
              ${total.toFixed(2)}
            </Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.checkoutBtn,
            {
              backgroundColor: colors.foreground,
              marginHorizontal: 16,
              marginTop: 16,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          testID="checkout-btn"
        >
          <Text style={styles.checkoutText}>PROCEED TO CHECKOUT</Text>
          <Feather name="arrow-right" size={18} color="#FFFFFF" />
        </Pressable>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemCount: { fontFamily: "Inter_500Medium", fontSize: 14 },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 22, textAlign: "center" },
  emptySubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  shopBtn: { marginTop: 12, paddingHorizontal: 28, paddingVertical: 14 },
  shopBtnText: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 1,
  },
  deliveryBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  deliveryText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  cartItem: {
    flexDirection: "row",
    gap: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  itemImage: {
    width: 90,
    height: 110,
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  itemDetails: { flex: 1, gap: 4 },
  itemBrand: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  itemTitle: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  itemMeta: { fontFamily: "Inter_400Regular", fontSize: 13 },
  itemBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  itemPrice: { fontFamily: "Inter_700Bold", fontSize: 16 },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 2,
  },
  qtyBtn: { padding: 8 },
  qtyText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    paddingHorizontal: 10,
  },
  summary: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 16,
    marginTop: 24,
    gap: 12,
  },
  summaryTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 1,
    marginBottom: 4,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { fontFamily: "Inter_400Regular", fontSize: 14 },
  summaryValue: { fontFamily: "Inter_500Medium", fontSize: 14 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: { fontFamily: "Inter_700Bold", fontSize: 15 },
  totalValue: { fontFamily: "Inter_700Bold", fontSize: 18 },
  checkoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    marginBottom: 8,
  },
  checkoutText: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    letterSpacing: 1,
  },
});
