import { View, Text, StyleSheet, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { colors, fonts, spacing, radius, shadow } from "@/src/theme";

const ADVERTISE_EMAIL = "advertise@whohas.app";

type Slot = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  tint: string;
};

const FEATURED: Slot = {
  key: "deal",
  label: "Deal of the Day",
  icon: "flash",
  accent: colors.brand,
  tint: colors.brandTertiary,
};

const SMALL: Slot[] = [
  { key: "sponsor", label: "Sponsor", icon: "star", accent: colors.success, tint: colors.successSoft },
  { key: "weekly", label: "This Week", icon: "calendar", accent: "#118AB2", tint: "#E3F2F7" },
  { key: "flash", label: "Flash Sale", icon: "flame", accent: "#FF8C42", tint: "#FFE8D6" },
  { key: "local", label: "Local Hero", icon: "location", accent: "#EF476F", tint: "#FDE0E8" },
  { key: "coupon", label: "Coupon", icon: "pricetag", accent: "#7B61FF", tint: "#ECE6FF" },
];

function openAdvertise(slot: string) {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  const subject = encodeURIComponent(`WhoHas ad slot: ${slot}`);
  const body = encodeURIComponent(
    `Hi! I'd like to advertise in the "${slot}" spot on WhoHas ($75). Here are my details:`
  );
  Linking.openURL(`mailto:${ADVERTISE_EMAIL}?subject=${subject}&body=${body}`).catch(() => {});
}

export default function AdSlots() {
  return (
    <>
      <View style={styles.headRow}>
        <Text style={styles.sectionLabel}>PARTNER SPOTS</Text>
        <View style={styles.availPill}>
          <View style={styles.dot} />
          <Text style={styles.availText}>Open</Text>
        </View>
      </View>

      {/* Featured — Deal of the Day */}
      <Pressable
        testID={`ad-slot-${FEATURED.key}`}
        style={({ pressed }) => [styles.featured, { borderColor: FEATURED.accent }, pressed && { opacity: 0.92 }]}
        onPress={() => openAdvertise(FEATURED.label)}
      >
        <View style={[styles.iconBadge, { backgroundColor: FEATURED.tint }]}>
          <Ionicons name={FEATURED.icon} size={22} color={FEATURED.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.featuredLabel}>{FEATURED.label}</Text>
          <Text style={styles.featuredCta}>Advertise here</Text>
        </View>
        <View style={[styles.pricePill, { backgroundColor: FEATURED.accent }]}>
          <Text style={styles.priceText}>$75</Text>
        </View>
      </Pressable>

      {/* Two smaller boxes */}
      <View style={styles.smallRow}>
        {SMALL.map((s) => (
          <Pressable
            key={s.key}
            testID={`ad-slot-${s.key}`}
            style={({ pressed }) => [styles.smallCard, { borderColor: s.accent }, pressed && { opacity: 0.92 }]}
            onPress={() => openAdvertise(s.label)}
          >
            <View style={[styles.iconBadge, { backgroundColor: s.tint }]}>
              <Ionicons name={s.icon} size={18} color={s.accent} />
            </View>
            <Text style={styles.smallLabel}>{s.label}</Text>
            <Text style={styles.smallCta}>Advertise here</Text>
            <View style={[styles.pricePillSm, { backgroundColor: s.accent }]}>
              <Text style={styles.priceTextSm}>$75</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  headRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: spacing.xl, marginBottom: spacing.md,
  },
  sectionLabel: {
    fontFamily: fonts.bodyExtra, fontSize: 12, letterSpacing: 1, color: colors.onSurfaceTertiary,
  },
  availPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: colors.successSoft, borderRadius: radius.pill,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  availText: { fontFamily: fonts.bodyExtra, fontSize: 11, color: colors.onSuccess },
  featured: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    padding: spacing.lg, borderWidth: 2, borderStyle: "dashed", ...shadow.soft,
  },
  iconBadge: {
    width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center",
  },
  featuredLabel: { fontFamily: fonts.display, fontSize: 17, color: colors.onSurface },
  featuredCta: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.onSurfaceTertiary, marginTop: 1 },
  pricePill: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  priceText: { fontFamily: fonts.bodyExtra, fontSize: 15, color: colors.onBrand },
  smallRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.md },
  smallCard: {
    width: "47%", flexGrow: 1, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    padding: spacing.lg, borderWidth: 2, borderStyle: "dashed", alignItems: "flex-start", gap: 4,
    ...shadow.soft,
  },
  smallLabel: { fontFamily: fonts.display, fontSize: 15, color: colors.onSurface, marginTop: spacing.xs },
  smallCta: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.onSurfaceTertiary },
  pricePillSm: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 5, marginTop: spacing.sm },
  priceTextSm: { fontFamily: fonts.bodyExtra, fontSize: 13, color: colors.onBrand },
});
