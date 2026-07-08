import { useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, Image, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useFocusEffect } from "expo-router";

import { colors, fonts, spacing, radius, shadow } from "@/src/theme";
import { getAdClicks, trackAdClick } from "@/src/api";

const ADVERTISE_EMAIL = "advertise@whohas.app";
const IMG = "?crop=entropy&cs=srgb&fm=jpg&q=85&w=500";

type Sponsor = { name: string; tagline: string; url: string; image: string };
type Slot = {
  key: string;
  label: string;
  accent: string;
  tint: string;
  featured?: boolean;
  sponsor?: Sponsor; // present = MOCK sponsored ad; absent = open slot
};

// 3 sponsored (MOCK ads) + 3 open slots.
const SLOTS: Slot[] = [
  {
    key: "deal", label: "Deal of the Day", accent: colors.brand, tint: colors.brandTertiary, featured: true,
    sponsor: {
      name: "ALDI", tagline: "Dozen large eggs — just $2.25 today", url: "https://www.aldi.us/weekly-specials/",
      image: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f" + IMG,
    },
  },
  {
    key: "sponsor", label: "Sponsor", accent: colors.success, tint: colors.successSoft,
    sponsor: {
      name: "Costco", tagline: "Bulk savings on household staples", url: "https://www.costco.com",
      image: "https://images.unsplash.com/photo-1542838132-92c53300491e" + IMG,
    },
  },
  {
    key: "weekly", label: "This Week", accent: "#118AB2", tint: "#E3F2F7",
    sponsor: {
      name: "Kroger", tagline: "Weekly digital coupons live now", url: "https://www.kroger.com/weeklyad",
      image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da" + IMG,
    },
  },
  { key: "flash", label: "Flash Sale", accent: "#FF8C42", tint: "#FFE8D6" },
  { key: "local", label: "Local Hero", accent: "#EF476F", tint: "#FDE0E8" },
  { key: "coupon", label: "Coupon", accent: "#7B61FF", tint: "#ECE6FF" },
];

