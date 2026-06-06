import React, { useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
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
import { HomeHeader } from "@/components/HomeHeader";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

const CATEGORIES = ["NEW IN", "WOMEN", "MEN", "BEAUTY", "SALE"];

const PRODUCTS = [
  {
    id: "1",
    title: "Oversized Blazer",
    brand: "Mora Studio",
    price: "89.99",
    originalPrice: "129.99",
    tag: "NEW",
    color: "#E8EDF5",
  },
  {
    id: "2",
    title: "Slim Fit Trousers",
    brand: "Mora Essentials",
    price: "49.99",
    originalPrice: null,
    tag: null,
    color: "#F0EBE3",
  },
  {
    id: "3",
    title: "Linen Shirt",
    brand: "Mora Studio",
    price: "39.99",
    originalPrice: "65.00",
    tag: "SALE",
    color: "#E8F0E8",
  },
  {
    id: "4",
    title: "Leather Tote",
    brand: "Mora Bags",
    price: "119.99",
    originalPrice: null,
    tag: "LIMITED",
    color: "#F5EDEB",
  },
  {
    id: "5",
    title: "Wide Leg Jeans",
    brand: "Mora Denim",
    price: "69.99",
    originalPrice: null,
    tag: "NEW",
    color: "#EBF0F5",
  },
  {
    id: "6",
    title: "Silk Camisole",
    brand: "Mora Studio",
    price: "44.99",
    originalPrice: "75.00",
    tag: "SALE",
    color: "#F5EBF5",
  },
];

const BANNERS = [
  { id: "1", title: "New Season\nArrived", subtitle: "Up to 40% off selected styles", cta: "SHOP NOW", bg: "#0274C1" },
  { id: "2", title: "Summer\nEdit", subtitle: "Fresh styles for warm days", cta: "EXPLORE", bg: "#1A1A1A" },
  { id: "3", title: "Members\nExclusive", subtitle: "Extra 15% off with code MORA15", cta: "JOIN NOW", bg: "#2E5FA3" },
];

type Product = {
  id: string;
  title: string;
  brand: string;
  price: string;
  originalPrice: string | null;
  tag: string | null;
  color: string;
};

function ProductCard({ item }: { item: Product }) {
  const colors = useColors();
  const [liked, setLiked] = useState(false);

  const handleLike = () => {
    setLiked((prev) => !prev);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.productCard,
        { opacity: pressed ? 0.95 : 1 },
      ]}
      testID={`product-${item.id}`}
    >
      <View style={[styles.productImage, { backgroundColor: item.color }]}>
        {item.tag && (
          <View
            style={[
              styles.productTag,
              {
                backgroundColor:
                  item.tag === "SALE"
                    ? "#E53935"
                    : item.tag === "LIMITED"
                    ? "#1A1A1A"
                    : colors.primary,
              },
            ]}
          >
            <Text style={styles.productTagText}>{item.tag}</Text>
          </View>
        )}
        <Pressable style={styles.likeBtn} onPress={handleLike}>
          <Feather
            name="heart"
            size={18}
            color={liked ? "#E53935" : "#1A1A1A"}
          />
        </Pressable>
        <View style={styles.productImagePlaceholder}>
          <Feather name="shopping-bag" size={40} color={colors.mutedForeground} />
        </View>
      </View>
      <View style={styles.productInfo}>
        <Text style={[styles.productBrand, { color: colors.mutedForeground }]}>
          {item.brand}
        </Text>
        <Text
          style={[styles.productTitle, { color: colors.foreground }]}
          numberOfLines={2}
        >
          {item.title}
        </Text>
        <View style={styles.priceRow}>
          <Text style={[styles.productPrice, { color: colors.foreground }]}>
            ${item.price}
          </Text>
          {item.originalPrice && (
            <Text
              style={[styles.originalPrice, { color: colors.mutedForeground }]}
            >
              ${item.originalPrice}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [activeCategory, setActiveCategory] = useState(0);
  const [activeBanner, setActiveBanner] = useState(0);

  const bottomPadding = isWeb ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <HomeHeader notificationCount={3} favoritesCount={5} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding + 80 }}
      >
        {/* Category Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.categoryScroll, { borderBottomColor: colors.border }]}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {CATEGORIES.map((cat, i) => (
            <Pressable
              key={cat}
              style={styles.categoryTab}
              onPress={() => setActiveCategory(i)}
            >
              <Text
                style={[
                  styles.categoryText,
                  {
                    color:
                      activeCategory === i
                        ? colors.foreground
                        : colors.mutedForeground,
                    fontFamily:
                      activeCategory === i
                        ? "Inter_700Bold"
                        : "Inter_500Medium",
                  },
                ]}
              >
                {cat}
              </Text>
              {activeCategory === i && (
                <View
                  style={[
                    styles.categoryUnderline,
                    { backgroundColor: colors.primary },
                  ]}
                />
              )}
            </Pressable>
          ))}
        </ScrollView>

        {/* Hero Banner */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setActiveBanner(idx);
          }}
        >
          {BANNERS.map((banner) => (
            <View
              key={banner.id}
              style={[styles.banner, { backgroundColor: banner.bg, width: SCREEN_WIDTH }]}
            >
              <View style={styles.bannerContent}>
                <Text style={styles.bannerTitle}>{banner.title}</Text>
                <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.bannerCta,
                    { opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Text style={styles.bannerCtaText}>{banner.cta}</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Dots */}
        <View style={styles.dotsRow}>
          {BANNERS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    activeBanner === i ? colors.primary : colors.border,
                  width: activeBanner === i ? 20 : 6,
                },
              ]}
            />
          ))}
        </View>

        {/* Products Grid Header */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            TRENDING NOW
          </Text>
          <Pressable>
            <Text style={[styles.seeAll, { color: colors.primary }]}>
              SEE ALL
            </Text>
          </Pressable>
        </View>

        {/* Products Grid */}
        <View style={styles.grid}>
          {PRODUCTS.map((product) => (
            <ProductCard key={product.id} item={product} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  categoryScroll: {
    borderBottomWidth: 1,
  },
  categoryTab: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    position: "relative",
    alignItems: "center",
  },
  categoryText: {
    fontSize: 13,
    letterSpacing: 0.5,
  },
  categoryUnderline: {
    position: "absolute",
    bottom: 0,
    left: 14,
    right: 14,
    height: 2,
  },
  banner: {
    height: 260,
    justifyContent: "flex-end",
  },
  bannerContent: {
    padding: 24,
    paddingBottom: 28,
  },
  bannerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
    color: "#FFFFFF",
    lineHeight: 38,
    marginBottom: 8,
  },
  bannerSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    marginBottom: 20,
  },
  bannerCta: {
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  bannerCtaText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: "#000000",
    letterSpacing: 1,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    letterSpacing: 1,
  },
  seeAll: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 16,
  },
  productCard: {
    width: CARD_WIDTH,
  },
  productImage: {
    width: "100%",
    height: CARD_WIDTH * 1.3,
    borderRadius: 2,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  productImagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  productTag: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 1,
  },
  productTagText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  likeBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 20,
    padding: 6,
    zIndex: 1,
  },
  productInfo: {
    paddingTop: 10,
    gap: 2,
  },
  productBrand: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  productTitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  productPrice: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  originalPrice: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    textDecorationLine: "line-through",
  },
});
