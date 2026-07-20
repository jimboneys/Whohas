// Local persistence for the user's grocery list (device-only, anonymous).
import { storage } from "@/src/utils/storage";

const KEY = "whohas_grocery_list";

export async function getList(): Promise<string[]> {
  const raw = await storage.getItem(KEY, "[]");
  try {
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function saveList(items: string[]): Promise<void> {
  await storage.setItem(KEY, JSON.stringify(items.slice(0, 40)));
}
