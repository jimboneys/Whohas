import { useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, Linking, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import * as WebBrowser from "expo-web-browser";

import { colors, fonts, spacing, radius, shadow } from "@/src/theme";
import { getAdSlots, AdSlot } from "@/src/api";

const ADVERTISE_EMAIL = "advertise@whohas.app";

type Style = { icon: keyof typeof Ionicons.glyphMap; accent: string; tint: string };

// Visual identity per slot key (styling lives on the client; booking data comes from the backend).
const STYLES: Record<string, Style> = {
  deal: { icon: "flash", accent: colors.brand, tint: colors.brandTertiary },
  sponsor: { icon: "star", accent: colors.success, tint: colors.successSoft },
  weekly: { icon: "calendar", accent: "#118AB2", tint: "#E3F2F7" },
  flash: { icon: "flame", accent: "#FF8C42", tint: "#FFE8D6" },
  local: { icon: "location", accent: "#EF476F", tint: "#FDE0E8" },
  coupon: { icon: "pricetag", accent: "#7B61FF", tint: "#ECE6FF" },
};
const FALLBACK: Style = { icon: "megaphone", accent: colors.brand, tint: colors.brandTertiary };

function openAdvertise(slot: AdSlot) {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  const subject = encodeURIComponent(`WhoHas ad slot: ${slot.label}`);
  const body = encodeURIComponent(
    `Hi! I'd like to advertise in the "${slot.label}" spot on WhoHas. Here are my details:`
  );
  Linking.openURL(`mailto:${ADVERTISE_EMAIL}?subject=${subject}&body=${body}`).catch(() => {});
}

function openSponsor(url: string) {
  if (!url) return;
  Haptics.selectionAsync().catch(() => {});
  WebBrowser.openBrowserAsync(url).catch(() => {});
}

export default function AdSlots() {
  const [slots, setSlots] = useState<AdSlot[]>([]);

  useFocusEffect(
    useCallback(() => {
      getAdSlots().then(setSlots).catch(() => {});
    }, [])
  );

  if (slots.length === 0) return null;

  const featured = slots.find((s) => s.featured);
  const rest = slots.filter((s) => !s.featured);

  return (
    <>
      <View style={styles.headRow}>
        <Text style={styles.sectionLabel}>PARTNER SPOTS</Text>
        <View style={styles.availPill}>
          <View style={styles.dot} />
          <Text style={styles.availText}>{slots.filter((s) => !s.booked).length} open</Text>
        </View>
      </View>

      {featured ? <FeaturedCard slot={featured} /> : null}

      <View style={styles.smallRow}>
        {rest.map((s) => (
          <SmallCard key={s.key} slot={s} />
        ))}
      </View>
    </>
  );
}

function FeaturedCard({ slot }: { slot: AdSlot }) {
  const st = STYLES[slot.key] || FALLBACK;
  const booked = slot.booked && slot.sponsor;
  return (
    <Pressable
      testID={`ad-slot-${slot.key}`}
      style={({ pressed }) => [
        styles.featured,
        booked ? { borderColor: st.accent, borderStyle: "solid" } : { borderColor: st.accent },
        pressed && { opacity: 0.92 },
      ]}
      onPress={() => (booked ? openSponsor(slot.sponsor!.url) : openAdvertise(slot))}
    >
      {booked && slot.sponsor!.image ? (
        <Image source={{ uri: slot.sponsor!.image }} style={styles.logo} />
      ) : (
        <View style={[styles.iconBadge, { backgroundColor: st.tint }]}>
          <Ionicons name={st.icon} size={22} color={st.accent} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={styles.labelRow}>
          <Text style={styles.featuredLabel}>{slot.label}</Text>
          {booked ? (
            <View style={[styles.adTag, { backgroundColor: st.tint }]}>
              <Text style={[styles.adTagText, { color: st.accent }]}>AD</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.featuredCta} numberOfLines={1}>
          {booked ? slot.sponsor!.tagline || slot.sponsor!.name : "Advertise here"}
        </Text>
      </View>
      {booked ? (
        <Ionicons name="chevron-forward" size={22} color={st.accent} />
      ) : (
        <View style={[styles.pricePill, { backgroundColor: st.tint }]}>
          <Ionicons name="add" size={18} color={st.accent} />
        </View>
      )}
    </Pressable>
  );
}

function SmallCard({ slot }: { slot: AdSlot }) {
  const st = STYLES[slot.key] || FALLBACK;
  const booked = slot.booked && slot.sponsor;
  return (
    <Pressable
      testID={`ad-slot-${slot.key}`}
      style={({ pressed }) => [
        styles.smallCard,
        booked ? { borderColor: st.accent, borderStyle: "solid" } : { borderColor: st.accent },
        pressed && { opacity: 0.92 },
      ]}
      onPress={() => (booked ? openSponsor(slot.sponsor!.url) : openAdvertise(slot))}
    >
      {booked && slot.sponsor!.image ? (
        <Image source={{ uri: slot.sponsor!.image }} style={styles.logoSm} />
      ) : (
        <View style={[styles.iconBadge, { backgroundColor: st.tint }]}>
          <Ionicons name={st.icon} size={18} color={st.accent} />
        </View>
      )}
      <View style={styles.labelRow}>
        <Text style={styles.smallLabel} numberOfLines={1}>
          {booked ? slot.sponsor!.name : slot.label}
        </Text>
        {booked ? (
          <View style={[styles.adTag, { backgroundColor: st.tint }]}>
            <Text style={[styles.adTagText, { color: st.accent }]}>AD</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.smallCta} numberOfLines={1}>
        {booked ? slot.sponsor!.tagline || slot.label : "Advertise here"}
      </Text>
      {booked ? (
        <View style={[styles.visitRow]}>
          <Text style={[styles.visitText, { color: st.accent }]}>Visit</Text>
          <Ionicons name="arrow-forward" size={13} color={st.accent} />
        </View>
      ) : (
        <View style={[styles.visitRow]}>
          <Text style={[styles.visitText, { color: st.accent }]}>Book spot</Text>
          <Ionicons name="add-circle" size={14} color={st.accent} />
        </View>
      )}
    </Pressable>
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
  logo: { width: 44, height: 44, borderRadius: radius.md, resizeMode: "cover" },
  logoSm: { width: 36, height: 36, borderRadius: radius.sm, resizeMode: "cover" },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.xs },
  featuredLabel: { fontFamily: fonts.display, fontSize: 17, color: colors.onSurface },
  featuredCta: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.onSurfaceTertiary, marginTop: 1 },
  adTag: { borderRadius: radius.sm, paddingHorizontal: 5, paddingVertical: 1 },
  adTagText: { fontFamily: fonts.bodyExtra, fontSize: 9, letterSpacing: 0.5 },
  pricePill: { width: 34, height: 34, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  smallRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.md },
  smallCard: {
    width: "47%", flexGrow: 1, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    padding: spacing.lg, borderWidth: 2, borderStyle: "dashed", alignItems: "flex-start", gap: 4,
    ...shadow.soft,
  },
  smallLabel: { fontFamily: fonts.display, fontSize: 15, color: colors.onSurface, flexShrink: 1 },
  smallCta: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.onSurfaceTertiary },
  visitRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: spacing.sm },
  visitText: { fontFamily: fonts.bodyExtra, fontSize: 13 },
});
