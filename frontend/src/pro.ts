import { Platform } from "react-native";
import { storage } from "@/src/utils/storage";

const DEVICE_KEY = "whohas_device_id";
const PENDING_KEY = "whohas_pending_session";

function randomId() {
  return "dev_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
}

export async function getDeviceId(): Promise<string> {
  const existing = await storage.getItem(DEVICE_KEY, "");
  if (existing) return String(existing);
  const id = randomId();
  await storage.setItem(DEVICE_KEY, id);
  return id;
}

export function originUrl(): string {
  if (Platform.OS === "web") {
    return (window as any)?.location?.origin || "";
  }
  const base = process.env.EXPO_PUBLIC_BACKEND_URL || "";
  return base.replace(/\/$/, "");
}

export async function setPendingSession(sessionId: string) {
  await storage.setItem(PENDING_KEY, sessionId);
}
export async function getPendingSession(): Promise<string> {
  const v = await storage.getItem(PENDING_KEY, "");
  return v ? String(v) : "";
}
export async function clearPendingSession() {
  await storage.setItem(PENDING_KEY, "");
}
