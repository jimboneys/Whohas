import { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl, Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";

import { colors, fonts, spacing, radius, shadow } from "@/src/theme";
import { ask, AskResponse } from "@/src/api";
import { addHistory } from "@/src/history";
import { getSavedCity } from "@/src/location";
import ProductResult from "@/src/components/ProductResult";

export default function ResultsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { q } = useLocalSearchParams<{ q: string }>();
  const question = (q || "").toString();

  const [data, setData] = useState<AskResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const autoOpenedRef = useRef(false);

  const load = useCallback((auto: boolean = true) => {
    if (!question) return;
    setLoading(true);
    setError(false);
    getSavedCity()
      .then((city) => ask(question, city))
      .then((res) => {
        setData(res);
        addHistory(question);
        if (auto && !autoOpenedRef.current && res.items[0]?.url) {
          autoOpenedRef.current = true;
          setTimeout(() => {
            WebBrowser.openBrowserAsync(res.items[0].url).catch(() => {});
          }, 800);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [question]);

  useEffect(() => {
    load(true);
  }, [load]);

  const openSource = (url: string) => {
    Haptics.selectionAsync().catch(() => {});
    WebBrowser.openBrowserAsync(url).catch(() => {});
  };

  const copyAnswer = async () => {
    if (!data) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const answer = data.direct_answer || data.items[0]?.name || "";
    const reason = data.items[0]?.reason || data.summary;
    await Clipboard.setStringAsync(`${answer}\n\n${reason}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const shareAnswer = async () => {
    if (!data) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const answer = data.direct_answer || data.items[0]?.name || "";
    const lines = [`🔎 ${question}`, "", `✅ ${answer}`, "", data.summary, "", "Found with WhoHas"];
    try {
      await Share.share({ message: lines.join("\n"), title: question });
    } catch {
      /* user dismissed */
    }
  };

  return (
    <View style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]} testID="results-header">
        <Pressable onPress={() => router.back()} hitSlop={12} testID="back-button" style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerQ} numberOfLines={1}>{question}</Text>
        <Pressable
          onPress={() => router.push("/(tabs)")}
          hitSlop={12}
          testID="home-button"
          style={styles.backBtn}
        >
          <Ionicons name="home" size={19} color={colors.onSurface} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center} testID="results-loading">
          <ActivityIndicator color={colors.brand} size="large" />
          <Text style={styles.loadingText}>Finding who has it…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errText}>Something went wrong.</Text>
          <Pressable style={styles.retry} onPress={() => load(false)} testID="results-retry">
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : data ? (
        <ScrollView
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxxl }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => load(false)} tintColor={colors.brand} />}
        >
          {data.demo && (
            <View style={styles.demoBanner} testID="demo-banner">
              <Ionicons name="information-circle" size={18} color={colors.onWarning} />
              <Text style={styles.demoText}>
                Smart answer. Add universal-key balance for live, source-cited results.
              </Text>
            </View>
          )}

          {data.product ? <ProductResult product={data.product} /> : null}

          <View style={styles.heroCard} testID="answer-card">
            <Text style={styles.heroLabel}>FOUND IT FOR YOU 🎉</Text>
            <Text style={styles.heroName} testID="answer-name">
              {data.direct_answer || data.items[0]?.name}
            </Text>
            {data.items[0]?.reason ? (
              <Text style={styles.heroReason}>{data.items[0].reason}</Text>
            ) : null}
            {data.items[0]?.url ? (
              <Pressable
                style={styles.heroBtn}
                testID="find-it-button"
                onPress={() => openSource(data.items[0].url)}
              >
                <Ionicons name="navigate" size={18} color={colors.brand} />
                <Text style={styles.heroBtnText}>Find it</Text>
              </Pressable>
            ) : null}
          </View>

          {data.summary ? <Text style={styles.summaryMini}>{data.summary}</Text> : null}

          <View style={styles.openedNote} testID="opened-note">
            <Ionicons name="open-outline" size={14} color={colors.onSurfaceTertiary} />
            <Text style={styles.openedNoteText}>Opened the top spot for you · tap Find it to reopen</Text>
          </View>

          <View style={styles.actionsRow}>
            <Pressable style={styles.actionBtn} testID="copy-button" onPress={copyAnswer}>
              <Ionicons name={copied ? "checkmark-circle" : "copy-outline"} size={17} color={colors.brand} />
              <Text style={styles.actionText}>{copied ? "Copied!" : "Copy"}</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} testID="share-button" onPress={shareAnswer}>
              <Ionicons name="share-social-outline" size={17} color={colors.brand} />
              <Text style={styles.actionText}>Share</Text>
            </Pressable>
          </View>

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
  heroCard: {
    backgroundColor: colors.brand, borderRadius: radius.lg, padding: spacing.xl, ...shadow.card,
  },
  heroLabel: { fontFamily: fonts.bodyExtra, fontSize: 11, letterSpacing: 1.5, color: "rgba(255,255,255,0.85)" },
  heroName: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, color: colors.onBrand, marginTop: spacing.xs },
  heroReason: { fontFamily: fonts.body, fontSize: 14.5, lineHeight: 21, color: "rgba(255,255,255,0.92)", marginTop: spacing.sm },
  heroBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.pill,
    paddingVertical: spacing.md, marginTop: spacing.lg,
  },
  heroBtnText: { fontFamily: fonts.bodyExtra, fontSize: 15, color: colors.brand },
  summaryMini: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.onSurfaceTertiary, marginTop: spacing.lg },
  openedNote: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.md },
  openedNoteText: { flex: 1, fontFamily: fonts.body, fontSize: 12.5, color: colors.onSurfaceTertiary },
  actionsRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, paddingVertical: spacing.md,
    borderWidth: 1.5, borderColor: colors.border,
  },
  actionText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.brand },
  moreToggle: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    borderRadius: radius.md, paddingVertical: spacing.md, marginTop: spacing.lg,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surfaceSecondary,
  },
  moreToggleText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.brand },
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
