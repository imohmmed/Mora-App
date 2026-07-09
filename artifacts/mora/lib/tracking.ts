// Fire-and-forget behavior tracking. Never throws, never blocks UI.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const SESSION_KEY = "mora_cart_session_v1"; // same id the cart uses

function getBaseUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}/api`;
  return "/api";
}

let cachedSessionId: string | null = null;

export async function getTrackingSessionId(): Promise<string> {
  if (cachedSessionId) return cachedSessionId;
  try {
    let sid = await AsyncStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = "sess_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      await AsyncStorage.setItem(SESSION_KEY, sid);
    }
    cachedSessionId = sid;
    return sid;
  } catch {
    cachedSessionId = "sess_mem_" + Math.random().toString(36).slice(2);
    return cachedSessionId;
  }
}

async function post(path: string, body: Record<string, unknown>): Promise<void> {
  try {
    const sessionId = await getTrackingSessionId();
    await fetch(`${getBaseUrl()}/store/track/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, ...body }),
    });
  } catch {
    // tracking must never surface errors
  }
}

function detectDevice(): string {
  if (Platform.OS === "ios") return "iphone";
  if (Platform.OS === "android") return "android";
  if (typeof navigator !== "undefined") {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("iphone")) return "iphone";
    if (ua.includes("ipad")) return "ipad";
    if (ua.includes("android")) return "android";
    return "desktop";
  }
  return "unknown";
}

function detectLoadTimeMs(): number | undefined {
  if (Platform.OS !== "web" || typeof performance === "undefined") return undefined;
  try {
    const nav = performance.getEntriesByType("navigation")[0] as
      | { duration?: number }
      | undefined;
    if (nav?.duration && nav.duration > 0) return Math.round(nav.duration);
  } catch {}
  return undefined;
}

export function trackSessionStart(customerId?: string): void {
  const referrer =
    Platform.OS === "web" && typeof document !== "undefined" ? document.referrer || "" : "";
  void post("session", {
    customerId,
    referrer,
    source: Platform.OS === "web" ? undefined : "app",
    device: detectDevice(),
    platform: Platform.OS === "web" ? "web" : "native",
    loadTimeMs: detectLoadTimeMs(),
  });
}

export function trackPing(): void {
  void post("ping", {});
}

export function trackPageView(): void {
  void post("pageview", {});
}

export function trackWishlist(productId: string, action: "add" | "remove", customerId?: string): void {
  void post("wishlist", { productId, action, customerId });
}

export function trackSearch(query: string, resultsCount: number): void {
  void post("search", { query, resultsCount });
}

export function trackSearchClick(query: string, productId: string): void {
  void post("search-click", { query, productId });
}

export function trackCartEvent(
  event: "created" | "checkout" | "purchased",
  value: number,
  items: unknown[],
): void {
  void post("cart", { event, value, items });
}

export function trackProductView(productId: string): void {
  void post("product-view", { productId });
}
