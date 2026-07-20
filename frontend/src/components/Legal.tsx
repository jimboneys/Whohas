import { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, StyleSheet, Pressable, Modal, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { colors, fonts, spacing, radius, shadow } from "@/src/theme";
import { storage } from "@/src/utils/storage";

const TERMS_KEY = "whohas_terms_accepted";
const NDA_KEY = "whohas_sponsor_nda_accepted";

// First-launch user consent to Terms & Privacy.
export function TermsGate() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    storage.getItem(TERMS_KEY, "").then((v) => {
      if (!v) setOpen(true);
    });
  }, []);

  const accept = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await storage.setItem(TERMS_KEY, "1");
    setOpen(false);
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.iconBadge}>
            <Ionicons name="shield-checkmark" size={24} color={colors.brand} />
          </View>
          <Text style={styles.title}>Welcome to WhoHas</Text>
          <Text style={styles.body}>
            WhoHas is anonymous — no accounts, no data harvesting. By continuing you agree to our{" "}
            <Text style={styles.link} onPress={() => router.push("/terms")}>Terms & Privacy</Text>.
          </Text>
          <Pressable style={styles.primary} onPress={accept} testID="terms-accept">
            <Text style={styles.primaryText}>I Agree & Continue</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/terms")} testID="terms-review">
            <Text style={styles.secondaryText}>Review full terms</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// Sponsor/advertiser NDA gate — call guard(action) before any "book/advertise" action.
export function useSponsorNDA() {
  const [open, setOpen] = useState(false);
  const pending = useRef<null | (() => void)>(null);
  const router = useRouter();

  const guard = useCallback(async (action: () => void) => {
    const accepted = await storage.getItem(NDA_KEY, "");
    if (accepted) {
      action();
      return;
    }
    pending.current = action;
    setOpen(true);
  }, []);

  const accept = async () => {
    Haptics.selectionAsync().catch(() => {});
    await storage.setItem(NDA_KEY, "1");
    setOpen(false);
    const a = pending.current;
    pending.current = null;
    a?.();
  };

  const modal = (
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.iconBadge}>
            <Ionicons name="document-lock" size={22} color={colors.brand} />
          </View>
          <Text style={styles.title}>Advertiser NDA</Text>
          <ScrollView style={styles.ndaScroll}>
            <Text style={styles.body}>
              Before booking a placement, you agree that all rates, performance metrics, roadmap and
              other non-public information shared by WhoHas are confidential (mutual NDA). You will not
              disclose or misuse it, and submitted ads must be lawful, accurate and non-deceptive. WhoHas
              may reject or remove any ad. See the full{" "}
              <Text style={styles.link} onPress={() => router.push("/terms")}>Sponsor Agreement</Text>.
            </Text>
          </ScrollView>
          <Pressable style={styles.primary} onPress={accept} testID="nda-accept">
            <Text style={styles.primaryText}>Agree & Continue</Text>
          </Pressable>
          <Pressable onPress={() => setOpen(false)} testID="nda-cancel">
            <Text style={styles.secondaryText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );

  return { guard, modal };
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: spacing.xl },
  sheet: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md, alignItems: "center", ...shadow.card },
  iconBadge: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.display, fontSize: 21, color: colors.onSurface, textAlign: "center" },
  body: { fontFamily: fonts.body, fontSize: 14.5, lineHeight: 21, color: colors.onSurfaceTertiary, textAlign: "center" },
  ndaScroll: { maxHeight: 160, alignSelf: "stretch" },
  link: { fontFamily: fonts.bodyExtra, color: colors.brand },
  primary: { backgroundColor: colors.brand, borderRadius: radius.pill, paddingVertical: spacing.md, paddingHorizontal: spacing.xxl, alignItems: "center", alignSelf: "stretch", marginTop: spacing.xs },
  primaryText: { fontFamily: fonts.bodyExtra, fontSize: 15.5, color: colors.onBrand },
  secondaryText: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.onSurfaceTertiary },
});
