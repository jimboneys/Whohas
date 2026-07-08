import { View, Text, StyleSheet, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { fonts, spacing, radius } from "@/src/theme";

const ORANGE = "#FF8C42";
const ORANGE_DEEP = "#F2712B";

// Local restaurant special of the day (mock / demo content).
const SPECIAL = {
  restaurant: "Sunrise Grill & Diner",
  area: "Downtown · American",
  mapsQuery: "Sunrise Grill & Diner near me",
  lunch: { dish: "Grilled chicken bowl + drink", price: "$8.99" },
  dinner: { dish: "Ribeye steak & fries", price: "$16.99" },
};

export default function LocalSpecial() {
  const open = () => {
    Haptics.selectionAsync().catch(() => {});
    Linking.openURL(
      `https://www.google.com/maps/search/${encodeURIComponent(SPECIAL.mapsQuery)}`
    ).catch(() => {});
  };

  return (
    <Pressable
      testID="local-special"
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.94 }]}
      onPress={open}
    >
      <View style={styles.headRow}>
        <View style={styles.iconBadge}>
          <Ionicons name="restaurant" size={18} color={ORANGE} />
        </View>
        <Text style={styles.eyebrow}>LOCAL SPECIAL OF THE DAY</Text>
      </View>

      <Text style={styles.restaurant}>{SPECIAL.restaurant}</Text>
      <Text style={styles.area}>{SPECIAL.area}</Text>

      <View style={styles.divider} />

      <View style={styles.mealRow}>
        <View style={styles.mealTag}>
          <Ionicons name="sunny" size={13} color="#FFFFFF" />
          <Text style={styles.mealTagText}>Lunch</Text>
        </View>
        <Text style={styles.dish} numberOfLines={1}>{SPECIAL.lunch.dish}</Text>
        <Text style={styles.price}>{SPECIAL.lunch.price}</Text>
      </View>

      <View style={[styles.mealRow, { marginTop: spacing.sm }]}>
        <View style={styles.mealTag}>
          <Ionicons name="moon" size={13} color="#FFFFFF" />
          <Text style={styles.mealTagText}>Dinner</Text>
        </View>
        <Text style={styles.dish} numberOfLines={1}>{SPECIAL.dinner.dish}</Text>
        <Text style={styles.price}>{SPECIAL.dinner.price}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: ORANGE,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
    shadowColor: ORANGE_DEEP,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 5,
  },
  headRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  iconBadge: {
    width: 30, height: 30, borderRadius: radius.sm, backgroundColor: "#FFFFFF",
    alignItems: "center", justifyContent: "center",
  },
  eyebrow: { fontFamily: fonts.bodyExtra, fontSize: 11, letterSpacing: 1, color: "rgba(255,255,255,0.9)" },
  restaurant: { fontFamily: fonts.display, fontSize: 21, color: "#FFFFFF", marginTop: spacing.md },
  area: { fontFamily: fonts.bodyBold, fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 1 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.25)", marginVertical: spacing.md },
  mealRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  mealTag: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.22)", borderRadius: radius.pill,
    paddingHorizontal: spacing.sm, paddingVertical: 3, width: 78,
  },
  mealTagText: { fontFamily: fonts.bodyExtra, fontSize: 11.5, color: "#FFFFFF" },
  dish: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 14, color: "#FFFFFF" },
  price: { fontFamily: fonts.display, fontSize: 16, color: "#FFFFFF" },
});
