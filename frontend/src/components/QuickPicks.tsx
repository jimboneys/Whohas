import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import * as Haptics from "expo-haptics";

import { colors, fonts, spacing, radius, shadow } from "@/src/theme";

type Pick = { label: string; emoji: string; accent: string; tint: string };

const PICKS: Pick[] = [
  { label: "Eggs", emoji: "🥚", accent: "#F2712B", tint: "#FFE8D6" },
  { label: "Milk", emoji: "🥛", accent: "#118AB2", tint: "#E3F2F7" },
  { label: "Bread", emoji: "🍞", accent: "#C98A00", tint: "#FBF0D0" },
  { label: "Coffee", emoji: "☕", accent: "#7B4B27", tint: "#EFE1D6" },
  { label: "Chicken", emoji: "🍗", accent: "#EF476F", tint: "#FDE0E8" },
  { label: "Bananas", emoji: "🍌", accent: "#B59B00", tint: "#FBF6D0" },
  { label: "Rice", emoji: "🍚", accent: "#06A77D", tint: "#D6F4EA" },
  { label: "Paper towels", emoji: "🧻", accent: "#7B61FF", tint: "#ECE6FF" },
];

export default function QuickPicks({ onPick }: { onPick: (label: string) => void }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>POPULAR PICKS</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {PICKS.map((p) => (
          <Pressable
            key={p.label}
            testID={`quick-pick-${p.label.replace(/\s+/g, "-")}`}
            style={({ pressed }) => [styles.box, { backgroundColor: p.tint }, pressed && { opacity: 0.85 }]}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onPick(p.label.toLowerCase());
            }}
          >
            <Text style={styles.emoji}>{p.emoji}</Text>
            <Text style={[styles.boxLabel, { color: p.accent }]} numberOfLines={1}>{p.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: {
    fontFamily: fonts.bodyExtra, fontSize: 12, letterSpacing: 1,
    color: colors.onSurfaceTertiary, marginBottom: spacing.md,
  },
  row: { gap: spacing.md, paddingRight: spacing.md },
  box: {
    width: 66, height: 66, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center", gap: 2, ...shadow.soft,
  },
  emoji: { fontSize: 22 },
  boxLabel: { fontFamily: fonts.bodyExtra, fontSize: 10.5 },
});
