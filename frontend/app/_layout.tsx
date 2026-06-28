import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";

LogBox.ignoreAllLogs(true);

// Keep the native splash visible from cold start until icon fonts register.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [iconsLoaded, iconsError] = useIconFonts();
  const [fontsLoaded, fontsError] = useFonts({
    Fredoka_500: require("../assets/fonts/Fredoka-Medium.ttf"),
    Fredoka_600: require("../assets/fonts/Fredoka-SemiBold.ttf"),
    Nunito_400: require("../assets/fonts/Nunito-Regular.ttf"),
    Nunito_700: require("../assets/fonts/Nunito-Bold.ttf"),
    Nunito_800: require("../assets/fonts/Nunito-ExtraBold.ttf"),
  });

  const ready = (iconsLoaded || iconsError) && (fontsLoaded || fontsError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#FDFBF7" },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="results" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
