import { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { colors, fonts, spacing, radius } from "@/src/theme";
import { trending, TrendingGroup } from "@/src/api";

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [groups, setGroups] = useState<TrendingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    trending()
      .then(setGroups)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const go = (q: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push({ pathname: "/results", params: { q } });
  };

  return (
    <View style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]} testID="explore-header">
        <Text style={styles.title}>Explore</Text>
        <Text style={styles.subtitle}>Popular things people are looking for</Text>
      </View>

      {loading ? (
        <View style={styles.center} testID="explore-loading">
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errText}>Couldn&apos;t load suggestions.</Text>
          <Pressable style={styles.retry} onPress={load} testID="explore-retry">
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxxl }}
          showsVerticalScrollIndicator={false}
        >
          {groups.map((g) => (
            <View key={g.category} style={styles.group} testID={`group-${g.category}`}>
              <View style={styles.groupHead}>
                <View style={[styles.groupIcon, { backgroundColor: g.accent }]}>
                  <Ionicons name={g.icon as any} size={18} color="#fff" />
                </View>
                <Text style={styles.groupTitle}>{g.category}</Text>
              </View>
              {g.questions.map((qq) => (
                <Pressable
                  key={qq}
                  testID={`question-${qq.slice(0, 12).replace(/\s+/g, "-")}`}
                  style={({ pressed }) => [styles.qRow, pressed && { borderColor: g.accent }]}
                  onPress={() => go(qq)}
                >
                  <Text style={styles.qText}>{qq}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#C9C3B8" />
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.onSurface },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.onSurfaceTertiary, marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  errText: { fontFamily: fonts.bodyBold, color: colors.onSurfaceTertiary },
  retry: { backgroundColor: colors.brand, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.pill },
  retryText: { fontFamily: fonts.bodyBold, color: colors.onBrand },
  group: { marginBottom: spacing.xl },
  groupHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  groupIcon: { width: 30, height: 30, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  groupTitle: { fontFamily: fonts.bodyExtra, fontSize: 17, color: colors.onSurface },
  qRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.md,
    padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1.5, borderColor: colors.border,
  },
  qText: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 15, color: colors.onSurface, marginRight: spacing.sm },
});
