import { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Platform, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { colors, fonts, spacing, radius, shadow } from "@/src/theme";
import { storage } from "@/src/utils/storage";

const DISMISS_KEY = "whohas_install_banner_dismissed";

// Prominent, dismissible "Install app" banner for the PWA (web only).
export default function InstallBanner() {
  const [deferred, setDeferred] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const w = window as any;

    const standalone =
      w.matchMedia?.("(display-mode: standalone)")?.matches || w.navigator?.standalone === true;
    if (standalone) return;

    storage.getItem(DISMISS_KEY, "").then((dismissed) => {
      if (dismissed) return;
      const ua = (w.navigator?.userAgent || "").toLowerCase();
      const iOS = /iphone|ipad|ipod/.test(ua) && !w.MSStream;
      if (iOS) {
        setIsIos(true);
        setShow(true);
      }
    });

    const onPrompt = (e: any) => {
      e.preventDefault();
      setDeferred(e);
      storage.getItem(DISMISS_KEY, "").then((d) => {
        if (!d) setShow(true);
      });
    };
    const onInstalled = () => setShow(false);
    w.addEventListener("beforeinstallprompt", onPrompt);
    w.addEventListener("appinstalled", onInstalled);
    return () => {
      w.removeEventListener("beforeinstallprompt", onPrompt);
      w.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (Platform.OS !== "web" || !show) return null;

  const dismiss = async () => {
    Haptics.selectionAsync().catch(() => {});
    setShow(false);
    await storage.setItem(DISMISS_KEY, "1");
  };

  const install = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (isIos || !deferred) {
      setHelpOpen(true);
      return;
    }
    deferred.prompt();
    try {
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") setShow(false);
    } catch {
      /* dismissed */
    }
    setDeferred(null);
  };

  return (
    <>
      <View style={styles.banner} testID="install-banner">
        <View style={styles.iconBadge}>
          <Ionicons name="download-outline" size={20} color={colors.onBrand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Install WhoHas</Text>
          <Text style={styles.sub}>Add to your home screen for 1-tap access</Text>
        </View>
        <Pressable style={styles.installBtn} onPress={install} testID="install-banner-btn">
          <Text style={styles.installText}>Install</Text>
        </Pressable>
        <Pressable onPress={dismiss} hitSlop={8} testID="install-banner-dismiss">
          <Ionicons name="close" size={18} color={colors.onSurfaceTertiary} />
        </Pressable>
      </View>

      <Modal visible={helpOpen} transparent animationType="fade" onRequestClose={() => setHelpOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setHelpOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHead}>
              <Ionicons name="phone-portrait-outline" size={22} color={colors.brand} />
              <Text style={styles.sheetTitle}>Install WhoHas</Text>
            </View>
            {isIos ? (
              <>
                <Text style={styles.step}>1. Tap the <Text style={styles.bold}>Share</Text> button in Safari</Text>
                <Text style={styles.step}>2. Tap <Text style={styles.bold}>Add to Home Screen</Text></Text>
                <Text style={styles.step}>3. Tap <Text style={styles.bold}>Add</Text> — done! 🎉</Text>
              </>
            ) : (
              <>
                <Text style={styles.step}>Open your browser menu</Text>
                <Text style={styles.step}>Tap <Text style={styles.bold}>Install app</Text> / <Text style={styles.bold}>Add to Home screen</Text></Text>
              </>
            )}
            <Pressable style={styles.gotIt} onPress={() => setHelpOpen(false)}>
              <Text style={styles.gotItText}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.md,
    marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadow.soft,
  },
  iconBadge: {
    width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center",
  },
  title: { fontFamily: fonts.bodyExtra, fontSize: 14.5, color: colors.onSurface },
  sub: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.onSurfaceTertiary, marginTop: 1 },
  installBtn: {
    backgroundColor: colors.brand, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  installText: { fontFamily: fonts.bodyExtra, fontSize: 13, color: colors.onBrand },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: spacing.xl },
  sheet: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md, ...shadow.card },
  sheetHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xs },
  sheetTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.onSurface },
  step: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.onSurfaceTertiary },
  bold: { fontFamily: fonts.bodyExtra, color: colors.onSurface },
  gotIt: { backgroundColor: colors.brand, borderRadius: radius.pill, paddingVertical: spacing.md, alignItems: "center", marginTop: spacing.sm },
  gotItText: { fontFamily: fonts.bodyExtra, fontSize: 15, color: colors.onBrand },
});
