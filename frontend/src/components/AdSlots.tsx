import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";

import { colors, fonts, spacing, radius, shadow } from "@/src/theme";

type Sponsor = { name: string; tagline: string; url: string };

type Slot = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  tint: string;
  featured?: boolean;
  sponsor?: Sponsor; // MOCK ad — sample brands/deals for demo purposes
};

// Hardcoded partner spots with MOCK ads.
const SLOTS: Slot[] = [
  {
    key: "deal", label: "Deal of the Day", icon: "flash", accent: colors.brand, tint: colors.brandTertiary, featured: true,
    sponsor: { name: "ALDI", tagline: "Dozen large eggs — just $2.25 today", url: "https://www.aldi.us/weekly-specials/" },
  },
  {
    key: "sponsor", label: "Sponsor", icon: "star", accent: colors.success, tint: colors.successSoft,
    sponsor: { name: "Costco", tagline: "Bulk savings on household staples", url: "https://www.costco.com" },
  },
  {
    key: "weekly", label: "This Week", icon: "calendar", accent: "#118AB2", tint: "#E3F2F7",
    sponsor: { name: "Kroger", tagline: "Weekly digital coupons live now", url: "https://www.kroger.com/weeklyad" },
  },
  {
    key: "flash", label: "Flash Sale", icon: "flame", accent: "#FF8C42", tint: "#FFE8D6",
    sponsor: { name: "Target", tagline: "24hr flash: 20% off cleaning", url: "https://www.target.com/c/cleaning-supplies" },
  },
  {
    key: "local", label: "Local Hero", icon: "location", accent: "#EF476F", tint: "#FDE0E8",
    sponsor: { name: "Instacart", tagline: "Same-day delivery near you", url: "https://www.instacart.com" },
  },
  {
    key: "coupon", label: "Coupon", icon: "pricetag", accent: "#7B61FF", tint: "#ECE6FF",
    sponsor: { name: "Walmart", tagline: "$10 off your first $50 grocery order", url: "https://www.walmart.com/cp/grocery/5431943" },
  },
];

function openSponsor(url: string) {
  Haptics.selectionAsync().catch(() => {});
  WebBrowser.openBrowserAsync(url).catch(() => {});
}

export default function AdSlots() {
  const featured = SLOTS.find((s) => s.featured);
  const rest = SLOTS.filter((s) => !s.featured);

  return (
    <>
      <View style={styles.headRow}>
        <Text style={styles.sectionLabel}>PARTNER SPOTS</Text>
        <View style={styles.sponsoredPill}>
          <Ionicons name="megaphone" size={11} color={colors.onSurfaceTertiary} />
          <Text style={styles.sponsoredText}>Sponsored</Text>
        </View>
      </View>

      {featured && featured.sponsor ? (
        <Pressable
          testID={`ad-slot-${featured.key}`}
          style={({ pressed }) => [styles.featured, { borderColor: featured.accent }, pressed && { opacity: 0.92 }]}
          onPress={() => openSponsor(featured.sponsor!.url)}
        >
          <View style={[styles.iconBadge, { backgroundColor: featured.tint }]}>
            <Ionicons name={featured.icon} size={22} color={featured.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.labelRow}>
              <Text style={styles.featuredLabel}>{featured.sponsor.name}</Text>
              <View style={[styles.adTag, { backgroundColor: featured.tint }]}>
                <Text style={[styles.adTagText, { color: featured.accent }]}>AD</Text>
              </View>
            </View>
            <Text style={styles.featuredCta} numberOfLines={1}>{featured.sponsor.tagline}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={featured.accent} />
        </Pressable>
      ) : null}

      <View style={styles.smallRow}>
        {rest.map((s) => (
          <Pressable
            key={s.key}
            testID={`ad-slot-${s.key}`}
            style={({ pressed }) => [styles.smallCard, { borderColor: s.accent }, pressed && { opacity: 0.92 }]}
            onPress={() => openSponsor(s.sponsor!.url)}
          >
            <View style={[styles.iconBadge, { backgroundColor: s.tint }]}>
              <Ionicons name={s.icon} size={18} color={s.accent} />
            </View>
            <View style={styles.labelRow}>
              <Text style={styles.smallLabel} numberOfLines={1}>{s.sponsor!.name}</Text>
              <View style={[styles.adTag, { backgroundColor: s.tint }]}>
                <Text style={[styles.adTagText, { color: s.accent }]}>AD</Text>
              </View>
            </View>
            <Text style={styles.smallCta} numberOfLines={2}>{s.sponsor!.tagline}</Text>
            <View style={styles.visitRow}>
              <Text style={[styles.visitText, { color: s.accent }]}>Visit</Text>
              <Ionicons name="arrow-forward" size={13} color={s.accent} />
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
  sponsoredPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.surfaceTertiary, borderRadius: radius.pill,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
  },
  sponsoredText: { fontFamily: fonts.bodyExtra, fontSize: 10, letterSpacing: 0.5, color: colors.onSurfaceTertiary },
  featured: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    padding: spacing.lg, borderWidth: 2, ...shadow.soft,
  },
  iconBadge: {
    width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center",
  },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.xs },
  featuredLabel: { fontFamily: fonts.display, fontSize: 17, color: colors.onSurface },
  featuredCta: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.onSurfaceTertiary, marginTop: 1 },
  adTag: { borderRadius: radius.sm, paddingHorizontal: 5, paddingVertical: 1 },
  adTagText: { fontFamily: fonts.bodyExtra, fontSize: 9, letterSpacing: 0.5 },
  smallRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.md },
  smallCard: {
    width: "47%", flexGrow: 1, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    padding: spacing.lg, borderWidth: 2, alignItems: "flex-start", gap: 4, ...shadow.soft,
  },
  smallLabel: { fontFamily: fonts.display, fontSize: 15, color: colors.onSurface, flexShrink: 1 },
  smallCta: { fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 16, color: colors.onSurfaceTertiary },
  visitRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: spacing.sm },
  visitText: { fontFamily: fonts.bodyExtra, fontSize: 13 },
});