function fmt(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

function openAdvertise(slot: Slot) {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  const subject = encodeURIComponent(`WhoHas ad slot: ${slot.label}`);
  const body = encodeURIComponent(
    `Hi! I'd like to advertise in the "${slot.label}" spot on WhoHas. Here are my details:`
  );
  Linking.openURL(`mailto:${ADVERTISE_EMAIL}?subject=${subject}&body=${body}`).catch(() => {});
}

export default function AdSlots() {
  const [clicks, setClicks] = useState<Record<string, number>>({});

  useFocusEffect(
    useCallback(() => {
      getAdClicks().then(setClicks).catch(() => {});
    }, [])
  );

  const onSponsorPress = (slot: Slot) => {
    Haptics.selectionAsync().catch(() => {});
    setClicks((c) => ({ ...c, [slot.key]: (c[slot.key] || 0) + 1 })); // optimistic
    trackAdClick(slot.key).then((n) => {
      if (n != null) setClicks((c) => ({ ...c, [slot.key]: n }));
    });
    WebBrowser.openBrowserAsync(slot.sponsor!.url).catch(() => {});
  };

  const featured = SLOTS.find((s) => s.featured);
  const rest = SLOTS.filter((s) => !s.featured);
  const openCount = SLOTS.filter((s) => !s.sponsor).length;

  return (
    <>
      <View style={styles.headRow}>
        <Text style={styles.sectionLabel}>PARTNER SPOTS</Text>
        <View style={styles.availPill}>
          <View style={styles.dot} />
          <Text style={styles.availText}>{openCount} open</Text>
        </View>
      </View>

      {featured && featured.sponsor ? (
        <Pressable
          testID={`ad-slot-${featured.key}`}
          style={({ pressed }) => [styles.featured, { borderColor: featured.accent }, pressed && { opacity: 0.92 }]}
          onPress={() => onSponsorPress(featured)}
        >
          <Image source={{ uri: featured.sponsor.image }} style={styles.featuredImg} />
          <View style={{ flex: 1 }}>
            <View style={styles.labelRow}>
              <Text style={styles.featuredLabel}>{featured.sponsor.name}</Text>
              <View style={[styles.adTag, { backgroundColor: featured.tint }]}>
                <Text style={[styles.adTagText, { color: featured.accent }]}>AD</Text>
              </View>
            </View>
            <Text style={styles.featuredCta} numberOfLines={2}>{featured.sponsor.tagline}</Text>
            <View style={styles.clickRow}>
              <Ionicons name="stats-chart" size={12} color={featured.accent} />
              <Text style={[styles.clickText, { color: featured.accent }]}>
                {fmt(clicks[featured.key] || 0)} clicks
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={22} color={featured.accent} />
        </Pressable>
      ) : null}

      <View style={styles.smallRow}>
        {rest.map((s) =>
          s.sponsor ? (
            <Pressable
              key={s.key}
              testID={`ad-slot-${s.key}`}
              style={({ pressed }) => [styles.smallCard, { borderColor: s.accent }, pressed && { opacity: 0.92 }]}
              onPress={() => onSponsorPress(s)}
            >
              <View style={styles.smallImgWrap}>
                <Image source={{ uri: s.sponsor.image }} style={styles.smallImg} />
                <View style={[styles.adTagFloat, { backgroundColor: s.accent }]}>
                  <Text style={styles.adTagFloatText}>AD</Text>
                </View>
                <View style={styles.clickBadge}>
                  <Ionicons name="stats-chart" size={10} color="#FFFFFF" />
                  <Text style={styles.clickBadgeText}>{fmt(clicks[s.key] || 0)}</Text>
                </View>
              </View>
              <View style={styles.smallBody}>
                <Text style={styles.smallLabel} numberOfLines={1}>{s.sponsor.name}</Text>
                <Text style={styles.smallCta} numberOfLines={2}>{s.sponsor.tagline}</Text>
                <View style={styles.visitRow}>
                  <Text style={[styles.visitText, { color: s.accent }]}>Visit</Text>
                  <Ionicons name="arrow-forward" size={13} color={s.accent} />
                </View>
              </View>
            </Pressable>
          ) : (
            <Pressable
              key={s.key}
              testID={`ad-slot-${s.key}`}
              style={({ pressed }) => [styles.openCard, { borderColor: s.accent }, pressed && { opacity: 0.92 }]}
              onPress={() => openAdvertise(s)}
            >
              <View style={[styles.iconBadge, { backgroundColor: s.tint }]}>
                <Ionicons name="add" size={20} color={s.accent} />
              </View>
              <Text style={styles.smallLabel} numberOfLines={1}>{s.label}</Text>
              <Text style={styles.smallCta} numberOfLines={1}>Advertise here</Text>
              <View style={styles.visitRow}>
                <Text style={[styles.visitText, { color: s.accent }]}>Book spot</Text>
                <Ionicons name="add-circle" size={14} color={s.accent} />
              </View>
            </Pressable>
          )
        )}
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
    padding: spacing.md, borderWidth: 2, ...shadow.soft,
  },
  featuredImg: { width: 64, height: 64, borderRadius: radius.md, resizeMode: "cover" },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  featuredLabel: { fontFamily: fonts.display, fontSize: 17, color: colors.onSurface },
  featuredCta: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 18, color: colors.onSurfaceTertiary, marginTop: 2 },
  clickRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: spacing.xs },
  clickText: { fontFamily: fonts.bodyExtra, fontSize: 11.5 },
  adTag: { borderRadius: radius.sm, paddingHorizontal: 5, paddingVertical: 1 },
  adTagText: { fontFamily: fonts.bodyExtra, fontSize: 9, letterSpacing: 0.5 },
  smallRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.md },
  smallCard: {
    width: "47%", flexGrow: 1, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    borderWidth: 2, overflow: "hidden", ...shadow.soft,
  },
  smallImgWrap: { position: "relative" },
  smallImg: { width: "100%", height: 84, resizeMode: "cover" },
  adTagFloat: {
    position: "absolute", top: spacing.sm, left: spacing.sm,
    borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2,
  },
  adTagFloatText: { fontFamily: fonts.bodyExtra, fontSize: 9, letterSpacing: 0.5, color: "#FFFFFF" },
  clickBadge: {
    position: "absolute", top: spacing.sm, right: spacing.sm, flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "rgba(0,0,0,0.55)", borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 2,
  },
  clickBadgeText: { fontFamily: fonts.bodyExtra, fontSize: 10, color: "#FFFFFF" },
  smallBody: { padding: spacing.md, gap: 3 },
  openCard: {
    width: "47%", flexGrow: 1, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    padding: spacing.lg, borderWidth: 2, borderStyle: "dashed", alignItems: "flex-start", gap: 4, ...shadow.soft,
  },
  iconBadge: {
    width: 40, height: 40, borderRadius: radius.md, alignItems: "center", justifyContent: "center",
  },
  smallLabel: { fontFamily: fonts.display, fontSize: 15, color: colors.onSurface, marginTop: spacing.xs },
  smallCta: { fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 16, color: colors.onSurfaceTertiary },
  visitRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: spacing.sm },
  visitText: { fontFamily: fonts.bodyExtra, fontSize: 13 },
});
