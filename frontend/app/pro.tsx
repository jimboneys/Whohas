import { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, Linking, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";

import { colors, fonts, spacing, radius, shadow } from "@/src/theme";
import { getDeviceId, originUrl, setPendingSession, getPendingSession, clearPendingSession } from "@/src/pro";
import { createProCheckout, getProStatus, getProEntitlement } from "@/src/api";

const PERKS = [
  { icon: "sparkles", text: "Ad-free — no sponsor boxes" },
  { icon: "infinite", text: "Unlimited searches, no daily limit" },
  { icon: "trending-down", text: "Price history & drop alerts" },
  { icon: "heart", text: "Save unlimited grocery lists & favorites" },
  { icon: "flash", text: "Exclusive Pro-only deals" },
];

const PLANS = [
  { key: "yearly" as const, title: "Yearly", price: "$60", per: "/year", sub: "Just $5/mo · Save 28%", best: true },
  { key: "monthly" as const, title: "Monthly", price: "$6.99", per: "/month", sub: "Billed monthly", best: false },
];

export default function ProScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ session_id?: string }>();
  const [selected, setSelected] = useState<"yearly" | "monthly">("yearly");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [pro, setPro] = useState(false);
  const [expires, setExpires] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const id = await getDeviceId();
    const e = await getProEntitlement(id);
    setPro(e.pro);
    setExpires(e.expires_at || null);
  }, []);

  const poll = useCallback(async (sessionId: string) => {
    setChecking(true);
    for (let i = 0; i < 8; i++) {
      try {
        const s = await getProStatus(sessionId);
        if (s.payment_status === "paid") {
          await clearPendingSession();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          setPro(true);
          setExpires(s.expires_at || null);
          break;
        }
        if (s.status === "expired") break;
      } catch {
        /* retry */
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    setChecking(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const fromRedirect = params.session_id as string | undefined;
      (async () => {
        const pending = fromRedirect || (await getPendingSession());
        if (pending) poll(pending);
      })();
    }, [refresh, poll, params.session_id])
  );

  const subscribe = async () => {
    setBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const id = await getDeviceId();
      const { url, session_id } = await createProCheckout(selected, id, originUrl());
      await setPendingSession(session_id);
      if (Platform.OS === "web") {
        (window as any).location.href = url;
      } else {
        await WebBrowser.openBrowserAsync(url);
        poll(session_id);
      }
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="pro-back">
          <Ionicons name="chevron-back" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>WhoHas Pro</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxxl }}>
        <View style={styles.hero}>
          <View style={styles.crown}>
            <Ionicons name="ribbon" size={30} color={colors.onBrand} />
          </View>
          <Text style={styles.heroTitle}>Unlock WhoHas Pro</Text>
          <Text style={styles.heroSub}>Smarter savings, zero ads.</Text>
        </View>

        {pro ? (
          <View style={styles.activeBox} testID="pro-active">
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            <Text style={styles.activeText}>
              You're Pro 🎉{expires ? `  ·  Renews/expires ${new Date(expires).toLocaleDateString()}` : ""}
            </Text>
          </View>
        ) : null}

        <View style={styles.perks}>
          {PERKS.map((p) => (
            <View key={p.text} style={styles.perkRow}>
              <View style={styles.perkIcon}>
                <Ionicons name={p.icon as any} size={16} color={colors.brand} />
              </View>
              <Text style={styles.perkText}>{p.text}</Text>
            </View>
          ))}
        </View>

        {!pro && (
          <>
            {PLANS.map((pl) => {
              const active = selected === pl.key;
              return (
                <Pressable
                  key={pl.key}
                  testID={`plan-${pl.key}`}
                  style={[styles.plan, active && styles.planActive]}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setSelected(pl.key);
                  }}
                >
                  <View style={[styles.radio, active && styles.radioActive]}>
                    {active ? <View style={styles.radioDot} /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.planTitleRow}>
                      <Text style={styles.planTitle}>{pl.title}</Text>
                      {pl.best ? (
                        <View style={styles.bestTag}><Text style={styles.bestTagText}>BEST VALUE</Text></View>
                      ) : null}
                    </View>
                    <Text style={styles.planSub}>{pl.sub}</Text>
                  </View>
                  <Text style={styles.planPrice}>
                    {pl.price}<Text style={styles.planPer}>{pl.per}</Text>
                  </Text>
                </Pressable>
              );
            })}

            <Pressable
              testID="subscribe-button"
              style={({ pressed }) => [styles.cta, (pressed || busy) && { opacity: 0.85 }]}
              onPress={subscribe}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={colors.onBrand} />
              ) : (
                <Text style={styles.ctaText}>
                  Subscribe · {selected === "yearly" ? "$60/year" : "$6.99/month"}
                </Text>
              )}
            </Pressable>
            {checking ? (
              <View style={styles.checkingRow}>
                <ActivityIndicator size="small" color={colors.brand} />
                <Text style={styles.checkingText}>Confirming your payment…</Text>
              </View>
            ) : null}

            <Text style={styles.legal}>
              Secure payment by Stripe. By subscribing you agree to our{" "}
              <Text style={styles.link} onPress={() => router.push("/terms")}>Terms</Text>.
              Cancel anytime.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
  },
  headerTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.onSurface },
  hero: { alignItems: "center", marginBottom: spacing.xl },
  crown: {
    width: 60, height: 60, borderRadius: radius.lg, backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.md, ...shadow.soft,
  },
  heroTitle: { fontFamily: fonts.display, fontSize: 26, color: colors.onSurface },
  heroSub: { fontFamily: fonts.body, fontSize: 15, color: colors.onSurfaceTertiary, marginTop: 2 },
  activeBox: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.successSoft, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.lg,
  },
  activeText: { flex: 1, fontFamily: fonts.bodyExtra, fontSize: 14, color: colors.onSuccess },
  perks: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg,
    gap: spacing.md, marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.border,
  },
  perkRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  perkIcon: {
    width: 30, height: 30, borderRadius: radius.sm, backgroundColor: colors.brandTertiary,
    alignItems: "center", justifyContent: "center",
  },
  perkText: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.onSurface },
  plan: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 2, borderColor: colors.border, marginBottom: spacing.md,
  },
  planActive: { borderColor: colors.brand, backgroundColor: colors.brandTertiary },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#C9C3B8",
    alignItems: "center", justifyContent: "center",
  },
  radioActive: { borderColor: colors.brand },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.brand },
  planTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  planTitle: { fontFamily: fonts.display, fontSize: 17, color: colors.onSurface },
  bestTag: { backgroundColor: colors.success, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 1 },
  bestTagText: { fontFamily: fonts.bodyExtra, fontSize: 9, letterSpacing: 0.5, color: colors.onSuccess },
  planSub: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.onSurfaceTertiary, marginTop: 1 },
  planPrice: { fontFamily: fonts.display, fontSize: 20, color: colors.onSurface },
  planPer: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.onSurfaceTertiary },
  cta: {
    backgroundColor: colors.brand, borderRadius: radius.pill, paddingVertical: spacing.lg,
    alignItems: "center", marginTop: spacing.sm, ...shadow.soft,
  },
  ctaText: { fontFamily: fonts.bodyExtra, fontSize: 16, color: colors.onBrand },
  checkingRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: spacing.md },
  checkingText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.onSurfaceTertiary },
  legal: {
    fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.onSurfaceTertiary,
    textAlign: "center", marginTop: spacing.lg,
  },
  link: { fontFamily: fonts.bodyExtra, color: colors.brand },
});
