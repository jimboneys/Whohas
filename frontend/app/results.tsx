import { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as Haptics from "expo-haptics";

import { colors, fonts, spacing, radius, shadow } from "@/src/theme";
import { ask, AskResponse } from "@/src/api";
import { addHistory } from "@/src/history";

export default function ResultsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { q } = useLocalSearchParams<{ q: string }>();
  const question = (q || "").toString();

  const [data, setData] = useState<AskResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    if (!question) return;
    setLoading(true);
    setError(false);
    ask(question)
      .then((res) => {
        setData(res);
        addHistory(question);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [question]);

  useEffect(load, [load]);

  const openSource = (url: string) => {
    Haptics.selectionAsync().catch(() => {});
    WebBrowser.openBrowserAsync(url).catch(() => {});
  };

  return (
    <View style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]} testID="results-header">
        <Pressable onPress={() => router.back()} hitSlop={12} testID="back-button" style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerQ} numberOfLines={1}>{question}</Text>
      </View>

      {loading ? (
        <View style={styles.center} testID="results-loading">
          <ActivityIndicator color={colors.brand} size="large" />
          <Text style={styles.loadingText}>Finding who has it…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errText}>Something went wrong.</Text>
          <Pressable style={styles.retry} onPress={load} testID="results-retry">
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : data ? (
        <ScrollView
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxxl }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.brand} />}
        >
          {data.demo && (
            <View style={styles.demoBanner} testID="demo-banner">
              <Ionicons name="information-circle" size={18} color={colors.onWarning} />
              <Text style={styles.demoText}>
                Demo answers. Add an AI key in the backend to get live, source-cited results.
              </Text>
            </View>
          )}

          <View style={styles.summaryCard} testID="summary-card">
            <View style={styles.summaryHead}>
              <Ionicons name="sparkles" size={18} color={colors.brand} />
              <Text style={styles.summaryLabel}>WHOHAS SAYS</Text>
              {!data.demo && data.sources_count > 0 && (
                <View style={styles.srcPill}>
                  <Text style={styles.srcPillText}>{data.sources_count} sources</Text>
                </View>
              )}
            </View>
            <Text style={styles.summaryText}>{data.summary}</Text>
          </View>

          <Text style={styles.sectionLabel}>TOP CONTENDERS</Text>
          {data.items.map((item, idx) => {
            const top = idx === 0;
            return (
              <Pressable
                key={`${item.rank}-${item.name}`}
                testID={`result-card-${idx}`}
                onPress={() => openSource(item.url)}
                style={[styles.card, top && styles.topCard]}
              >
                {top && (
                  <View style={styles.topBadge} testID="top-pick-badge">
                    <Ionicons name="trophy" size={12} color={colors.onSuccess} />
                    <Text style={styles.topBadgeText}>TOP PICK</Text>
                  </View>
                )}
                <View style={styles.cardRow}>
                  <View style={[styles.rankCircle, top && { backgroundColor: colors.success }]}>
                    <Text style={[styles.rankText, top && { color: colors.onSuccess }]}>{item.rank}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{item.name}</Text>
                    <Text style={styles.cardReason}>{item.reason}</Text>
                    <View style={styles.sourceRow}>
                      <Ionicons name="link" size={13} color={colors.brand} />
                      <Text style={styles.sourceText} numberOfLines={1}>
                        {item.source_title || "View source"}
                      </Text>
                      <Ionicons name="open-outline" size={13} color={colors.onSurfaceTertiary} />
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })}

          <Pressable style={styles.askAgain} onPress={() => router.push("/(tabs)")} testID="ask-another-button">
            <Ionicons name="search" size={18} color={colors.onBrand} />
            <Text style={styles.askAgainText}>Ask another</Text>
          </Pressable>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border,
  },
  headerQ: { flex: 1, fontFamily: fonts.displayMedium, fontSize: 18, color: colors.onSurface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  loadingText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.onSurfaceTertiary },
  errText: { fontFamily: fonts.bodyBold, color: colors.onSurfaceTertiary },
  retry: { backgroundColor: colors.brand, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.pill },
  retryText: { fontFamily: fonts.bodyBold, color: colors.onBrand },
  demoBanner: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.warning, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg,
  },
  demoText: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.onWarning },
  summaryCard: {
    backgroundColor: colors.surfaceInverse, borderRadius: radius.lg, padding: spacing.lg, ...shadow.card,
  },
  summaryHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  summaryLabel: { fontFamily: fonts.bodyExtra, fontSize: 11, letterSpacing: 1, color: "#9AA0A6", flex: 1 },
  srcPill: { backgroundColor: "rgba(6,214,160,0.18)", borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  srcPillText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.success },
  summaryText: { fontFamily: fonts.body, fontSize: 15.5, lineHeight: 23, color: colors.onSurfaceInverse },
  sectionLabel: {
    fontFamily: fonts.bodyExtra, fontSize: 12, letterSpacing: 1, color: colors.onSurfaceTertiary,
    marginTop: spacing.xl, marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg,
    marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadow.soft,
  },
  topCard: { borderColor: colors.success, borderWidth: 2, marginTop: spacing.sm },
  topBadge: {
    position: "absolute", top: -11, left: spacing.lg, flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.success, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 4,
  },
  topBadgeText: { fontFamily: fonts.bodyExtra, fontSize: 10, letterSpacing: 0.5, color: colors.onSuccess },
  cardRow: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  rankCircle: {
    width: 34, height: 34, borderRadius: radius.pill, backgroundColor: colors.brandTertiary,
    alignItems: "center", justifyContent: "center",
  },
  rankText: { fontFamily: fonts.display, fontSize: 17, color: colors.brand },
  cardName: { fontFamily: fonts.display, fontSize: 18, color: colors.onSurface },
  cardReason: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.onSurfaceTertiary, marginTop: 2 },
  sourceRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: spacing.sm },
  sourceText: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.onSurfaceTertiary },
  askAgain: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    backgroundColor: colors.brand, borderRadius: radius.pill, paddingVertical: spacing.lg, marginTop: spacing.lg,
  },
  askAgainText: { fontFamily: fonts.bodyExtra, fontSize: 16, color: colors.onBrand },
});
