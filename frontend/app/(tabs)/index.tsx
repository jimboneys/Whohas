import { useState, useCallback, useEffect } from "react";
import {
  View, Text, TextInput, StyleSheet, ScrollView, Pressable,
  KeyboardAvoidingView, Platform, Keyboard, Linking, Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { colors, fonts, spacing, radius, shadow } from "@/src/theme";
import { suggest } from "@/src/api";
import { ensureLocation, getSavedCity } from "@/src/location";
import InstallButton from "@/src/components/InstallButton";
import AdSlots from "@/src/components/AdSlots";
import LocalSpecial from "@/src/components/LocalSpecial";
import QuickPicks from "@/src/components/QuickPicks";
import SponsorStrip from "@/src/components/SponsorStrip";

export default function AskScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [locBusy, setLocBusy] = useState(false);
  const [locBlocked, setLocBlocked] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getSavedCity().then(setCity);
    }, [])
  );

  const handleLocation = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setLocBusy(true);
    setLocBlocked(false);
    const r = await ensureLocation();
    setLocBusy(false);
    if (r.city) setCity(r.city);
    else if (r.blocked) setLocBlocked(true);
  };

  useEffect(() => {
    const v = q.trim();
    if (!v) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      suggest(v).then(setSuggestions).catch(() => setSuggestions([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const submit = (text: string) => {
    const value = text.trim();
    if (!value) return;
    const framed = /^(who|where|which|what|when|how|do|does|is|are|can)\b/i.test(value)
      ? value
      : `Who has the best price on ${value}?`;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Keyboard.dismiss();
    router.push({ pathname: "/results", params: { q: framed } });
  };

  const shareApp = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const url = Platform.OS === "web" ? (window as any)?.location?.origin || "" : "";
    const message =
      "🔎 WhoHas — the fastest way to find who has the cheapest groceries & household supplies. " +
      "No BS, just the best deal." + (url ? `\n\n${url}` : "");
    try {
      if (Platform.OS === "web") {
        const nav = (window as any).navigator;
        if (nav?.share) {
          await nav.share({ title: "WhoHas", text: message, url });
        } else if (nav?.clipboard?.writeText) {
          await nav.clipboard.writeText(url || message);
        }
        return;
      }
      await Share.share({ message, title: "WhoHas" });
    } catch {
      /* user dismissed */
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xxxl }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandRow} testID="home-header">
          <View style={styles.logoBadge}>
            <MaterialCommunityIcons name="domino-mask" size={22} color={colors.onBrand} />
          </View>
          <Text style={styles.wordmark}>
            Who<Text style={{ color: colors.brand }}>Has</Text>
          </Text>
          <View style={{ flex: 1 }} />
          <InstallButton compact />
          <Pressable
            testID="share-app-button"
            style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.85 }]}
            onPress={shareApp}
            hitSlop={8}
          >
            <Ionicons name="share-social-outline" size={20} color={colors.brand} />
          </Pressable>
        </View>
        <Text style={styles.tagline}>Hey 👋 what are you looking for today?</Text>

        <Pressable style={styles.locChip} testID="location-chip" onPress={handleLocation}>
          <Ionicons name="location" size={14} color={colors.brand} />
          <Text style={styles.locText}>
            {city ? city : locBusy ? "Locating…" : "Use my location"}
          </Text>
          {city ? <Ionicons name="checkmark-circle" size={14} color={colors.success} /> : null}
        </Pressable>
        {locBlocked && (
          <Pressable testID="location-settings" onPress={() => Linking.openSettings()}>
            <Text style={styles.locBlockedText}>Location is blocked — tap to open Settings</Text>
          </Pressable>
        )}

        <SponsorStrip />

        <QuickPicks onPick={(item) => submit(item)} />

        <View style={styles.searchCard} testID="search-card">
          <Text style={styles.prefix}>WhoHas the best price on</Text>
          <View style={styles.inputRow}>
            <TextInput
              testID="ask-input"
              style={styles.input}
              placeholder="eggs…"
              placeholderTextColor="#B5AFA5"
              value={q}
              onChangeText={setQ}
              onSubmitEditing={() => submit(q)}
              returnKeyType="search"
              multiline
            />
            <Pressable
              testID="ask-submit-button"
              style={({ pressed }) => [styles.askBtn, pressed && { opacity: 0.85 }]}
              onPress={() => submit(q)}
            >
              <Ionicons name="arrow-forward" size={24} color={colors.onBrand} />
            </Pressable>
          </View>
        </View>

        {q.trim().length === 0 ? (
          <>
            <LocalSpecial />
            <AdSlots />
          </>
        ) : (
          <>
            <Text style={styles.sectionLabel}>SUGGESTIONS</Text>
            {suggestions.map((s, i) => (
              <Pressable
                key={s}
                testID={`suggestion-${i}`}
                style={styles.recentRow}
                onPress={() => submit(s)}
              >
                <Ionicons name={i === 0 ? "sparkles" : "search"} size={18} color={colors.brand} />
                <Text style={styles.recentText} numberOfLines={1}>{s}</Text>
                <Ionicons name="arrow-forward" size={16} color="#C9C3B8" />
              </Pressable>
            ))}
          </>
        )}
        <View style={styles.footer}>
          <Ionicons name="sparkles" size={12} color="#C9C3B8" />
          <Text style={styles.footerText}>Powered by Claude Sonnet 4.6</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  logoBadge: {
    width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center",
  },
  wordmark: { fontFamily: fonts.display, fontSize: 28, color: colors.onSurface },
  shareBtn: {
    width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.brandTertiary,
    alignItems: "center", justifyContent: "center",
  },
  tagline: { fontFamily: fonts.body, fontSize: 15, color: colors.onSurfaceTertiary, marginTop: spacing.xs, marginBottom: spacing.lg },
  modeRow: {
    flexDirection: "row", gap: spacing.sm, backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.pill, padding: spacing.xs, marginBottom: spacing.lg,
  },
  modePill: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: spacing.md, borderRadius: radius.pill,
  },
  modePillActive: { backgroundColor: colors.brand },
  modeText: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.onSurfaceTertiary },
  modeTextActive: { color: colors.onBrand },
  searchCard: {
    flexDirection: "column", backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs,
    borderWidth: 1, borderColor: colors.border, ...shadow.card,
  },
  inputRow: { flexDirection: "row", alignItems: "center" },
  input: {
    flex: 1, fontFamily: fonts.bodyBold, fontSize: 17, lineHeight: 22, color: colors.onSurface,
    paddingVertical: spacing.md, maxHeight: 110,
  },
  prefix: {
    fontFamily: fonts.bodyExtra, fontSize: 14, lineHeight: 20, color: colors.brand,
  },
  locChip: {
    flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start",
    backgroundColor: colors.brandTertiary, borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.lg,
  },
  locText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.onBrandTertiary },
  locBlockedText: {
    fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.brand,
    marginTop: -spacing.sm, marginBottom: spacing.md,
  },
  askBtn: {
    width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center", marginLeft: spacing.sm,
  },
  sectionLabel: {
    fontFamily: fonts.bodyExtra, fontSize: 12, letterSpacing: 1, color: colors.onSurfaceTertiary,
    marginTop: spacing.xl, marginBottom: spacing.md,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.pill,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.onSurfaceTertiary },
  recentRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.md,
    padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  recentText: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 15, color: colors.onSurface },
  footer: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    marginTop: spacing.xxxl, opacity: 0.8,
  },
  footerText: { fontFamily: fonts.bodyBold, fontSize: 12, color: "#A8A29A" },
});
