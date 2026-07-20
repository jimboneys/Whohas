import { useState } from "react";
import { View, Text, StyleSheet, Pressable, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { colors, fonts, spacing, radius, shadow } from "@/src/theme";

const POINTS: { icon: keyof typeof Ionicons.glyphMap; title: string; sub: string }[] = [
  { icon: "person-outline", title: "No sign-up, no accounts", sub: "Use WhoHas without giving any personal info." },
  { icon: "eye-off-outline", title: "No tracking or profiling", sub: "We don't follow you around or build a profile." },
  { icon: "search-outline", title: "Searches aren't linked to you", sub: "Queries are anonymous — never tied to your identity." },
  { icon: "location-outline", title: "Location stays on your device", sub: "Used only to localize results, never stored with you." },
  { icon: "lock-closed-outline", title: "We never sell your data", sub: "Your activity is yours. Period." },
];

export default function PrivacyBadge() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        testID="privacy-badge"
        style={({ pressed }) => [styles.badge, pressed && { opacity: 0.85 }]}
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          setOpen(true);
        }}
      >
        <Ionicons name="shield-checkmark" size={14} color={colors.success} />
        <Text style={styles.badgeText}>100% anonymous · No data harvesting</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.head}>
              <View style={styles.headIcon}>
                <Ionicons name="shield-checkmark" size={22} color={colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Your privacy, protected</Text>
                <Text style={styles.subtitle}>WhoHas is anonymous by design.</Text>
              </View>
            </View>

            {POINTS.map((p) => (
              <View key={p.title} style={styles.point}>
                <Ionicons name={p.icon} size={18} color={colors.brand} style={{ marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pointTitle}>{p.title}</Text>
                  <Text style={styles.pointSub}>{p.sub}</Text>
                </View>
              </View>
            ))}

            <Pressable style={styles.gotIt} onPress={() => setOpen(false)} testID="privacy-close">
              <Text style={styles.gotItText}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "center",
    backgroundColor: colors.successSoft, borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  badgeText: { fontFamily: fonts.bodyExtra, fontSize: 12, color: colors.onSuccess },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: spacing.xl },
  sheet: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md, ...shadow.card },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.xs },
  headIcon: {
    width: 42, height: 42, borderRadius: radius.md, backgroundColor: colors.successSoft,
    alignItems: "center", justifyContent: "center",
  },
  title: { fontFamily: fonts.display, fontSize: 20, color: colors.onSurface },
  subtitle: { fontFamily: fonts.body, fontSize: 13.5, color: colors.onSurfaceTertiary, marginTop: 1 },
  point: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  pointTitle: { fontFamily: fonts.bodyExtra, fontSize: 14.5, color: colors.onSurface },
  pointSub: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.onSurfaceTertiary, marginTop: 1 },
  gotIt: { backgroundColor: colors.brand, borderRadius: radius.pill, paddingVertical: spacing.md, alignItems: "center", marginTop: spacing.sm },
  gotItText: { fontFamily: fonts.bodyExtra, fontSize: 15, color: colors.onBrand },
});
