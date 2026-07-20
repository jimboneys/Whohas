import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, fonts, spacing } from "@/src/theme";

const SECTIONS: { title: string; body: string }[] = [
  {
    title: "1. Agreement to Terms",
    body:
      "By using WhoHas you agree to these Terms. WhoHas is an informational price-discovery tool. Prices, deals and store availability are estimates and may change — always confirm the final price with the retailer before purchasing. We are not responsible for third-party pricing, availability or content.",
  },
  {
    title: "2. Anonymity & Privacy",
    body:
      "WhoHas is anonymous by design. We do not require accounts, and we do not sell or harvest your personal data. Searches are stored anonymously and are never linked to your identity. Your location is used only to localize results and is not stored with your searches.",
  },
  {
    title: "3. Community Conduct",
    body:
      "You are responsible for content you post in the Community. Do not post unlawful, misleading, hateful, or infringing content. We may remove content or restrict access that violates these Terms.",
  },
  {
    title: "4. WhoHas Pro & Payments",
    body:
      "Pro plans are billed through Stripe. Yearly ($60) and Monthly ($6.99) plans grant Pro access for the stated period. Payments are final except where required by law. Pro entitlement is tied to your device.",
  },
  {
    title: "5. Sponsor / Advertiser Agreement & NDA",
    body:
      "Advertisers and sponsors (\"Partners\") who book a placement agree that: (a) all pricing, rates, performance metrics (impressions/clicks), roadmap details and any non-public information shared by WhoHas are CONFIDENTIAL and constitute a mutual Non-Disclosure Agreement (NDA); (b) Partners will not disclose, reproduce or use such confidential information except to evaluate or fulfill the placement; (c) submitted creative must be accurate, lawful and non-deceptive; (d) WhoHas may reject or remove any ad at its discretion; (e) this NDA survives termination of the placement. Booking a spot or contacting us to advertise constitutes acceptance of this Agreement.",
  },
  {
    title: "6. Disclaimers & Liability",
    body:
      "WhoHas is provided \"as is\" without warranties. To the maximum extent permitted by law, WhoHas is not liable for any indirect or consequential damages arising from use of the app or reliance on displayed prices or deals.",
  },
  {
    title: "7. Changes",
    body:
      "We may update these Terms from time to time. Continued use after changes means you accept the updated Terms.",
  },
];

export default function TermsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="terms-back">
          <Ionicons name="chevron-back" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Terms & Agreements</Text>
        <View style={{ width: 26 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxxl }}>
        <Text style={styles.intro}>
          Terms of Service, Privacy commitment, and the Sponsor/Advertiser NDA for WhoHas.
        </Text>
        {SECTIONS.map((s) => (
          <View key={s.title} style={styles.section}>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.body}>{s.body}</Text>
          </View>
        ))}
        <Text style={styles.footer}>Last updated: June 2026</Text>
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
  intro: { fontFamily: fonts.body, fontSize: 14, color: colors.onSurfaceTertiary, marginBottom: spacing.lg, lineHeight: 20 },
  section: { marginBottom: spacing.xl },
  title: { fontFamily: fonts.display, fontSize: 16, color: colors.onSurface, marginBottom: spacing.xs },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.onSurfaceTertiary },
  footer: { fontFamily: fonts.bodyBold, fontSize: 12, color: "#A8A29A", textAlign: "center", marginTop: spacing.lg },
});
