import { Router } from "express";
import { requireAdmin } from "../middlewares/auth.js";
import {
  upsertSession,
  pingSession,
  recordPageView,
  recordWishlistEvent,
  recordSearch,
  recordSearchClick,
  recordCartEvent,
  recordProductView,
  getCustomersAnalytics,
  getLiveStats,
} from "../lib/tracking.js";

const router = Router();

const ok = (res: { json: (b: unknown) => void }) =>
  res.json({ data: { ok: true }, meta: {}, error: null });

// ─── Lightweight in-memory rate limiter (per IP, sliding window) ─────────────
const RATE_LIMIT = 120; // requests per window
const RATE_WINDOW_MS = 60_000;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(req: { ip?: string; headers: Record<string, unknown> }, res: { status: (n: number) => { json: (b: unknown) => void } }): boolean {
  const now = Date.now();
  if (rateBuckets.size > 10_000) {
    for (const [k, v] of rateBuckets) if (v.resetAt < now) rateBuckets.delete(k);
  }
  const fwd = req.headers["x-forwarded-for"];
  const ip = (typeof fwd === "string" ? fwd.split(",")[0]!.trim() : "") || req.ip || "unknown";
  const bucket = rateBuckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  bucket.count += 1;
  if (bucket.count > RATE_LIMIT) {
    res.status(429).json({ data: null, meta: {}, error: "rate_limited" });
    return false;
  }
  return true;
}

router.use("/store/track", (req, res, next) => {
  if (!rateLimit(req as never, res as never)) return;
  next();
});

const sid = (b: Record<string, unknown>): string =>
  typeof b["sessionId"] === "string" ? (b["sessionId"] as string).slice(0, 80) : "";

// ─── Store-side collectors (unauthenticated, fire-and-forget) ────────────────

router.post("/store/track/session", (req, res) => {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const sessionId = sid(b);
  if (!sessionId) { ok(res); return; }
  try {
    upsertSession({
      sessionId,
      customerId: typeof b["customerId"] === "string" ? (b["customerId"] as string) : undefined,
      source: typeof b["source"] === "string" ? (b["source"] as string) : undefined,
      referrer: typeof b["referrer"] === "string" ? (b["referrer"] as string) : undefined,
      device: typeof b["device"] === "string" ? (b["device"] as string) : undefined,
      userAgent: req.headers["user-agent"],
      platform: typeof b["platform"] === "string" ? (b["platform"] as string) : undefined,
      loadTimeMs: typeof b["loadTimeMs"] === "number" ? (b["loadTimeMs"] as number) : undefined,
    });
  } catch { /* never fail tracking */ }
  ok(res);
});

router.post("/store/track/ping", (req, res) => {
  const sessionId = sid((req.body ?? {}) as Record<string, unknown>);
  if (sessionId) { try { pingSession(sessionId); } catch { /* noop */ } }
  ok(res);
});

router.post("/store/track/pageview", (req, res) => {
  const sessionId = sid((req.body ?? {}) as Record<string, unknown>);
  if (sessionId) { try { recordPageView(sessionId); } catch { /* noop */ } }
  ok(res);
});

router.post("/store/track/wishlist", (req, res) => {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const productId = typeof b["productId"] === "string" ? (b["productId"] as string) : "";
  const action = b["action"] === "remove" ? "remove" : "add";
  if (productId) {
    try {
      recordWishlistEvent(sid(b), productId, action,
        typeof b["customerId"] === "string" ? (b["customerId"] as string) : undefined);
    } catch { /* noop */ }
  }
  ok(res);
});

router.post("/store/track/search", (req, res) => {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const query = typeof b["query"] === "string" ? (b["query"] as string) : "";
  const results = typeof b["resultsCount"] === "number" ? (b["resultsCount"] as number) : 0;
  if (query.trim()) { try { recordSearch(sid(b), query, results); } catch { /* noop */ } }
  ok(res);
});

router.post("/store/track/search-click", (req, res) => {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const productId = typeof b["productId"] === "string" ? (b["productId"] as string) : "";
  const query = typeof b["query"] === "string" ? (b["query"] as string) : "";
  if (productId) { try { recordSearchClick(sid(b), query, productId); } catch { /* noop */ } }
  ok(res);
});

router.post("/store/track/cart", (req, res) => {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const event = b["event"];
  if (event === "created" || event === "checkout" || event === "purchased") {
    try {
      recordCartEvent(sid(b), event,
        typeof b["value"] === "number" ? (b["value"] as number) : 0, b["items"]);
    } catch { /* noop */ }
  }
  ok(res);
});

router.post("/store/track/product-view", (req, res) => {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const productId = typeof b["productId"] === "string" ? (b["productId"] as string) : "";
  if (productId) { try { recordProductView(sid(b), productId); } catch { /* noop */ } }
  ok(res);
});

// ─── Admin aggregations ───────────────────────────────────────────────────────

router.get("/admin/analytics/customers", requireAdmin, (_req, res) => {
  res.json({ data: getCustomersAnalytics(), meta: {}, error: null });
});

router.get("/admin/analytics/live-stats", requireAdmin, (_req, res) => {
  res.json({ data: getLiveStats(), meta: {}, error: null });
});

export default router;
