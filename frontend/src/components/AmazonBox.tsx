import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";

import { colors, fonts, spacing, radius, shadow } from "@/src/theme";
import { getAmazonLink } from "@/src/api";

// Amazon Associates box — click-throughs carry the affiliate tag (set on the backend).
export default function AmazonBox({
  query,
  title = "Shop on Amazon",
  subtitle = "Great everyday prices, delivered fast",
}: {
  query?: string;
  title?: string;
  subtitle?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getAmazonLink(query)
      .then((r) => {
        if (alive) setUrl(query ? r.amazon_search_url : r.amazon_url);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [query]);

  const open = () => {
    if (!url) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    WebBrowser.openBrowserAsync(url).catch(() => {});
  };

  if (!url) return null;

  return (
    <Pressable style={styles.box} onPress={open} testID="amazon-box">
      <View style={styles.iconWrap}>
        <Ionicons name="logo-amazon" size={24} color="#FFFFFF" />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.adTag}>
            <Text style={styles.adTagText}>AD</Text>
          </View>
        </View>
        <Text style={styles.sub} numberOfLines={1}>{subtitle}</Text>
      </View>
      <View style={styles.cta}>
        <Text style={styles.ctaText}>Shop</Text>
        <Ionicons name="arrow-forward" size={14} color="#232F3E" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: "#232F3E",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.xl,
    ...shadow.soft,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,153,0,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { fontFamily: fonts.bodyExtra, fontSize: 15, color: "#FFFFFF" },
  adTag: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  adTagText: { fontFamily: fonts.bodyExtra, fontSize: 8, letterSpacing: 0.5, color: "rgba(255,255,255,0.75)" },
  sub: { fontFamily: fonts.bodyBold, fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 1 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FF9900",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  ctaText: { fontFamily: fonts.bodyExtra, fontSize: 13, color: "#232F3E" },
});
