import { useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Image } from "react-native";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useFocusEffect } from "expo-router";

import { colors, fonts, spacing, radius, shadow } from "@/src/theme";
import { trackAdClick, getSponsors, DbSponsor } from "@/src/api";

export default function SponsorStrip() {
  const [sponsors, setSponsors] = useState<DbSponsor[]>([]);

  useFocusEffect(
    useCallback(() => {
      getSponsors("strip").then(setSponsors).catch(() => {});
    }, [])
  );

  const press = (s: DbSponsor) => {
    Haptics.selectionAsync().catch(() => {});
    trackAdClick(s.key).catch(() => {});
    WebBrowser.openBrowserAsync(s.url).catch(() => {});
  };

  if (sponsors.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <Text style={styles.label}>FEATURED SPONSORS</Text>
        <View style={styles.adPill}>
          <Text style={styles.adPillText}>Sponsored</Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {sponsors.map((s) => {
          const accent = s.accent || colors.brand;
          return (
            <Pressable
              key={s.key}
              testID={`sponsor-box-${s.key}`}
              style={({ pressed }) => [styles.box, { borderColor: accent }, pressed && { opacity: 0.9 }]}
              onPress={() => press(s)}
            >
              <View style={styles.imgWrap}>
                <Image source={{ uri: s.image }} style={styles.img} />
                <View style={[styles.adTag, { backgroundColor: accent }]}>
                  <Text style={styles.adTagText}>AD</Text>
                </View>
              </View>
              <View style={styles.body}>
                <Text style={styles.name} numberOfLines={1}>{s.name}</Text>
                <Text style={styles.tag} numberOfLines={1}>{s.tagline}</Text>
              </View>
            </Pressable>
          );
        })}
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
    width: 124, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md,
    borderWidth: 2, overflow: "hidden", ...shadow.soft,
  },
  imgWrap: { position: "relative" },
  img: { width: "100%", height: 54, resizeMode: "cover" },
  adTag: { position: "absolute", top: 5, left: 5, borderRadius: radius.sm, paddingHorizontal: 5, paddingVertical: 1 },
  adTagText: { fontFamily: fonts.bodyExtra, fontSize: 8, letterSpacing: 0.5, color: "#FFFFFF" },
  body: { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  name: { fontFamily: fonts.display, fontSize: 13.5, color: colors.onSurface },
  tag: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.onSurfaceTertiary },
});
