import type { Product, Order, OrderItem, Collection, SpecialCollection, Banner, StoryRow } from "./types";

type ApiResponse<T> = { data: T; meta: Record<string, unknown>; error: string | null };

function getBaseUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}/api`;
  return "/api";
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getBaseUrl();
  const url = `${base}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let msg = `API error ${res.status}`;
    try {
      const json = (await res.json()) as { error?: string };
      if (json.error) msg = json.error;
    } catch {}
    throw new Error(msg);
  }
  const json = (await res.json()) as ApiResponse<T>;
  return json.data;
}

export async function fetchProducts(params?: {
  category?: string;
  q?: string;
  limit?: number;
  page?: number;
}): Promise<{ products: Product[]; total: number; page: number; limit: number }> {
  const qs = new URLSearchParams();
  if (params?.category) qs.set("category", params.category);
  if (params?.q) qs.set("q", params.q);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.page) qs.set("page", String(params.page));
  const query = qs.toString() ? `?${qs.toString()}` : "";

  const base = getBaseUrl();
  const res = await fetch(`${base}/store/products${query}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Failed to fetch products");
  const json = (await res.json()) as ApiResponse<Product[]> & {
    meta: { total?: number; page?: number; limit?: number };
  };
  return {
    products: json.data,
    total: (json.meta.total as number) ?? 0,
    page: (json.meta.page as number) ?? 1,
    limit: (json.meta.limit as number) ?? 20,
  };
}

export async function fetchProduct(id: string): Promise<Product> {
  return apiFetch<Product>(`/store/products/${id}`);
}

export async function searchProducts(q: string): Promise<Product[]> {
  return apiFetch<Product[]>(`/store/search?q=${encodeURIComponent(q)}`);
}

export async function fetchCollections(): Promise<Collection[]> {
  return apiFetch<Collection[]>("/store/collections");
}

export async function fetchOrders(email: string): Promise<Order[]> {
  return apiFetch<Order[]>(`/store/orders?email=${encodeURIComponent(email)}`);
}

export async function fetchOrder(
  id: string,
  email: string
): Promise<Order & { items: OrderItem[] }> {
  const order = await apiFetch<Order & { lineItems?: OrderItem[] }>(
    `/store/orders/${id}?email=${encodeURIComponent(email)}`
  );
  return { ...order, items: order.lineItems ?? [] };
}

export async function fetchBanners(): Promise<Banner[]> {
  return apiFetch<Banner[]>("/store/banners");
}

export async function fetchSpecialCollections(): Promise<SpecialCollection[]> {
  return apiFetch<SpecialCollection[]>("/store/special-collections");
}

export async function fetchStories(): Promise<StoryRow[]> {
  return apiFetch<StoryRow[]>("/store/stories");
}

export async function fetchSpecialCollection(
  slug: string,
  page = 1
): Promise<SpecialCollection & { meta?: { total: number; pages: number } }> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/store/special-collections/${slug}?page=${page}&limit=20`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Failed to fetch collection ${slug}`);
  const json = (await res.json()) as {
    data: SpecialCollection;
    meta: Record<string, unknown>;
    error: string | null;
  };
  return { ...json.data, meta: json.meta as { total: number; pages: number } };
}
