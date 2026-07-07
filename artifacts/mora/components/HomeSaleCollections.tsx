import { useQuery } from "@tanstack/react-query";
import { View, Text, Pressable, ScrollView, Dimensions, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";
import { fetchSaleCollections, type SaleCollection } from "@/lib/api";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = (SCREEN_W - 21) / 2;
const CARD_H = CARD_W * (16 / 9);

function SaleCard({ col }: { col: SaleCollection }) {
  const router = useRouter();
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const title = isAr && col.titleAr ? col.titleAr : col.title;
  const desc = isAr && col.descriptionAr ? col.descriptionAr : col.description;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.9 : 1 }]}
      onPress={() => router.push(`/sale-collection/${col.id}` as any)}
    >
      {col.image ? (
        <Image source={{ uri: col.image }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "#1a1a2e" }]} />
      )}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.72)"]}
        style={[StyleSheet.absoluteFill, { justifyContent: "flex-end" }]}
      >
        <View style={styles.textWrap}>
          {!!title && (
            <Text style={styles.cardTitle} numberOfLines={2}>
              {title}
            </Text>
          )}
          {!!desc && (
            <Text style={styles.cardDesc} numberOfLines={2}>
              {desc}
            </Text>
          )}
          <View style={styles.shopBtn}>
            <Text style={styles.shopBtnText}>{isAr ? "تسوق الآن" : "SHOP NOW"}</Text>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export function HomeSaleCollections() {
  const colors = useColors();
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  const { data: collections } = useQuery({
    queryKey: ["sale-collections"],
    queryFn: fetchSaleCollections,
    staleTime: 120_000,
  });

  if (!collections?.length) return null;

  return (
    <View style={styles.container}>
      <View style={[styles.header, isAr && { flexDirection: "row-reverse" }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {isAr ? "كولكشنات التخفيضات" : "SALE COLLECTIONS"}
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        snapToInterval={CARD_W + 1}
        contentInsetAdjustmentBehavior="never"
        decelerationRate="fast"
      >
        {collections.map((col) => (
          <SaleCard key={col.id} col={col} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 24, marginBottom: 0 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    letterSpacing: 1.2,
  },
  scroll: { gap: 1, paddingHorizontal: 10 },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 0,
    overflow: "hidden",
    backgroundColor: "#222",
  },
  textWrap: { padding: 14, alignItems: "center", gap: 4 },
  cardTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  cardDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },
  shopBtn: {
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    borderRadius: 20,
  },
  shopBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: "#FFFFFF",
    letterSpacing: 0.8,
  },
});
