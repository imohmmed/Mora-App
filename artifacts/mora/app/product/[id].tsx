import React, { useState } from "react";
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { MoraLogo } from "@/components/MoraLogo";
import { FloatingTabBar } from "@/components/FloatingTabBar";
import { fetchProduct, fetchProducts, fetchContentSections } from "@/lib/api";
import { formatIQD } from "@/lib/format";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { LiquidGlassBg, isIOS26Plus } from "@/components/LiquidGlassBg";
import type { ContentSectionItem } from "@/lib/api";
import type { Variant, Product } from "@/lib/types";

const PRIMARY = "#0274C1";
const GOLD = "#C9922A";
const SILVER = "#7D8A9A";
const IS_IOS = Platform.OS === "ios";

let glassUIAvailable = false;
let ExpoUIHost: any, ExpoButton: any;
let glassEffectM: any, tintM: any, frameM: any;
try {
  const ui = require("@expo/ui/swift-ui");
  const mods = require("@expo/ui/swift-ui/modifiers");
  ExpoUIHost = ui.Host;
  ExpoButton = ui.Button;
  glassEffectM = mods.glassEffect;
  tintM = mods.tint;
  frameM = mods.frame;
  glassUIAvailable = true;
} catch {}

const CARD_COLORS = [
  "#E8EDF5", "#F0EBE3", "#E8F0E8", "#F5EDEB",
  "#EBF0F5", "#F5EBF5", "#FFF3E0", "#F0F0F0",
];

function cardColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CARD_COLORS[h % CARD_COLORS.length];
}

// ─── Accordion Section ─────────────────────────────────────────────────────────
function AccordionSection({
  title,
  children,
  colors,
  initialOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useColors>;
  initialOpen?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <View style={[styles.accordionWrap, { borderTopColor: colors.border }]}>
      <Pressable
        style={styles.accordionHeader}
        onPress={() => setOpen((o) => !o)}
      >
        <Text style={[styles.accordionTitle, { color: colors.foreground }]}>{title}</Text>
        <Feather
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.mutedForeground}
        />
      </Pressable>
      {open && <View style={styles.accordionBody}>{children}</View>}
    </View>
  );
}

// ─── Text Paragraph ────────────────────────────────────────────────────────────
function TextParagraph({
  item,
  colors,
  isBold,
}: {
  item: ContentSectionItem;
  colors: ReturnType<typeof useColors>;
  isBold?: boolean;
}) {
  const content = item.text ?? item.name ?? "";
  if (!content) return null;
  return (
    <Text
      style={[
        styles.textParagraph,
        { color: isBold ? colors.foreground : colors.mutedForeground },
        isBold && { fontFamily: "Inter_600SemiBold" },
      ]}
    >
      {content}
    </Text>
  );
}

