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
import { suggest, getProEntitlement } from "@/src/api";
import { ensureLocation, getSavedCity } from "@/src/location";
import InstallButton from "@/src/components/InstallButton";
import AdSlots from "@/src/components/AdSlots";
import LocalSpecial from "@/src/components/LocalSpecial";
import QuickPicks from "@/src/components/QuickPicks";
import SponsorStrip from "@/src/components/SponsorStrip";
import PrivacyBadge from "@/src/components/PrivacyBadge";
import ProDeals from "@/src/components/ProDeals";
import { TermsGate } from "@/src/components/Legal";
import { getDeviceId } from "@/src/pro";

export default function AskScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [locBusy, setLocBusy] = useState(false);
  const [locBlocked, setLocBlocked] = useState(false);
  const [pro, setPro] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getSavedCity().then(setCity);
      getDeviceId().then((id) => getProEntitlement(id).then((e) => setPro(e.pro)));
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

        {pro ? (
          <View style={styles.proActiveBanner} testID="pro-active-badge">
            <Ionicons name="ribbon" size={15} color={colors.onSuccess} />
            <Text style={styles.proActiveText}>WhoHas Pro active · ad-free</Text>
          </View>
        ) : (
          <Pressable style={styles.goProBanner} onPress={() => router.push("/pro")} testID="go-pro-banner">
            <View style={styles.goProIcon}>
              <Ionicons name="ribbon" size={16} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.goProTitle}>Go Pro — ad-free + exclusive deals</Text>
              <Text style={styles.goProSub}>From $5/mo · yearly or monthly</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.onBrand} />
          </Pressable>
        )}

        {!pro && <SponsorStrip />}

        <QuickPicks onPick={(item) => submit(item)} />

        <View style={styles.searchCard} testID="search-card">
          <Ionicons name="search" size={20} color="#B5AFA5" />
          <TextInput
            testID="ask-input"
            style={styles.input}
            placeholder="Search groceries…"
            placeholderTextColor="#B5AFA5"
            value={q}
            onChangeText={setQ}
            onSubmitEditing={() => submit(q)}
            returnKeyType="search"
          />
          <Pressable
            testID="ask-submit-button"
            style={({ pressed }) => [styles.askBtn, pressed && { opacity: 0.85 }]}
            onPress={() => submit(q)}
          >
            <Ionicons name="arrow-forward" size={20} color={colors.onBrand} />
          </Pressable>
        </View>

        {q.trim().length === 0 ? (
          <>
            <LocalSpecial />
            <ProDeals pro={pro} onUpgrade={() => router.push("/pro")} />
            {!pro && <AdSlots />}
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
          <PrivacyBadge />
          <View style={styles.footerRow}>
            <Ionicons name="sparkles" size={12} color="#C9C3B8" />
            <Text style={styles.footerText}>Powered by Claude Sonnet 4.6</Text>
          </View>
        </View>
      </ScrollView>
      <TermsGate />
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
  goProBanner: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.brand, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, ...shadow.soft,
  },
  goProIcon: { width: 34, height: 34, borderRadius: radius.sm, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  goProTitle: { fontFamily: fonts.bodyExtra, fontSize: 14, color: colors.onBrand },
  goProSub: { fontFamily: fonts.bodyBold, fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 1 },
  proActiveBanner: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: colors.successSoft, borderRadius: radius.pill, paddingVertical: spacing.sm, marginBottom: spacing.lg,
  },
  proActiveText: { fontFamily: fonts.bodyExtra, fontSize: 13, color: colors.onSuccess },
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
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.pill, paddingLeft: spacing.lg, paddingRight: spacing.xs, paddingVertical: spacing.xs,
    borderWidth: 1, borderColor: colors.border, ...shadow.card,
  },
  input: {
    flex: 1, fontFamily: fonts.bodyBold, fontSize: 16, color: colors.onSurface,
    paddingVertical: spacing.sm,
  },
  askBtn: {
    width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center",
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
    alignItems: "center", gap: spacing.md,
    marginTop: spacing.xxxl,
  },
  footerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, opacity: 0.8 },
  footerText: { fontFamily: fonts.bodyBold, fontSize: 12, color: "#A8A29A" },
});
