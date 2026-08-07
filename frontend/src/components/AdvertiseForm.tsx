import { useState } from "react";
import {
  View, Text, StyleSheet, Modal, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { colors, fonts, spacing, radius, shadow } from "@/src/theme";
import { submitAdvertiser } from "@/src/api";

// Lead-capture popup for local businesses that want to advertise in a city.
export default function AdvertiseForm({
  visible,
  city,
  onClose,
}: {
  visible: boolean;
  city?: string;
  onClose: () => void;
}) {
  const [business, setBusiness] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const cityLabel = city && city.trim() ? city.trim() : "your city";

  const reset = () => {
    setBusiness("");
    setContact("");
    setMessage("");
    setDone(false);
    setBusy(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const canSubmit = business.trim().length > 0 && contact.trim().length >= 3 && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      await submitAdvertiser({ business, contact, city: city || "", message });
      setDone(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={close} testID="advertise-backdrop" />
        <View style={styles.sheet} testID="advertise-form">
          <View style={styles.grabber} />
          <Pressable style={styles.closeBtn} onPress={close} hitSlop={10} testID="advertise-close">
            <Ionicons name="close" size={20} color={colors.onSurfaceTertiary} />
          </Pressable>

          {done ? (
            <View style={styles.doneWrap} testID="advertise-success">
              <View style={styles.doneIcon}>
                <Ionicons name="checkmark" size={30} color={colors.onSuccess} />
              </View>
              <Text style={styles.doneTitle}>Thanks! 🎉</Text>
              <Text style={styles.doneSub}>
                We got your info and will reach out about advertising in {cityLabel}.
              </Text>
              <Pressable style={styles.submitBtn} onPress={close} testID="advertise-done">
                <Text style={styles.submitText}>Done</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.iconBadge}>
                <Ionicons name="megaphone" size={22} color={colors.onBrand} />
              </View>
              <Text style={styles.title}>Advertise in {cityLabel}</Text>
              <Text style={styles.prompt}>
                Want to promote your business in {cityLabel}? Leave your contact info here.
              </Text>

              <TextInput
                testID="advertise-business"
                style={styles.input}
                placeholder="Business name"
                placeholderTextColor="#B5AFA5"
                value={business}
                onChangeText={setBusiness}
              />
              <TextInput
                testID="advertise-contact"
                style={styles.input}
                placeholder="Email or phone"
                placeholderTextColor="#B5AFA5"
                value={contact}
                onChangeText={setContact}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextInput
                testID="advertise-message"
                style={[styles.input, styles.textarea]}
                placeholder="Tell us about your business (optional)"
                placeholderTextColor="#B5AFA5"
                value={message}
                onChangeText={setMessage}
                multiline
              />

              <Pressable
                testID="advertise-submit"
                style={[styles.submitBtn, !canSubmit && { opacity: 0.5 }]}
                onPress={submit}
                disabled={!canSubmit}
              >
                {busy ? (
                  <ActivityIndicator size="small" color={colors.onBrand} />
                ) : (
                  <Text style={styles.submitText}>Send my info</Text>
                )}
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    ...shadow.card,
  },
  grabber: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong,
    alignSelf: "center", marginBottom: spacing.lg,
  },
  closeBtn: { position: "absolute", top: spacing.lg, right: spacing.lg, padding: 4, zIndex: 2 },
  iconBadge: {
    width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.md,
  },
  title: { fontFamily: fonts.display, fontSize: 22, color: colors.onSurface },
  prompt: {
    fontFamily: fonts.body, fontSize: 14.5, lineHeight: 21, color: colors.onSurfaceTertiary,
    marginTop: spacing.xs, marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: fonts.bodyBold,
    fontSize: 15.5,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  textarea: { minHeight: 80, textAlignVertical: "top" },
  submitBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
    alignItems: "center",
    marginTop: spacing.xs,
  },
  submitText: { fontFamily: fonts.bodyExtra, fontSize: 16, color: colors.onBrand },
  doneWrap: { alignItems: "center", paddingVertical: spacing.lg, gap: spacing.sm },
  doneIcon: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: colors.success,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.xs,
  },
  doneTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.onSurface },
  doneSub: {
    fontFamily: fonts.body, fontSize: 14.5, lineHeight: 21, color: colors.onSurfaceTertiary,
    textAlign: "center", marginBottom: spacing.md, paddingHorizontal: spacing.md,
  },
});