// ─── Related Product Card ──────────────────────────────────────────────────────
function RelatedCard({
  product,
  colors,
}: {
  product: Product;
  colors: ReturnType<typeof useColors>;
}) {
  const router = useRouter();
  const bg = cardColor(product.id);
  const hasDiscount =
    product.comparePrice != null && product.comparePrice > product.price;
  const discountPct = hasDiscount
    ? Math.round(
        ((product.comparePrice! - product.price) / product.comparePrice!) * 100
      )
    : 0;

  return (
    <Pressable
      style={[styles.relatedCard, { backgroundColor: colors.background, borderColor: colors.border }]}
      onPress={() => router.push(`/product/${product.id}`)}
    >
      <View style={[styles.relatedImg, { backgroundColor: bg }]}>
        <Image
          source={{ uri: product.images?.[0] }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
        {discountPct > 0 && (
          <View style={styles.relatedDisc}>
            <Text style={styles.relatedDiscText}>-{discountPct}%</Text>
          </View>
        )}
      </View>
      <View style={styles.relatedInfo}>
        <Text style={[styles.relatedTitle, { color: colors.foreground }]} numberOfLines={2}>
          {product.title}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={[styles.relatedPrice, { color: PRIMARY }]}>
            {formatIQD(product.price)}
          </Text>
          {hasDiscount && (
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: "#E53935", textDecorationLine: "line-through" }}>
              {formatIQD(product.comparePrice!)}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function ProductDetailSkeleton({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <>
      <View style={[styles.imageBox, { backgroundColor: "#F0F0F0" }]} />
      <View style={{ padding: 20, gap: 14 }}>
        <View style={{ height: 12, width: 80, backgroundColor: "#E8E8E8", borderRadius: 4 }} />
        <View style={{ height: 20, width: "80%", backgroundColor: "#E8E8E8", borderRadius: 4 }} />
        <View style={{ height: 20, width: 100, backgroundColor: "#E8E8E8", borderRadius: 4 }} />
        <View style={{ height: 12, width: "60%", backgroundColor: "#E8E8E8", borderRadius: 4 }} />
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          {[60, 60, 60, 60].map((w, i) => (
            <View key={i} style={{ height: 44, width: w, backgroundColor: "#E8E8E8", borderRadius: 4 }} />
          ))}
        </View>
      </View>
    </>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { addItem, totalItems } = useCart();
  const { isWishlisted, toggle } = useWishlist();
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [added, setAdded] = useState(false);

  const topPadding = isWeb ? 0 : insets.top;
  const bottomPadding = isWeb ? 0 : insets.bottom;

  const { data: product, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchProduct(id!),
    enabled: !!id,
  });

  const { data: contentSections } = useQuery({
    queryKey: ["content-sections"],
    queryFn: fetchContentSections,
    staleTime: 300_000,
  });

  const { data: relatedData } = useQuery({
    queryKey: ["related-products", product?.category],
    queryFn: () => fetchProducts({ category: product?.category, limit: 10 }),
    enabled: !!product?.category,
    staleTime: 120_000,
  });

  const liked = product ? isWishlisted(product.id) : false;
  const activeVariant = selectedVariant ?? (product?.variants?.[0] ?? null);
  const price = activeVariant?.price ?? product?.price ?? 0;
  const comparePrice = product?.comparePrice;
  const hasDiscount = comparePrice != null && comparePrice > price;
  const bg = product ? cardColor(product.id) : "#F0F0F0";
  const imageUri = product?.images?.[0];

  const warranty = contentSections?.warranty;
  const testimonials = contentSections?.testimonials;
  const relatedProducts = (relatedData?.products ?? [])
    .filter((p) => p.id !== id)
    .slice(0, 8);

  const handleAddToCart = () => {
    if (!product) return;
    const variant = activeVariant ?? product.variants?.[0];
    addItem({
      productId: product.id,
      variantId: variant?.id ?? product.id,
      title: product.title,
      vendor: product.vendor ?? "Mora",
      price: variant?.price ?? product.price,
      quantity: 1,
      size: variant?.option1,
      color: variant?.option2,
      image: imageUri,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 8,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        {isIOS26Plus ? (
          <Pressable
            onPress={() => router.back()}
            style={styles.glassIconBtn}
            testID="back-btn"
          >
            <LiquidGlassBg />
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </Pressable>
        ) : (
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
            testID="back-btn"
          >
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
        )}
        <MoraLogo size="small" />
        {isIOS26Plus ? (
          <Pressable
            onPress={() => router.push("/(tabs)/cart")}
            style={styles.glassIconBtn}
            testID="cart-header-btn"
          >
            <LiquidGlassBg />
            <Feather name="shopping-bag" size={20} color={colors.foreground} />
            {totalItems > 0 && (
              <View style={[styles.cartBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.cartBadgeText}>{totalItems > 9 ? "9+" : totalItems}</Text>
              </View>
            )}
          </Pressable>
        ) : (
          <Pressable
            onPress={() => router.push("/(tabs)/cart")}
            style={styles.cartHeaderBtn}
            testID="cart-header-btn"
          >
            <Feather name="shopping-bag" size={22} color={colors.foreground} />
            {totalItems > 0 && (
              <View style={[styles.cartBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.cartBadgeText}>{totalItems > 9 ? "9+" : totalItems}</Text>
              </View>
            )}
          </Pressable>
        )}
      </View>

      {/* ── Content ── */}
      {isLoading ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPadding + 100 }}>
          <ProductDetailSkeleton colors={colors} />
        </ScrollView>
      ) : isError ? (
        <View style={styles.errorBox}>
          <Feather name="wifi-off" size={40} color={colors.border} />
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
            Could not load product
          </Text>
          <Pressable
            onPress={() => refetch()}
            style={[styles.retryBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.retryText, { color: colors.foreground }]}>Retry</Text>
          </Pressable>
        </View>
      ) : product ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: (isWeb ? 100 : bottomPadding + 32) }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={PRIMARY} />
          }
        >
          {/* ── Product Image ── */}
          <View style={[styles.imageBox, { backgroundColor: bg }]}>
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={300}
              />
            ) : (
              <Feather name="shopping-bag" size={80} color={colors.mutedForeground} />
            )}
            <Pressable
              style={styles.wishlistBtnWrap}
              onPress={() => {
                toggle(product.id);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              {isIOS26Plus ? (
                <View style={styles.wishlistBtnGlass}>
                  <LiquidGlassBg />
                  <Feather name="heart" size={22} color={liked ? "#E53935" : "#FFF"} />
                </View>
              ) : (
                <View style={[styles.wishlistBtnFallback, { backgroundColor: "rgba(255,255,255,0.9)" }]}>
                  <Feather name="heart" size={22} color={liked ? "#E53935" : "#1A1A1A"} />
                </View>
              )}
            </Pressable>
          </View>

          {/* ── Info ── */}
          <View style={styles.infoSection}>
            <Text style={[styles.vendor, { color: colors.mutedForeground }]}>
              {product.vendor ?? "Mora"}
            </Text>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {product.title}
            </Text>
            <View style={styles.priceRow}>
              <Text style={[styles.price, { color: colors.foreground }]}>
                {formatIQD(price)}
              </Text>
              {hasDiscount && (
                <>
                  <Text style={[styles.comparePrice, { color: "#E53935" }]}>
                    {formatIQD(comparePrice!)}
                  </Text>
                  <View style={[styles.saleBadge, { backgroundColor: "#E53935" }]}>
                    <Text style={styles.saleBadgeText}>SALE</Text>
                  </View>
                </>
              )}
            </View>

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <View style={styles.tagsRow}>
                {product.tags.slice(0, 4).map((tag) => (
                  <View
                    key={tag}
                    style={[styles.tag, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                  >
                    <Text style={[styles.tagText, { color: colors.mutedForeground }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* ── Variants / SIZE ── */}
          {product.variants && product.variants.length > 1 && (
            <View style={[styles.variantsSection, { borderTopColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
                {product.variants[0]?.option1 ? "SIZE" : "OPTIONS"}
              </Text>
              <View style={styles.variantsRow}>
                {IS_IOS && glassUIAvailable
                  ? product.variants.map((v) => {
                      const isActive = activeVariant?.id === v.id;
                      const outOfStock = v.inventory <= 0;
                      return (
                        <ExpoUIHost key={v.id} matchContents style={{ height: 44, opacity: outOfStock ? 0.35 : 1 }}>
                          <ExpoButton
                            label={v.option1 ?? v.title}
                            onPress={() => {
                              if (!outOfStock) {
                                setSelectedVariant(v);
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              }
                            }}
                            modifiers={[
                              glassEffectM({
                                glass: {
                                  variant: "regular",
                                  interactive: !outOfStock,
                                  tint: isActive ? "#1A1A1A" : undefined,
                                },
                                shape: "roundedRectangle",
                              }),
                              tintM(isActive ? "#FFFFFF" : colors.foreground),
                            ]}
                          />
                        </ExpoUIHost>
                      );
                    })
                  : product.variants.map((v) => {
                      const isActive = activeVariant?.id === v.id;
                      const outOfStock = v.inventory <= 0;
                      return (
                        <Pressable
                          key={v.id}
                          style={[
                            styles.variantChip,
                            {
                              borderColor: isActive ? colors.foreground : colors.border,
                              backgroundColor: isActive ? colors.foreground : colors.background,
                              opacity: outOfStock ? 0.4 : 1,
                            },
                          ]}
                          onPress={() => {
                            if (!outOfStock) {
                              setSelectedVariant(v);
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }
                          }}
                          disabled={outOfStock}
                        >
                          <Text style={[styles.variantText, { color: isActive ? colors.background : colors.foreground }]}>
                            {v.option1 ?? v.title}
                          </Text>
                        </Pressable>
                      );
                    })
                }
              </View>
            </View>
          )}

          {/* ── Add to Bag ── */}
          <View style={[styles.addBagSection, { borderTopColor: colors.border }]}>
            {IS_IOS && glassUIAvailable ? (
              <ExpoUIHost style={{ height: 56 }}>
                <ExpoButton
                  label={added ? "ADDED TO BAG" : "ADD TO BAG"}
                  onPress={handleAddToCart}
                  modifiers={[
                    frameM({ maxWidth: 10000, height: 54 }),
                    glassEffectM({
                      glass: {
                        variant: "regular",
                        interactive: true,
                        tint: added ? "#43A047" : PRIMARY,
                      },
                      shape: "roundedRectangle",
                    }),
                    tintM("#FFFFFF"),
                  ]}
                />
              </ExpoUIHost>
            ) : (
              <Pressable
                style={({ pressed }) => [
                  styles.addBtn,
                  { backgroundColor: added ? "#43A047" : PRIMARY, opacity: pressed ? 0.9 : 1 },
                ]}
                onPress={handleAddToCart}
                testID="add-to-bag-btn"
              >
                <Feather name={added ? "check" : "shopping-bag"} size={18} color="#FFFFFF" />
                <Text style={styles.addBtnText}>
                  {added ? "ADDED TO BAG" : "ADD TO BAG"}
                </Text>
              </Pressable>
            )}

            {/* Delivery info */}
            <View style={[styles.deliveryRow, { borderColor: colors.border }]}>
              <Feather name="package" size={14} color={PRIMARY} />
              <Text style={[styles.deliveryText, { color: colors.mutedForeground }]}>
                Free delivery on orders over 100,000 IQD
              </Text>
            </View>
          </View>

          {/* ── Description (accordion) ── */}
          {!!product.description && (
            <AccordionSection title="DESCRIPTION" colors={colors} initialOpen={true}>
              <Text style={[styles.descText, { color: colors.mutedForeground }]}>
                {product.description}
              </Text>
            </AccordionSection>
          )}

          {/* ── Warranty ── */}
          {warranty && warranty.items.length > 0 && (
            <AccordionSection title={warranty.title || "WARRANTY"} colors={colors}>
              <View style={styles.textSection}>
                {warranty.items.map((item) => (
                  <TextParagraph key={item.id} item={item} colors={colors} />
                ))}
              </View>
            </AccordionSection>
          )}

          {/* ── Star Customers ── */}
          {testimonials && testimonials.items.length > 0 && (
            <AccordionSection title={testimonials.title || "STAR CUSTOMERS ⭐"} colors={colors}>
              <View style={styles.textSection}>
                {testimonials.items.map((item, i) => (
                  <TextParagraph key={item.id} item={item} colors={colors} isBold={i === 0} />
                ))}
              </View>
            </AccordionSection>
          )}

          {/* ── Related Products ── */}
          {relatedProducts.length > 0 && (
            <View style={[styles.sectionWrap, { borderTopColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
                RELATED PRODUCTS
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, gap: 12 }}
              >
                {relatedProducts.map((p) => (
                  <RelatedCard key={p.id} product={p} colors={colors} />
                ))}
              </ScrollView>
            </View>
          )}
        </ScrollView>
      ) : null}

      {/* ── Floating Tab Bar (web only) ── */}
      <FloatingTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  cartHeaderBtn: { padding: 4, position: "relative" },
  cartBadge: {
    position: "absolute", top: 0, right: 0,
    minWidth: 16, height: 16, borderRadius: 8,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
  },
  cartBadgeText: { color: "#FFFFFF", fontSize: 10, fontFamily: "Inter_700Bold" },

  /* Error */
  errorBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 14 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderWidth: 1, borderRadius: 4 },
  retryText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },

  /* Image */
  imageBox: {
    height: 360,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  wishlistBtnWrap: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
  },
  glassIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  wishlistBtnGlass: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  wishlistBtnFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  wishlistBtn: {
    position: "absolute", top: 16, right: 16,
    borderRadius: 24, padding: 10, zIndex: 1,
  },

  /* Info */
  infoSection: { padding: 20, gap: 10 },
  vendor: { fontFamily: "Inter_500Medium", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" },
  title: { fontFamily: "Inter_700Bold", fontSize: 22, lineHeight: 28 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 2 },
  price: { fontFamily: "Inter_700Bold", fontSize: 22 },
  comparePrice: { fontFamily: "Inter_400Regular", fontSize: 16, textDecorationLine: "line-through" },
  saleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 2 },
  saleBadgeText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 0.5 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 2 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, borderWidth: 1 },
  tagText: { fontFamily: "Inter_400Regular", fontSize: 12 },

  /* Variants */
  variantsSection: { paddingHorizontal: 20, paddingVertical: 16, gap: 12, borderTopWidth: 1 },
  variantsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  variantChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 4, borderWidth: 1.5 },
  variantText: { fontFamily: "Inter_500Medium", fontSize: 14 },

  /* Add to Bag */
  addBagSection: { paddingHorizontal: 16, paddingVertical: 16, gap: 12, borderTopWidth: 1 },
  addBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 16, borderRadius: 4,
  },
  addBtnText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 14, letterSpacing: 1 },
  deliveryRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingTop: 12, borderTopWidth: 1,
  },
  deliveryText: { fontFamily: "Inter_400Regular", fontSize: 12, flex: 1 },

  /* Accordion */
  accordionWrap: { borderTopWidth: 1 },
  accordionHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 16,
  },
  accordionTitle: { fontFamily: "Inter_700Bold", fontSize: 13, letterSpacing: 0.8 },
  accordionBody: { paddingHorizontal: 20, paddingBottom: 16 },
  descText: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 22 },

  /* Text sections (warranty / star customers) */
  textSection: { gap: 10 },
  textParagraph: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 22 },

  /* Section wrapper */
  sectionWrap: { paddingVertical: 16, borderTopWidth: 1, gap: 12 },
  sectionLabel: { fontFamily: "Inter_700Bold", fontSize: 13, letterSpacing: 0.8, paddingHorizontal: 20 },

  /* Related Products */
  relatedCard: {
    width: 140, borderRadius: 8, borderWidth: 1, overflow: "hidden",
  },
  relatedImg: { width: 140, height: 170, alignItems: "center", justifyContent: "center", position: "relative" },
  relatedDisc: {
    position: "absolute", top: 8, left: 8,
    backgroundColor: "#E53935", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3,
  },
  relatedDiscText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 10 },
  relatedInfo: { padding: 10, gap: 4 },
  relatedTitle: { fontFamily: "Inter_500Medium", fontSize: 12, lineHeight: 16 },
  relatedPrice: { fontFamily: "Inter_700Bold", fontSize: 12 },
});
