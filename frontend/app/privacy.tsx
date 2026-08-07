import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, fonts, spacing, radius } from "@/src/theme";

const UPDATED = "June 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.h2}>{title}</Text>
      <Text style={styles.body}>{children}</Text>
    </View>
  );
}

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back} testID="privacy-back">
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>Last updated: {UPDATED}</Text>
        <Text style={styles.intro}>
          WhoHas is built around a simple promise: no accounts, no data harvesting. This policy
          explains exactly what we do and don't collect.
        </Text>

        <Section title="What we DON'T collect">
          WhoHas has no login and no user accounts. We do not collect your name, email, address,
          contacts, or advertising identifiers. We do not sell or share personal data with third
          parties, and we do not store your searches tied to your identity.
        </Section>

        <Section title="Location">
          If you tap “Use my location”, we detect your city on your device only, to show local
          deals and specials. Your city and precise location are NOT sent to or stored on our
          servers. We request coarse (approximate) location only, and never track you in the
          background. You can decline and still use the app.
        </Section>

        <Section title="Searches">
          Search queries are sent to our server to generate an answer (using AI). We may keep
          anonymous, aggregated query text to improve results, but it is never linked to you,
          your device, or your location.
        </Section>

        <Section title="Advertiser contact form">
          If you are a business and voluntarily submit the “Advertise” form, we store the business
          name, the contact info you provide, and the city, solely to follow up about advertising.
          This is optional and only collected when you choose to submit it.
        </Section>

        <Section title="Payments">
          Optional WhoHas Pro subscriptions are processed by Stripe. We never see or store your
          full card details — Stripe handles payment securely. We keep only a payment reference to
          activate your subscription on your device.
        </Section>

        <Section title="Affiliate & sponsored links">
          Some links (e.g., Amazon and sponsor boxes) are affiliate or paid placements marked
          “AD”. If you buy through them we may earn a commission at no extra cost to you. Tapping a
          link opens that third party’s site, governed by their own privacy policy.
        </Section>

        <Section title="Analytics">
          We may count anonymous, aggregate taps on sponsor boxes to report performance to
          advertisers. These counts are not tied to any individual.
        </Section>

        <Section title="Children">
          WhoHas is intended for a general audience and is not directed to children under 13. We do
          not knowingly collect personal information from children.
        </Section>

        <Section title="Your choices">
          Because we don’t hold personal accounts or profiles, there’s little personal data to
          manage. You can clear your saved city and grocery list at any time from within the app.
        </Section>

        <Section title="Contact">
          Questions about this policy? Email us at privacy@whohas.app.
        </Section>

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  back: {
    width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary,
    alignItems: "center", justifyContent: "center",
  },
  title: { fontFamily: fonts.display, fontSize: 20, color: colors.onSurface },
  content: { padding: spacing.xl },
  updated: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.onSurfaceTertiary },
  intro: {
    fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.onSurface,
    marginTop: spacing.md, marginBottom: spacing.lg,
  },
  section: { marginBottom: spacing.lg },
  h2: { fontFamily: fonts.bodyExtra, fontSize: 16, color: colors.onSurface, marginBottom: spacing.xs },
  body: { fontFamily: fonts.body, fontSize: 14.5, lineHeight: 22, color: colors.onSurfaceTertiary },
});
