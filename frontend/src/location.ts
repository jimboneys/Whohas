import * as Location from "expo-location";

import { storage } from "@/src/utils/storage";

const CITY_KEY = "whohas_city";

export type LocResult = {
  city?: string;
  denied?: boolean;
  blocked?: boolean;
  error?: boolean;
};

export async function getSavedCity(): Promise<string> {
  return (await storage.getItem(CITY_KEY, "")) || "";
}

export async function clearCity(): Promise<void> {
  await storage.setItem(CITY_KEY, "");
}

// Contextual permission flow: check first, request once, respect canAskAgain.
export async function ensureLocation(): Promise<LocResult> {
  try {
    const current = await Location.getForegroundPermissionsAsync();
    let status = current.status;
    let canAskAgain = current.canAskAgain;

    if (status !== "granted") {
      if (!canAskAgain) return { blocked: true };
      const req = await Location.requestForegroundPermissionsAsync();
      status = req.status;
      canAskAgain = req.canAskAgain;
      if (status !== "granted") return canAskAgain ? { denied: true } : { blocked: true };
    }

    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    const geo = await Location.reverseGeocodeAsync({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    });
    const city = geo[0]?.city || geo[0]?.region || geo[0]?.subregion || "";
    if (city) await storage.setItem(CITY_KEY, city);
    return { city };
  } catch {
    return { error: true };
  }
}
