const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

export type Category = {
  id: string;
  name: string;
  icon: string;
  accent: string;
};

export type ProductSummary = {
  id: string;
  name: string;
  brand: string;
  category: string;
  image: string;
  lowest_price: number;
  highest_price: number;
  savings: number;
  store_count: number;
  best_store: string | null;
};

export type Offer = {
  store: string;
  accent: string;
  price: number;
  shipping: number;
  rating: number;
  url: string;
  in_stock: boolean;
};

export type ProductDetail = ProductSummary & {
  description: string;
  offers: Offer[];
};

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export const api = {
  categories: () => get<Category[]>("/categories"),
  trending: () => get<ProductSummary[]>("/trending"),
  products: (q?: string, category?: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    const qs = params.toString();
    return get<ProductSummary[]>(`/products${qs ? `?${qs}` : ""}`);
  },
  product: (id: string) => get<ProductDetail>(`/products/${id}`),
  batch: async (ids: string[]): Promise<ProductSummary[]> => {
    if (ids.length === 0) return [];
    const res = await fetch(`${BASE}/api/products/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ids),
    });
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
  },
};
