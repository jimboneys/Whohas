import { View, Text, StyleSheet, Pressable, ScrollView, Image } from "react-native";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";

import { colors, fonts, spacing, radius, shadow } from "@/src/theme";
import { trackAdClick } from "@/src/api";

const IMG = "?crop=entropy&cs=srgb&fm=jpg&q=85&w=400";

type Sponsor = { key: string; name: string; tagline: string; url: string; image: string; accent: string; tint: string };

// Sponsored partner boxes shown above the search bar (MOCK ads).
const SPONSORS: Sponsor[] = [
  { key: "deal", name: "ALDI", tagline: "Eggs $2.25 today", url: "https://www.aldi.us/weekly-specials/", accent: colors.brand, tint: colors.brandTertiary, image: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f" + IMG },
  { key: "sponsor", name: "Costco", tagline: "Bulk savings", url: "https://www.costco.com", accent: colors.success, tint: colors.successSoft, image: "https://images.unsplash.com/photo-1542838132-92c53300491e" + IMG },
  { key: "weekly", name: "Kroger", tagline: "Weekly coupons", url: "https://www.kroger.com/weeklyad", accent: "#118AB2", tint: "#E3F2F7", image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da" + IMG },
];

export default function SponsorStrip() {
  const press = (s: Sponsor) => {
    Haptics.selectionAsync().catch(() => {});
    trackAdClick(s.key).catch(() => {});
    WebBrowser.openBrowserAsync(s.url).catch(() => {});
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <Text style={styles.label}>FEATURED SPONSORS</Text>
        <View style={styles.adPill}>
          <Text style={styles.adPillText}>Sponsored</Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {SPONSORS.map((s) => (
          <Pressable
            key={s.key}
            testID={`sponsor-box-${s.key}`}
            style={({ pressed }) => [styles.box, { borderColor: s.accent }, pressed && { opacity: 0.9 }]}
            onPress={() => press(s)}
          >
            <View style={styles.imgWrap}>
              <Image source={{ uri: s.image }} style={styles.img} />
              <View style={[styles.adTag, { backgroundColor: s.accent }]}>
                <Text style={styles.adTagText}>AD</Text>
              </View>
            </View>
            <View style={styles.body}>
              <Text style={styles.name} numberOfLines={1}>{s.name}</Text>
              <Text style={styles.tag} numberOfLines={1}>{s.tagline}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  label: { fontFamily: fonts.bodyExtra, fontSize: 12, letterSpacing: 1, color: colors.onSurfaceTertiary },
  adPill: { backgroundColor: colors.surfaceTertiary, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  adPillText: { fontFamily: fonts.bodyExtra, fontSize: 10, letterSpacing: 0.5, color: colors.onSurfaceTertiary },
  row: { gap: spacing.md, paddingRight: spacing.md },
  box: {
    width: 150, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    borderWidth: 2, overflow: "hidden", ...shadow.soft,
  },
  imgWrap: { position: "relative" },
  img: { width: "100%", height: 70, resizeMode: "cover" },
  adTag: { position: "absolute", top: spacing.sm, left: spacing.sm, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  adTagText: { fontFamily: fonts.bodyExtra, fontSize: 9, letterSpacing: 0.5, color: "#FFFFFF" },
  body: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  name: { fontFamily: fonts.display, fontSize: 15, color: colors.onSurface },
  tag: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.onSurfaceTertiary },
});
