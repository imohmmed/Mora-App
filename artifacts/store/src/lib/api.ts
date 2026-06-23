import { Product, Variant, Collection, Order, OrderItem, BlogPost } from "./types";

const BASE_URL = "/api";

type ApiResponse<T> = { data: T; meta: Record<string, unknown>; error: string | null };

export async function fetchProducts(params?: { category?: string; q?: string; limit?: number; page?: number }) {
  const url = new URL(`${BASE_URL}/store/products`, window.location.origin);
  if (params?.category) url.searchParams.set("category", params.category);
  if (params?.q) url.searchParams.set("q", params.q);
  if (params?.limit) url.searchParams.set("limit", params.limit.toString());
  if (params?.page) url.searchParams.set("page", params.page.toString());

  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch products");
  const json = await res.json() as ApiResponse<Product[]>;
  return {
    products: json.data,
    total: (json.meta.total as number) ?? 0,
    page: (json.meta.page as number) ?? 1,
    limit: (json.meta.limit as number) ?? 20,
  };
}

export async function fetchProduct(id: string) {
  const res = await fetch(`${BASE_URL}/store/products/${id}`);
  if (!res.ok) throw new Error("Failed to fetch product");
  const json = await res.json() as ApiResponse<Product & { variants: Variant[] }>;
  return { product: json.data };
}

export async function searchProducts(q: string) {
  const res = await fetch(`${BASE_URL}/store/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error("Failed to search products");
  const json = await res.json() as ApiResponse<Product[]>;
  return { products: json.data };
}

export async function fetchCollections() {
  const res = await fetch(`${BASE_URL}/store/collections`);
  if (!res.ok) throw new Error("Failed to fetch collections");
  const json = await res.json() as ApiResponse<Collection[]>;
  return { collections: json.data };
}

export async function fetchCollection(id: string) {
  const res = await fetch(`${BASE_URL}/store/collections/${id}`);
  if (!res.ok) throw new Error("Failed to fetch collection");
  const json = await res.json() as ApiResponse<Collection | null>;
  if (!json.data) throw new Error("Collection not found");
  return { collection: json.data };
}

export async function fetchOrders(email: string) {
  const res = await fetch(`${BASE_URL}/store/orders?email=${encodeURIComponent(email)}`);
  if (!res.ok) throw new Error("Failed to fetch orders");
  const json = await res.json() as ApiResponse<Order[]>;
  return { orders: json.data };
}

export async function fetchOrder(id: string, email: string) {
  const url = new URL(`${BASE_URL}/store/orders/${id}`, window.location.origin);
  url.searchParams.set("email", email);
  const res = await fetch(url);
  if (!res.ok) throw new Error("Order not found or email does not match");
  const json = await res.json() as ApiResponse<Order & { lineItems?: OrderItem[] }>;
  if (!json.data) throw new Error("Order not found");
  const order = json.data;
  return { order: { ...order, items: order.lineItems ?? [] } };
}

export async function fetchBlogPosts() {
  const res = await fetch(`${BASE_URL}/store/blog-posts`);
  if (!res.ok) throw new Error("Failed to fetch blog posts");
  const json = await res.json() as ApiResponse<BlogPost[]>;
  return { posts: json.data };
}

export type StoreShippingMethod = { id: string; label: string; duration: string; price: number };
export type StoreTaxRegion = { id: string; region: string; rate: number };
export type StoreTaxConfig = { enabled: boolean; inclusive: boolean; regions: StoreTaxRegion[] };
export type StorePaymentMethods = { card: boolean; cod: boolean; applePay: boolean; paypal: boolean };
export type StoreSettings = {
  shippingMethods: StoreShippingMethod[];
  tax: StoreTaxConfig;
  paymentMethods: StorePaymentMethods;
  currency: string;
};

export async function fetchStoreSettings() {
  const res = await fetch(`${BASE_URL}/store/settings`);
  if (!res.ok) throw new Error("Failed to fetch settings");
  const json = await res.json() as ApiResponse<StoreSettings>;
  return { settings: json.data };
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

export async function getShippingZones(): Promise<ShippingZone[]> {
  const res = await fetch(`${BASE_URL}/store/shipping-zones`);
  if (!res.ok) throw new Error("Failed to fetch shipping zones");
  const json = await res.json() as ApiResponse<ShippingZone[]>;
  return json.data ?? [];
}

export async function getShippingRules(): Promise<ShippingRule[]> {
  const res = await fetch(`${BASE_URL}/store/shipping-rules`);
  if (!res.ok) throw new Error("Failed to fetch shipping rules");
  const json = await res.json() as ApiResponse<ShippingRule[]>;
  return json.data ?? [];
}
