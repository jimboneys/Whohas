import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";

import { colors, fonts, spacing, radius, shadow } from "@/src/theme";

export type StorePrice = { store: string; price: number };
export type ProductCardData = { name: string; image: string; stores: StorePrice[] };

export default function ProductResult({ product }: { product: ProductCardData }) {
  const prices = product.stores.map((s) => s.price);
  const min = Math.min(...prices);

  return (
    <View style={styles.card} testID="product-result">
      <Image
        source={{ uri: product.image }}
        style={styles.image}
        contentFit="cover"
        transition={200}
      />
      <View style={styles.body}>
        <Text style={styles.name} testID="product-name" numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.label}>PRICES AT 3 STORES</Text>
        {product.stores.map((s, i) => {
          const cheapest = s.price === min;
          return (
            <View
              key={s.store}
              testID={`store-row-${i}`}
              style={[styles.row, i < product.stores.length - 1 && styles.rowBorder]}
            >
              <Text style={styles.store}>{s.store}</Text>
              <View style={styles.priceWrap}>
                {cheapest && (
                  <View style={styles.lowestPill}>
                    <Text style={styles.lowestText}>LOWEST</Text>
                  </View>
                )}
                <Text
                  style={[styles.price, cheapest && styles.priceCheap]}
                  testID={`store-price-${i}`}
                >
                  ${s.price.toFixed(2)}
                </Text>
              </View>
            </View>
          );
        })}
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
  image: { width: "100%", height: 170, backgroundColor: colors.surfaceTertiary },
  body: { padding: spacing.lg },
  name: { fontFamily: fonts.display, fontSize: 20, color: colors.onSurface },
  label: {
    fontFamily: fonts.bodyExtra, fontSize: 11, letterSpacing: 1,
    color: colors.onSurfaceTertiary, marginTop: spacing.sm, marginBottom: spacing.xs,
  },
  row: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: spacing.md,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  store: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.onSurface },
  priceWrap: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  lowestPill: {
    backgroundColor: colors.success, borderRadius: radius.pill,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
  },
  lowestText: { fontFamily: fonts.bodyExtra, fontSize: 10, letterSpacing: 0.5, color: colors.onSuccess },
  price: { fontFamily: fonts.bodyExtra, fontSize: 16, color: colors.onSurfaceTertiary },
  priceCheap: { color: "#07A37C", fontSize: 18 },
});
