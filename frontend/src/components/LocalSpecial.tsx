import { View, Text, StyleSheet, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { fonts, spacing, radius } from "@/src/theme";

const ORANGE = "#FF8C42";
const ORANGE_DEEP = "#F2712B";
const ADVERTISE_EMAIL = "advertise@whohas.app";

// Rotating pool of local restaurant specials (mock / demo content).
const SPECIALS = [
  { restaurant: "Sunrise Grill & Diner", area: "Downtown", mapsQuery: "Sunrise Grill Diner near me", lunch: { dish: "Grilled chicken bowl", price: "$8.99" }, dinner: { dish: "Ribeye & fries", price: "$16.99" } },
  { restaurant: "Bella Napoli", area: "Italian", mapsQuery: "Bella Napoli pizzeria near me", lunch: { dish: "Margherita slice + salad", price: "$7.49" }, dinner: { dish: "Lasagna & garlic bread", price: "$14.99" } },
  { restaurant: "El Corazón Taquería", area: "Mexican", mapsQuery: "El Corazon taqueria near me", lunch: { dish: "3 street tacos + drink", price: "$6.99" }, dinner: { dish: "Carne asada platter", price: "$13.99" } },
  { restaurant: "Sakura House", area: "Japanese", mapsQuery: "Sakura House sushi near me", lunch: { dish: "Chef's bento box", price: "$9.99" }, dinner: { dish: "Salmon teriyaki set", price: "$17.99" } },
  { restaurant: "Green Fork Café", area: "Healthy", mapsQuery: "Green Fork cafe near me", lunch: { dish: "Power grain bowl", price: "$8.49" }, dinner: { dish: "Herb-roasted chicken", price: "$15.49" } },
];

function todaySpecial() {
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  return SPECIALS[dayIndex % SPECIALS.length];
}

export default function LocalSpecial() {
  const s = todaySpecial();

  const openMaps = () => {
    Haptics.selectionAsync().catch(() => {});
    Linking.openURL(`https://www.google.com/maps/search/${encodeURIComponent(s.mapsQuery)}`).catch(() => {});
  };

  const book = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const subject = encodeURIComponent("WhoHas: book Local Special of the Day");
    const body = encodeURIComponent("Hi! I'd like to feature my restaurant's daily special on WhoHas. Here are my details:");
    Linking.openURL(`mailto:${ADVERTISE_EMAIL}?subject=${subject}&body=${body}`).catch(() => {});
  };

  return (
    <Pressable
      testID="local-special"
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.94 }]}
      onPress={openMaps}
    >
      <View style={styles.headRow}>
        <Ionicons name="restaurant" size={13} color="#FFFFFF" />
        <Text style={styles.eyebrow}>LOCAL SPECIAL · TODAY</Text>
        <View style={{ flex: 1 }} />
        <Pressable style={styles.bookBtn} onPress={book} hitSlop={8} testID="local-special-book">
          <Text style={styles.bookText}>Book</Text>
          <Ionicons name="add-circle" size={12} color={ORANGE} />
        </Pressable>
      </View>

      <Text style={styles.restaurant} numberOfLines={1}>
        {s.restaurant} <Text style={styles.area}>· {s.area}</Text>
      </Text>

      <View style={styles.mealRow}>
        <Ionicons name="sunny" size={13} color="#FFFFFF" />
        <Text style={styles.mealLabel}>Lunch</Text>
        <Text style={styles.dish} numberOfLines={1}>{s.lunch.dish}</Text>
        <Text style={styles.price}>{s.lunch.price}</Text>
      </View>
      <View style={styles.mealRow}>
        <Ionicons name="moon" size={13} color="#FFFFFF" />
        <Text style={styles.mealLabel}>Dinner</Text>
        <Text style={styles.dish} numberOfLines={1}>{s.dinner.dish}</Text>
        <Text style={styles.price}>{s.dinner.price}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: ORANGE,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.xl,
    gap: 6,
    shadowColor: ORANGE_DEEP,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 4,
  },
  headRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  eyebrow: { fontFamily: fonts.bodyExtra, fontSize: 10, letterSpacing: 0.8, color: "rgba(255,255,255,0.9)" },
  bookBtn: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "#FFFFFF", borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2,
  },
  bookText: { fontFamily: fonts.bodyExtra, fontSize: 11, color: ORANGE },
  restaurant: { fontFamily: fonts.display, fontSize: 17, color: "#FFFFFF", marginBottom: 2 },
  area: { fontFamily: fonts.bodyBold, fontSize: 13, color: "rgba(255,255,255,0.85)" },
  mealRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  mealLabel: { fontFamily: fonts.bodyExtra, fontSize: 12, color: "#FFFFFF", width: 46 },
  dish: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 13.5, color: "rgba(255,255,255,0.95)" },
  price: { fontFamily: fonts.display, fontSize: 15, color: "#FFFFFF" },
});
