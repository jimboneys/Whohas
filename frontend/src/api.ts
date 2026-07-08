const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

export type AnswerItem = {
  rank: number;
  name: string;
  reason: string;
  url: string;
  source_title?: string | null;
};

export type StorePrice = { store: string; price: number };
export type ProductCard = { name: string; image: string; stores: StorePrice[] };

export type AskResponse = {
  id: string;
  question: string;
  summary: string;
  direct_answer: string;
  items: AnswerItem[];
  product?: ProductCard | null;
  demo: boolean;
  sources_count: number;
  created_at: string;
};

export type TrendingGroup = {
  category: string;
  icon: string;
  accent: string;
  questions: string[];
};

export async function ask(question: string, location?: string): Promise<AskResponse> {
  const res = await fetch(`${BASE}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, location: location || null }),
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function suggest(q: string): Promise<string[]> {
  const res = await fetch(`${BASE}/api/suggest?q=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  return res.json();
}

export async function trending(): Promise<TrendingGroup[]> {
  const res = await fetch(`${BASE}/api/trending-questions`);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export type Sponsor = { name: string; tagline: string; url: string; image: string };
export type AdSlot = {
  key: string;
  label: string;
  price: number;
  featured: boolean;
  booked: boolean;
  sponsor?: Sponsor | null;
};

export async function getAdSlots(): Promise<AdSlot[]> {
  const res = await fetch(`${BASE}/api/ad-slots`);
  if (!res.ok) return [];
  return res.json();
}

export async function getAdClicks(): Promise<Record<string, number>> {
  const res = await fetch(`${BASE}/api/ad-clicks`);
  if (!res.ok) return {};
  return res.json();
}

export async function trackAdClick(key: string): Promise<number | null> {
  try {
    const res = await fetch(`${BASE}/api/ad-clicks/${key}`, { method: "POST" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.clicks ?? null;
  } catch {
    return null;
  }
}
