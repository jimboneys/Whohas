import { useState, useCallback, useEffect } from "react";
import {
  View, Text, TextInput, StyleSheet, ScrollView, Pressable,
  KeyboardAvoidingView, Platform, Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { colors, fonts, spacing, radius, shadow } from "@/src/theme";
import { getHistory } from "@/src/history";
import { suggest } from "@/src/api";

const EXAMPLES = [
  "the best wings",
  "discounts on pizza",
  "the world record for fastest mile",
  "the cheapest iPhone",
  "the best tacos near me",
];

export default function AskScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      getHistory().then((h) => setRecent(h.slice(0, 4).map((x) => x.q)));
    }, [])
  );

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Keyboard.dismiss();
    router.push({ pathname: "/results", params: { q: value } });
  };

  const askChip = (phrase: string) => submit(`Who has ${phrase}?`);

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
            <Ionicons name="search" size={20} color={colors.onBrand} />
          </View>
          <Text style={styles.wordmark}>
            Who<Text style={{ color: colors.brand }}>Has</Text>
          </Text>
        </View>
        <Text style={styles.tagline}>Ask anything. Find out who has it. 🔎</Text>

        <View style={styles.searchCard} testID="search-card">
          <TextInput
            testID="ask-input"
            style={styles.input}
            placeholder="who has the best..."
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

        {q.trim().length === 0 ? (
          <>
            <Text style={styles.sectionLabel}>TRY ASKING</Text>
            <View style={styles.chipWrap}>
              {EXAMPLES.map((e) => (
                <Pressable
                  key={e}
                  testID={`example-chip-${e.replace(/\s+/g, "-")}`}
                  style={({ pressed }) => [styles.chip, pressed && { backgroundColor: colors.brand }]}
                  onPress={() => askChip(e)}
                >
                  <Text style={styles.chipText}>{e}</Text>
                </Pressable>
              ))}
            </View>

            {recent.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>RECENT</Text>
                {recent.map((r) => (
                  <Pressable
                    key={r}
                    testID={`recent-${r.replace(/\s+/g, "-")}`}
                    style={styles.recentRow}
                    onPress={() => submit(r)}
                  >
                    <Ionicons name="time-outline" size={18} color={colors.onSurfaceTertiary} />
                    <Text style={styles.recentText} numberOfLines={1}>{r}</Text>
                    <Ionicons name="arrow-up-outline" size={16} color="#C9C3B8" style={{ transform: [{ rotate: "45deg" }] }} />
                  </Pressable>
                ))}
              </>
            )}
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
  tagline: { fontFamily: fonts.body, fontSize: 15, color: colors.onSurfaceTertiary, marginTop: spacing.xs, marginBottom: spacing.xl },
  searchCard: {
    flexDirection: "row", alignItems: "flex-end", backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg, padding: spacing.sm, paddingLeft: spacing.lg,
    borderWidth: 1, borderColor: colors.border, ...shadow.card,
  },
  input: {
    flex: 1, fontFamily: fonts.bodyBold, fontSize: 18, color: colors.onSurface,
    paddingVertical: spacing.md, maxHeight: 110,
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
    backgroundColor: colors.brandTertiary, borderRadius: radius.pill,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.onBrandTertiary },
  recentRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.md,
    padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  recentText: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 15, color: colors.onSurface },
});
