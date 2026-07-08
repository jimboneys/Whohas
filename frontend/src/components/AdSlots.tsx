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
  featured?: boolean;
};

// Hardcoded partner spots (all open for advertising).
const SLOTS: Slot[] = [
  { key: "deal", label: "Deal of the Day", icon: "flash", accent: colors.brand, tint: colors.brandTertiary, featured: true },
  { key: "sponsor", label: "Sponsor", icon: "star", accent: colors.success, tint: colors.successSoft },
  { key: "weekly", label: "This Week", icon: "calendar", accent: "#118AB2", tint: "#E3F2F7" },
  { key: "flash", label: "Flash Sale", icon: "flame", accent: "#FF8C42", tint: "#FFE8D6" },
  { key: "local", label: "Local Hero", icon: "location", accent: "#EF476F", tint: "#FDE0E8" },
  { key: "coupon", label: "Coupon", icon: "pricetag", accent: "#7B61FF", tint: "#ECE6FF" },
];

function openAdvertise(slot: Slot) {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  const subject = encodeURIComponent(`WhoHas ad slot: ${slot.label}`);
  const body = encodeURIComponent(
    `Hi! I'd like to advertise in the "${slot.label}" spot on WhoHas. Here are my details:`
  );
  Linking.openURL(`mailto:${ADVERTISE_EMAIL}?subject=${subject}&body=${body}`).catch(() => {});
}

export default function AdSlots() {
  const featured = SLOTS.find((s) => s.featured);
  const rest = SLOTS.filter((s) => !s.featured);

  return (
    <>
      <View style={styles.headRow}>
        <Text style={styles.sectionLabel}>PARTNER SPOTS</Text>
        <View style={styles.availPill}>
          <View style={styles.dot} />
          <Text style={styles.availText}>{SLOTS.length} open</Text>
        </View>
      </View>

      {featured ? (
        <Pressable
          testID={`ad-slot-${featured.key}`}
          style={({ pressed }) => [styles.featured, { borderColor: featured.accent }, pressed && { opacity: 0.92 }]}
          onPress={() => openAdvertise(featured)}
        >
          <View style={[styles.iconBadge, { backgroundColor: featured.tint }]}>
            <Ionicons name={featured.icon} size={22} color={featured.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.featuredLabel}>{featured.label}</Text>
            <Text style={styles.featuredCta}>Advertise here</Text>
          </View>
          <View style={[styles.pricePill, { backgroundColor: featured.tint }]}>
            <Ionicons name="add" size={18} color={featured.accent} />
          </View>
        </Pressable>
      ) : null}

      <View style={styles.smallRow}>
        {rest.map((s) => (
          <Pressable
            key={s.key}
            testID={`ad-slot-${s.key}`}
            style={({ pressed }) => [styles.smallCard, { borderColor: s.accent }, pressed && { opacity: 0.92 }]}
            onPress={() => openAdvertise(s)}
          >
            <View style={[styles.iconBadge, { backgroundColor: s.tint }]}>
              <Ionicons name={s.icon} size={18} color={s.accent} />
            </View>
            <Text style={styles.smallLabel} numberOfLines={1}>{s.label}</Text>
            <Text style={styles.smallCta} numberOfLines={1}>Advertise here</Text>
            <View style={styles.visitRow}>
              <Text style={[styles.visitText, { color: s.accent }]}>Book spot</Text>
              <Ionicons name="add-circle" size={14} color={s.accent} />
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
  featuredLabel: { fontFamily: fonts.display, fontSize: 17, color: colors.onSurface, marginTop: spacing.xs },
  featuredCta: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.onSurfaceTertiary, marginTop: 1 },
  pricePill: { width: 34, height: 34, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  smallRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.md },
  smallCard: {
    width: "47%", flexGrow: 1, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    padding: spacing.lg, borderWidth: 2, borderStyle: "dashed", alignItems: "flex-start", gap: 4,
    ...shadow.soft,
  },
  smallLabel: { fontFamily: fonts.display, fontSize: 15, color: colors.onSurface, marginTop: spacing.xs },
  smallCta: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.onSurfaceTertiary },
  visitRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: spacing.sm },
  visitText: { fontFamily: fonts.bodyExtra, fontSize: 13 },
});
