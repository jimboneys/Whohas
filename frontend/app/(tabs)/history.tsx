import { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";

import { colors, fonts, spacing, radius } from "@/src/theme";
import { getHistory, clearHistory, HistoryItem } from "@/src/history";

const EMPTY_IMG = "https://images.pexels.com/photos/8066785/pexels-photo-8066785.png?auto=compress&cs=tinysrgb&w=600";

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [items, setItems] = useState<HistoryItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      getHistory().then(setItems);
    }, [])
  );

  const onClear = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await clearHistory();
    setItems([]);
  };

  const go = (q: string) => router.push({ pathname: "/results", params: { q } });

  return (
    <View style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]} testID="history-header">
        <Text style={styles.title}>History</Text>
        {items.length > 0 && (
          <Pressable onPress={onClear} testID="clear-history-button" hitSlop={10}>
            <Text style={styles.clear}>Clear</Text>
          </Pressable>
        )}
      </View>

      {items.length === 0 ? (
        <View style={styles.empty} testID="history-empty">
          <Image source={{ uri: EMPTY_IMG }} style={styles.emptyImg} contentFit="contain" />
          <Text style={styles.emptyTitle}>No questions yet</Text>
          <Text style={styles.emptySub}>Your asked questions will show up here.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxxl }}
          showsVerticalScrollIndicator={false}
        >
          {items.map((h) => (
            <Pressable
              key={`${h.q}-${h.at}`}
              testID={`history-${h.q.slice(0, 12).replace(/\s+/g, "-")}`}
              style={styles.row}
              onPress={() => go(h.q)}
            >
              <View style={styles.iconCircle}>
                <Ionicons name="search" size={16} color={colors.brand} />
              </View>
              <Text style={styles.qText} numberOfLines={2}>{h.q}</Text>
              <Ionicons name="chevron-forward" size={18} color="#C9C3B8" />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
    paddingHorizontal: spacing.xl, paddingBottom: spacing.md,
  },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.onSurface },
  clear: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.brand },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  emptyImg: { width: 160, height: 160, marginBottom: spacing.lg, opacity: 0.9 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.onSurface },
  emptySub: { fontFamily: fonts.body, fontSize: 14, color: colors.onSurfaceTertiary, marginTop: spacing.xs },
  row: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.md,
    padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  iconCircle: {
    width: 32, height: 32, borderRadius: radius.pill, backgroundColor: colors.brandTertiary,
    alignItems: "center", justifyContent: "center",
  },
  qText: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 15, color: colors.onSurface },
});
