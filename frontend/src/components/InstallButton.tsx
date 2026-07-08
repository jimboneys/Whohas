import { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Platform, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, fonts, spacing, radius, shadow } from "@/src/theme";

// PWA "Add to Home Screen" button (web only).
// - Chrome / Android / Edge: captures beforeinstallprompt and fires the native install dialog.
// - iOS Safari / browsers without a prompt: shows platform-aware manual steps.
// - Native app or already-installed: renders nothing.
type Platf = "ios" | "android" | "desktop";

export default function InstallButton({ compact = false }: { compact?: boolean }) {
  const [deferred, setDeferred] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [platf, setPlatf] = useState<Platf>("desktop");

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const w = window as any;

    const standalone =
      w.matchMedia?.("(display-mode: standalone)")?.matches ||
      w.navigator?.standalone === true;
    if (standalone) return; // already installed

    const ua = (w.navigator?.userAgent || "").toLowerCase();
    if (/iphone|ipad|ipod/.test(ua) && !w.MSStream) setPlatf("ios");
    else if (/android/.test(ua)) setPlatf("android");
    else setPlatf("desktop");

    setShow(true); // always offer install on web

    const onPrompt = (e: any) => {
      e.preventDefault();
      setDeferred(e);
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

  const handlePress = async () => {
    if (deferred) {
      deferred.prompt();
      try {
        const { outcome } = await deferred.userChoice;
        if (outcome === "accepted") setShow(false);
      } catch {
        /* dismissed */
      }
      setDeferred(null);
      return;
    }
    setHelpOpen(true);
  };

  const steps =
    platf === "ios"
      ? [
          ["share-outline", "Tap the ", "Share", " button in Safari"],
          ["add-outline", "Scroll and tap ", "Add to Home Screen", ""],
          ["checkmark-circle-outline", "Tap ", "Add", " — done! 🎉"],
        ]
      : platf === "android"
      ? [
          ["ellipsis-vertical-outline", "Open the ", "browser menu", " (⋮)"],
          ["add-outline", "Tap ", "Add to Home screen", " or Install app"],
          ["checkmark-circle-outline", "Confirm ", "Install", " — done! 🎉"],
        ]
      : [
          ["download-outline", "Click the ", "install icon", " in the address bar"],
          ["add-outline", "Or open the browser menu → ", "Install WhoHas", ""],
          ["checkmark-circle-outline", "Confirm ", "Install", " — done! 🎉"],
        ];

  return (
    <>
      {compact ? (
        <Pressable
          testID="install-button"
          style={({ pressed }) => [styles.compactBtn, pressed && { opacity: 0.85 }]}
          onPress={handlePress}
          hitSlop={8}
        >
          <Ionicons name="add" size={16} color={colors.brand} />
          <Text style={styles.compactText}>homepage</Text>
        </Pressable>
      ) : (
        <Pressable
          testID="install-button"
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.9 }]}
          onPress={handlePress}
        >
          <Ionicons name="download-outline" size={16} color={colors.onBrand} />
          <Text style={styles.btnText}>Add to Home Screen</Text>
        </Pressable>
      )}

      <Modal visible={helpOpen} transparent animationType="fade" onRequestClose={() => setHelpOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setHelpOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHead}>
              <Ionicons name="phone-portrait-outline" size={22} color={colors.brand} />
              <Text style={styles.sheetTitle}>Install WhoHas</Text>
            </View>
            {steps.map(([icon, pre, bold, post], i) => (
              <View key={i} style={styles.stepRow}>
                <Ionicons name={icon as any} size={18} color={colors.brand} />
                <Text style={styles.step}>
                  {pre}
                  <Text style={styles.bold}>{bold}</Text>
                  {post}
                </Text>
              </View>
            ))}
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
  btn: {
    flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start",
    backgroundColor: colors.brand, borderRadius: radius.pill,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, marginBottom: spacing.lg,
    ...shadow.soft,
  },
  btnText: { fontFamily: fonts.bodyExtra, fontSize: 13, color: colors.onBrand },
  compactBtn: {
    flexDirection: "row", alignItems: "center", gap: 2,
    height: 40, borderRadius: radius.pill, backgroundColor: colors.brandTertiary,
    paddingHorizontal: spacing.md,
  },
  compactText: { fontFamily: fonts.bodyExtra, fontSize: 12.5, color: colors.brand },
  backdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: spacing.xl,
  },
  sheet: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md,
    ...shadow.card,
  },
  sheetHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xs },
  sheetTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.onSurface },
  stepRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  step: { flex: 1, fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.onSurfaceTertiary },
  bold: { fontFamily: fonts.bodyExtra, color: colors.onSurface },
  gotIt: {
    backgroundColor: colors.brand, borderRadius: radius.pill, paddingVertical: spacing.md,
    alignItems: "center", marginTop: spacing.sm,
  },
  gotItText: { fontFamily: fonts.bodyExtra, fontSize: 15, color: colors.onBrand },
});
