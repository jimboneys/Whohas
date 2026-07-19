import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import { colors, fonts, spacing, radius, shadow } from "@/src/theme";

export type StorePrice = { store: string; price: number };
export type ProductCardData = { name: string; image: string; stores: StorePrice[] };

export default function ProductResult({ product }: { product: ProductCardData }) {
  const sorted = [...product.stores].sort((a, b) => a.price - b.price);
  const best = sorted[0];
  const highest = sorted[sorted.length - 1];
  const others = sorted.slice(1);
  const savings = highest.price - best.price;
  const pct = highest.price > 0 ? Math.round((savings / highest.price) * 100) : 0;

  // Request a crisp, retina-resolution photo when the source is an Unsplash URL.
  const hiRes = product.image
    ? product.image.replace(/([?&])w=\d+/, "$1w=1080").replace(/([?&])q=\d+/, "$1q=90")
    : product.image;

  return (
    <View style={styles.card} testID="product-result">
      <Image
        source={{ uri: hiRes }}
        style={styles.image}
        contentFit="cover"
        transition={250}
        cachePolicy="memory-disk"
      />
      <View style={styles.body}>
        <Text style={styles.name} testID="product-name" numberOfLines={2}>
          {product.name}
        </Text>

        <View style={styles.bestBox} testID="best-deal-box">
          <View style={styles.bestHeader}>
            <View style={styles.bestBadge}>
              <Ionicons name="trophy" size={12} color={colors.onSuccess} />
              <Text style={styles.bestBadgeText}>BEST DEAL</Text>
            </View>
            <Text style={styles.bestPrice} testID="best-deal-price">
              ${best.price.toFixed(2)}
            </Text>
          </View>
          <Text style={styles.bestStore}>{best.store}</Text>
          {savings > 0 && (
            <View style={styles.tipBox} testID="best-deal-tip">
              <Ionicons name="bulb" size={13} color={colors.onSuccess} />
              <Text style={styles.tipText}>
                Cheapest of {product.stores.length} stores — save ${savings.toFixed(2)} ({pct}%) vs {highest.store}
              </Text>
            </View>
          )}
        </View>

        {others.length > 0 && (
          <>
            <Text style={styles.label}>ALSO AVAILABLE</Text>
            {others.map((s, i) => (
              <View
                key={s.store}
                testID={`store-row-${i}`}
                style={[styles.row, i < others.length - 1 && styles.rowBorder]}
              >
                <Text style={styles.store}>{s.store}</Text>
                <Text style={styles.price} testID={`store-price-${i}`}>
                  ${s.price.toFixed(2)}
                </Text>
              </View>
            ))}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  image: { width: "100%", height: 220, backgroundColor: colors.surfaceTertiary },
  body: { padding: spacing.lg },
  name: { fontFamily: fonts.display, fontSize: 20, color: colors.onSurface },
  bestBox: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.success,
    padding: spacing.lg,
    marginTop: spacing.md,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 8,
  },
  bestHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  bestBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.success, borderRadius: radius.pill,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
  },
  bestBadgeText: { fontFamily: fonts.bodyExtra, fontSize: 10, letterSpacing: 0.5, color: colors.onSuccess },
  bestPrice: { fontFamily: fonts.display, fontSize: 26, color: "#07A37C" },
  bestStore: { fontFamily: fonts.bodyExtra, fontSize: 17, color: colors.onSurface, marginTop: spacing.xs },
  tipBox: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginTop: spacing.md,
  },
  tipText: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.onSuccess, lineHeight: 17 },
  label: {
    fontFamily: fonts.bodyExtra, fontSize: 11, letterSpacing: 1,
    color: colors.onSurfaceTertiary, marginTop: spacing.lg, marginBottom: spacing.xs,
  },
  row: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: spacing.md,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  store: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.onSurface },
  price: { fontFamily: fonts.bodyExtra, fontSize: 16, color: colors.onSurfaceTertiary },
});
