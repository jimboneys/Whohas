import { storage } from "@/src/utils/storage";

const KEY = "whohas_history";

export type HistoryItem = { q: string; at: number };

export async function getHistory(): Promise<HistoryItem[]> {
  const raw = await storage.getItem(KEY, "");
  if (!raw) return [];
  try {
    return JSON.parse(raw) as HistoryItem[];
  } catch {
    return [];
  }
}

export async function addHistory(q: string): Promise<void> {
  const list = await getHistory();
  const filtered = list.filter((h) => h.q.toLowerCase() !== q.toLowerCase());
  filtered.unshift({ q, at: Date.now() });
  await storage.setItem(KEY, JSON.stringify(filtered.slice(0, 30)));
}

export async function clearHistory(): Promise<void> {
  await storage.setItem(KEY, JSON.stringify([]));
}
