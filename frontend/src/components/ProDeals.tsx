import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";

import { colors, fonts, spacing, radius, shadow } from "@/src/theme";

const IMG = "?crop=entropy&cs=srgb&fm=jpg&q=90&w=800";

const DEALS = [
  { name: "Costco", tagline: "Members: rotisserie chicken $4.99", url: "https://www.costco.com", image: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6" + IMG },
  { name: "Whole Foods", tagline: "Prime: 30% off organic produce", url: "https://www.wholefoodsmarket.com", image: "https://images.unsplash.com/photo-1542838132-92c53300491e" + IMG },
];

export default function ProDeals({ pro, onUpgrade }: { pro: boolean; onUpgrade: () => void }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <View style={styles.titleRow}>
          <Ionicons name="ribbon" size={15} color={colors.brand} />
          <Text style={styles.title}>PRO DEALS</Text>
        </View>
        {!pro ? (
          <View style={styles.lockPill}>
            <Ionicons name="lock-closed" size={11} color={colors.onSurfaceTertiary} />
            <Text style={styles.lockPillText}>Pro only</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.row}>
        {DEALS.map((d) => (
          <View key={d.name} style={styles.box}>
            <Image source={{ uri: d.image }} style={styles.img} blurRadius={pro ? 0 : 14} />
            {pro ? (
              <View style={styles.body}>
                <Text style={styles.name} numberOfLines={1}>{d.name}</Text>
                <Text style={styles.tag} numberOfLines={2}>{d.tagline}</Text>
                <Pressable
                  style={styles.visit}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    WebBrowser.openBrowserAsync(d.url).catch(() => {});
                  }}
                  testID={`pro-deal-${d.name.replace(/\s+/g, "-")}`}
                >
                  <Text style={styles.visitText}>Visit</Text>
                  <Ionicons name="arrow-forward" size={13} color={colors.brand} />
                </Pressable>
              </View>
            ) : (
              <View style={styles.lockOverlay}>
                <Ionicons name="lock-closed" size={22} color="#FFFFFF" />
                <Text style={styles.lockText}>Pro deal</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {!pro ? (
        <Pressable style={styles.unlock} onPress={onUpgrade} testID="unlock-pro-deals">
          <Ionicons name="ribbon" size={16} color={colors.onBrand} />
          <Text style={styles.unlockText}>Unlock Pro Deals</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.xl },
  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: { fontFamily: fonts.bodyExtra, fontSize: 12, letterSpacing: 1, color: colors.onSurfaceTertiary },
  lockPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.surfaceTertiary, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  lockPillText: { fontFamily: fonts.bodyExtra, fontSize: 10, color: colors.onSurfaceTertiary },
  row: { flexDirection: "row", gap: spacing.md },
  box: { flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, overflow: "hidden", borderWidth: 1, borderColor: colors.border, ...shadow.soft },
  img: { width: "100%", height: 90, resizeMode: "cover", backgroundColor: colors.surfaceTertiary },
  body: { padding: spacing.md, gap: 3 },
  name: { fontFamily: fonts.display, fontSize: 15, color: colors.onSurface },
  tag: { fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 16, color: colors.onSurfaceTertiary },
  visit: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: spacing.xs },
  visitText: { fontFamily: fonts.bodyExtra, fontSize: 13, color: colors.brand },
  lockOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, height: 90,
    alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: "rgba(26,27,32,0.45)",
  },
  lockText: { fontFamily: fonts.bodyExtra, fontSize: 12, color: "#FFFFFF" },
  unlock: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: colors.brand, borderRadius: radius.pill, paddingVertical: spacing.md, marginTop: spacing.md, ...shadow.soft,
  },
  unlockText: { fontFamily: fonts.bodyExtra, fontSize: 14.5, color: colors.onBrand },
});
