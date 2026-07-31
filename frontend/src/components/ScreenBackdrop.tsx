import { View, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { colors } from "@/src/theme";

// Faint brand watermark rendered behind screen content. Non-interactive.
export default function ScreenBackdrop() {
  return (
    <View pointerEvents="none" style={styles.wrap} testID="screen-backdrop">
      <MaterialCommunityIcons
        name="domino-mask"
        size={300}
        color={colors.brand}
        style={styles.mask}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    alignItems: "center",
  },
  mask: {
    opacity: 0.04,
    marginTop: 140,
    transform: [{ rotate: "-12deg" }],
  },
});
