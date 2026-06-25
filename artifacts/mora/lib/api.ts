import type { Product, Order, OrderItem, Collection, SpecialCollection, Banner, StoryRow } from "./types";
import { notifyUnauthorized } from "../context/AuthContext";

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
  if (res.status === 401) {
    notifyUnauthorized();
    throw new Error("Unauthorized");
  }
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
  gender?: string;
  tag?: string;
  q?: string;
  limit?: number;
  page?: number;
}): Promise<{ products: Product[]; total: number; page: number; limit: number }> {
  const qs = new URLSearchParams();
  if (params?.category) qs.set("category", params.category);
  if (params?.gender) qs.set("gender", params.gender);
  if (params?.tag) qs.set("tag", params.tag);
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

export async function fetchRelatedProducts(id: string, page = 1, limit = 8): Promise<{ products: Product[]; total: number; page: number; pages: number }> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/store/products/related/${id}?page=${page}&limit=${limit}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Failed to fetch related products");
  const json = (await res.json()) as { data: Product[]; meta: { total: number; page: number; pages: number }; error: string | null };
  return { products: json.data, total: json.meta.total, page: json.meta.page, pages: json.meta.pages };
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

export async function fetchCollectionProducts(params: {
  ids: string[];
  gender?: string;
  limit?: number;
}): Promise<Product[]> {
  if (!params.ids.length) return [];
  const qs = new URLSearchParams();
  qs.set("ids", params.ids.join(","));
  if (params.gender) qs.set("gender", params.gender);
  if (params.limit) qs.set("limit", String(params.limit));
  return apiFetch<Product[]>(`/store/collection-products?${qs.toString()}`);
}

export type ContentSectionItem = {
  id: string;
  name: string;
  description?: string;
  text?: string;
  type?: string;
  rating?: number;
};

export type ContentSection = {
  id: string;
  key: string;
  title: string;
  items: ContentSectionItem[];
  sortOrder: number;
};

export async function fetchContentSections(): Promise<Record<string, ContentSection>> {
  return apiFetch<Record<string, ContentSection>>("/store/content-sections");
}

export async function fetchCollection(id: string): Promise<SpecialCollection> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/store/collections/${id}`, { headers: { Accept: "application/json" } });
  if (res.status === 401) { notifyUnauthorized(); throw new Error("Unauthorized"); }
  if (!res.ok) throw new Error(`Failed to fetch collection ${id}`);
  const json = (await res.json()) as { data: Record<string, unknown>; meta: Record<string, unknown>; error: string | null };
  const d = json.data;
  return {
    slug: (d["id"] as string) ?? id,
    title: (d["title"] as string) ?? "",
    description: (d["description"] as string) ?? "",
    heroImage: (d["backgroundImage"] as string) || (d["image"] as string) || "",
    accentColor: "#0274C1",
    total: (json.meta["total"] as number) ?? 0,
    products: (d["products"] as Product[]) ?? [],
  };
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

export type ShippingZone = {
  id: string;
  governorate: string;
  governorateAr: string;
  price: number;
  sortOrder: number;
  enabled: boolean;
};

export type ShippingRule = {
  id: string;
  textEn: string;
  textAr: string;
  threshold: number | null;
  enabled: boolean;
  sortOrder: number;
};

export async function fetchShippingZones(): Promise<ShippingZone[]> {
  return apiFetch<ShippingZone[]>("/store/shipping-zones");
}

export async function fetchShippingRules(): Promise<ShippingRule[]> {
  return apiFetch<ShippingRule[]>("/store/shipping-rules");
}

// ── Restock ("Notify me") ─────────────────────────────────────────────────────
export async function requestRestockNotify(
  authToken: string,
  productId: string,
  variantId: string,
): Promise<void> {
  await apiFetch<{ ok: boolean }>("/store/restock-requests", {
    method: "POST",
    headers: { Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({ productId, variantId }),
  });
}

export async function fetchRestockRequests(authToken: string): Promise<string[]> {
  const data = await apiFetch<{ variantIds: string[] }>("/store/restock-requests", {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  return data.variantIds ?? [];
}
