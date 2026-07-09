// Customer-behavior tracking: sessions, page views, wishlist, search,
// cart lifecycle, product views — plus aggregations for admin analytics.

import { db } from "./db.js";
import type { Row } from "./types.js";

// ─── Schema ───────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS analytics_sessions (
    session_id   TEXT PRIMARY KEY,
    customer_id  TEXT,
    source       TEXT NOT NULL DEFAULT 'direct',
    referrer     TEXT NOT NULL DEFAULT '',
    device       TEXT NOT NULL DEFAULT 'unknown',
    platform     TEXT NOT NULL DEFAULT 'web',
    page_views   INTEGER NOT NULL DEFAULT 0,
    load_time_ms INTEGER,
    started_at   TEXT NOT NULL,
    last_seen_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_as_last_seen ON analytics_sessions(last_seen_at);
  CREATE INDEX IF NOT EXISTS idx_as_started  ON analytics_sessions(started_at);

  CREATE TABLE IF NOT EXISTS wishlist_events (
    id          TEXT PRIMARY KEY,
    session_id  TEXT NOT NULL DEFAULT '',
    customer_id TEXT,
    product_id  TEXT NOT NULL,
    action      TEXT NOT NULL DEFAULT 'add',
    created_at  TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_we_product ON wishlist_events(product_id);

  CREATE TABLE IF NOT EXISTS search_logs (
    id            TEXT PRIMARY KEY,
    session_id    TEXT NOT NULL DEFAULT '',
    query         TEXT NOT NULL,
    results_count INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sl_query ON search_logs(query);

  CREATE TABLE IF NOT EXISTS search_clicks (
    id         TEXT PRIMARY KEY,
    session_id TEXT NOT NULL DEFAULT '',
    query      TEXT NOT NULL DEFAULT '',
    product_id TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sc_product ON search_clicks(product_id);

  CREATE TABLE IF NOT EXISTS cart_events (
    id         TEXT PRIMARY KEY,
    session_id TEXT NOT NULL DEFAULT '',
    event      TEXT NOT NULL,
    value      REAL NOT NULL DEFAULT 0,
    items      TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_ce_session ON cart_events(session_id);
  CREATE INDEX IF NOT EXISTS idx_ce_event   ON cart_events(event);

  CREATE TABLE IF NOT EXISTS product_views (
    id         TEXT PRIMARY KEY,
    session_id TEXT NOT NULL DEFAULT '',
    product_id TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_pv_product ON product_views(product_id);
`);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const nowIso = () => new Date().toISOString();
const rid = (p: string) =>
  `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function classifySource(source?: string, referrer?: string): string {
  const s = (source || "").toLowerCase();
  const hay = `${s} ${(referrer || "").toLowerCase()}`;
  if (hay.includes("instagram")) return "instagram";
  if (hay.includes("tiktok")) return "tiktok";
  if (hay.includes("snapchat") || hay.includes("snap.com")) return "snapchat";
  if (hay.includes("google")) return "google";
  if (hay.includes("facebook") || hay.includes("fb.com")) return "facebook";
  if (s && s !== "direct" && s !== "unknown") return s;
  return "direct";
}

export function classifyDevice(device?: string, userAgent?: string): string {
  const d = (device || "").toLowerCase();
  if (["iphone", "android", "desktop", "ipad"].includes(d)) return d;
  const ua = (userAgent || "").toLowerCase();
  if (ua.includes("iphone")) return "iphone";
  if (ua.includes("ipad")) return "ipad";
  if (ua.includes("android")) return "android";
  if (ua) return "desktop";
  return "unknown";
}

// ─── Recording ────────────────────────────────────────────────────────────────

export function upsertSession(input: {
  sessionId: string;
  customerId?: string;
  source?: string;
  referrer?: string;
  device?: string;
  userAgent?: string;
  platform?: string;
  loadTimeMs?: number;
}) {
  const now = nowIso();
  const source = classifySource(input.source, input.referrer);
  const device = classifyDevice(input.device, input.userAgent);
  db.prepare(`
    INSERT INTO analytics_sessions (session_id, customer_id, source, referrer, device, platform, page_views, load_time_ms, started_at, last_seen_at)
    VALUES (?,?,?,?,?,?,0,?,?,?)
    ON CONFLICT(session_id) DO UPDATE SET
      last_seen_at = excluded.last_seen_at,
      customer_id  = COALESCE(excluded.customer_id, analytics_sessions.customer_id),
      load_time_ms = COALESCE(excluded.load_time_ms, analytics_sessions.load_time_ms),
      device       = CASE WHEN excluded.device != 'unknown' THEN excluded.device ELSE analytics_sessions.device END
  `).run(
    input.sessionId,
    input.customerId ?? null,
    source,
    (input.referrer ?? "").slice(0, 500),
    device,
    input.platform === "native" ? "native" : "web",
    input.loadTimeMs != null && Number.isFinite(input.loadTimeMs) ? Math.round(input.loadTimeMs) : null,
    now,
    now,
  );
}

export function recordPageView(sessionId: string) {
  const now = nowIso();
  const r = db.prepare(
    `UPDATE analytics_sessions SET page_views = page_views + 1, last_seen_at = ? WHERE session_id = ?`
  ).run(now, sessionId);
  if (r.changes === 0) {
    upsertSession({ sessionId });
    db.prepare(
      `UPDATE analytics_sessions SET page_views = page_views + 1 WHERE session_id = ?`
    ).run(sessionId);
  }
}

export function pingSession(sessionId: string) {
  db.prepare(`UPDATE analytics_sessions SET last_seen_at = ? WHERE session_id = ?`)
    .run(nowIso(), sessionId);
}

export function recordWishlistEvent(sessionId: string, productId: string, action: "add" | "remove", customerId?: string) {
  db.prepare(`INSERT INTO wishlist_events (id, session_id, customer_id, product_id, action, created_at) VALUES (?,?,?,?,?,?)`)
    .run(rid("we"), sessionId, customerId ?? null, productId, action, nowIso());
}

export function recordSearch(sessionId: string, query: string, resultsCount: number) {
  const q = query.trim().toLowerCase().slice(0, 120);
  if (!q) return;
  db.prepare(`INSERT INTO search_logs (id, session_id, query, results_count, created_at) VALUES (?,?,?,?,?)`)
    .run(rid("sl"), sessionId, q, Math.max(0, Math.round(resultsCount)), nowIso());
}

export function recordSearchClick(sessionId: string, query: string, productId: string) {
  db.prepare(`INSERT INTO search_clicks (id, session_id, query, product_id, created_at) VALUES (?,?,?,?,?)`)
    .run(rid("sc"), sessionId, query.trim().toLowerCase().slice(0, 120), productId, nowIso());
}

export function recordCartEvent(sessionId: string, event: "created" | "checkout" | "purchased", value: number, items: unknown) {
  db.prepare(`INSERT INTO cart_events (id, session_id, event, value, items, created_at) VALUES (?,?,?,?,?,?)`)
    .run(rid("ce"), sessionId, event, Number.isFinite(value) ? value : 0, JSON.stringify(items ?? []), nowIso());
}

export function recordProductView(sessionId: string, productId: string) {
  db.prepare(`INSERT INTO product_views (id, session_id, product_id, created_at) VALUES (?,?,?,?)`)
    .run(rid("pv"), sessionId, productId, nowIso());
}

// ─── Aggregation: MORA CUSTOMERS tab ─────────────────────────────────────────

type LineItem = { productId?: string; title?: string; quantity?: number; price?: number; size?: string; color?: string };

function allOrderLineItems(): { items: LineItem[]; discountCode: string; subtotal: number; total: number }[] {
  const rows = db.prepare(
    `SELECT line_items, COALESCE(discount_code,'') AS dc, subtotal, total FROM orders WHERE is_draft=0 AND is_abandoned=0`
  ).all() as Row[];
  return rows.map((r) => {
    let items: LineItem[] = [];
    try { items = JSON.parse((r["line_items"] as string) || "[]") as LineItem[]; } catch { /* skip */ }
    return {
      items,
      discountCode: (r["dc"] as string) || "",
      subtotal: (r["subtotal"] as number) || 0,
      total: (r["total"] as number) || 0,
    };
  });
}

function productTitleMap(): Map<string, string> {
  const rows = db.prepare(`SELECT id, title FROM products`).all() as Row[];
  return new Map(rows.map((r) => [r["id"] as string, r["title"] as string]));
}

export function getCustomersAnalytics() {
  const titles = productTitleMap();
  const orders = allOrderLineItems();

  // Units purchased per product (for wishlist conversion + velocity fallback)
  const purchasedUnits = new Map<string, number>();
  for (const o of orders) {
    for (const it of o.items) {
      if (!it.productId) continue;
      purchasedUnits.set(it.productId, (purchasedUnits.get(it.productId) || 0) + (it.quantity || 0));
    }
  }

  // ── Wishlist ────────────────────────────────────────────────────────────────
  const wlRows = db.prepare(`
    SELECT product_id,
           SUM(CASE WHEN action='add' THEN 1 ELSE -1 END) AS net,
           SUM(CASE WHEN action='add' THEN 1 ELSE 0 END)  AS adds,
           COUNT(DISTINCT CASE WHEN action='add' THEN COALESCE(NULLIF(customer_id,''), session_id) END) AS users
    FROM wishlist_events GROUP BY product_id ORDER BY adds DESC LIMIT 10
  `).all() as Row[];
  const topWishlisted = wlRows.map((r) => {
    const pid = r["product_id"] as string;
    const adds = (r["adds"] as number) || 0;
    const bought = purchasedUnits.get(pid) || 0;
    return {
      productId: pid,
      title: titles.get(pid) ?? pid,
      wishlistCount: Math.max(0, (r["net"] as number) || 0),
      adds,
      uniqueUsers: (r["users"] as number) || 0,
      purchases: bought,
      conversionRate: adds > 0 ? +(Math.min(100, (bought / adds) * 100)).toFixed(1) : 0,
    };
  });
  const wlTotals = db.prepare(`
    SELECT SUM(CASE WHEN action='add' THEN 1 ELSE 0 END) AS adds,
           COUNT(DISTINCT COALESCE(NULLIF(customer_id,''), session_id)) AS users
    FROM wishlist_events
  `).get() as Row;

  // ── Size & Color (from order line items' size/color fields) ────────────────
  const sizeUnits = new Map<string, number>();
  const colorUnits = new Map<string, number>();
  for (const o of orders) {
    for (const it of o.items) {
      const qty = it.quantity || 0;
      if (it.size) sizeUnits.set(it.size, (sizeUnits.get(it.size) || 0) + qty);
      if (it.color) colorUnits.set(it.color, (colorUnits.get(it.color) || 0) + qty);
    }
  }
  const sizesSold = [...sizeUnits.entries()].map(([size, units]) => ({ size, units })).sort((a, b) => b.units - a.units);
  const colorsSold = [...colorUnits.entries()].map(([color, units]) => ({ color, units })).sort((a, b) => b.units - a.units);

  // Most-viewed colors: product views joined against each product's variant colors
  const viewRows = db.prepare(`SELECT product_id, COUNT(*) AS views FROM product_views GROUP BY product_id`).all() as Row[];
  const variantColors = db.prepare(`SELECT product_id, option2 FROM variants WHERE option2 IS NOT NULL AND option2 != ''`).all() as Row[];
  const colorsByProduct = new Map<string, Set<string>>();
  for (const v of variantColors) {
    const pid = v["product_id"] as string;
    if (!colorsByProduct.has(pid)) colorsByProduct.set(pid, new Set());
    colorsByProduct.get(pid)!.add(v["option2"] as string);
  }
  const colorViews = new Map<string, number>();
  for (const r of viewRows) {
    const set = colorsByProduct.get(r["product_id"] as string);
    if (!set) continue;
    for (const c of set) colorViews.set(c, (colorViews.get(c) || 0) + ((r["views"] as number) || 0));
  }
  const colorsViewed = [...colorViews.entries()].map(([color, views]) => ({ color, views })).sort((a, b) => b.views - a.views).slice(0, 10);

  // ── Inventory risk ──────────────────────────────────────────────────────────
  const invRows = db.prepare(`
    SELECT p.id, p.title, COALESCE(SUM(v.inventory),0) AS stock
    FROM products p LEFT JOIN variants v ON v.product_id = p.id
    WHERE p.status='active' GROUP BY p.id
  `).all() as Row[];

  // Units sold in last 30 days per product
  const recentOrders = db.prepare(
    `SELECT line_items FROM orders WHERE is_draft=0 AND is_abandoned=0 AND created_at >= ?`
  ).all(new Date(Date.now() - 30 * 86_400_000).toISOString()) as Row[];
  const recentUnits = new Map<string, number>();
  for (const r of recentOrders) {
    try {
      for (const it of JSON.parse((r["line_items"] as string) || "[]") as LineItem[]) {
        if (it.productId) recentUnits.set(it.productId, (recentUnits.get(it.productId) || 0) + (it.quantity || 0));
      }
    } catch { /* skip */ }
  }

  const inventory = invRows.map((r) => {
    const pid = r["id"] as string;
    const stock = (r["stock"] as number) || 0;
    const sold30 = recentUnits.get(pid) || 0;
    const velocity = +(sold30 / 30).toFixed(2); // units/day
    const daysLeft = velocity > 0 ? Math.round(stock / velocity) : null;
    return { productId: pid, title: r["title"] as string, stock, sold30, velocity, daysLeft };
  });
  const outOfStock = inventory.filter((p) => p.stock === 0);
  const lowStock = inventory.filter((p) => p.stock > 0 && p.stock <= 10).sort((a, b) => a.stock - b.stock);
  const needsReorder = inventory
    .filter((p) => p.daysLeft !== null && p.daysLeft <= 14 && p.stock > 0)
    .sort((a, b) => (a.daysLeft! - b.daysLeft!));
  const velocityTop = [...inventory].sort((a, b) => b.velocity - a.velocity).slice(0, 10);

  // ── Cart behavior ───────────────────────────────────────────────────────────
  const createdSessions = db.prepare(`SELECT DISTINCT session_id FROM cart_events WHERE event='created'`).all() as Row[];
  const purchasedSessions = new Set(
    (db.prepare(`SELECT DISTINCT session_id FROM cart_events WHERE event='purchased'`).all() as Row[])
      .map((r) => r["session_id"] as string)
  );
  const cartsCreated = createdSessions.length;
  const cartsPurchased = [...purchasedSessions].length;
  const cutoff = new Date(Date.now() - 3_600_000).toISOString(); // 1h grace
  const abandonedRows = db.prepare(`
    SELECT session_id, MAX(created_at) AS last_ts FROM cart_events WHERE event='created'
    GROUP BY session_id HAVING last_ts < ?
  `).all(cutoff) as Row[];
  const abandonedSessions = abandonedRows.map((r) => r["session_id"] as string).filter((s) => !purchasedSessions.has(s));
  const cartsAbandoned = abandonedSessions.length;
  const abandonmentRate = cartsCreated > 0 ? +((cartsAbandoned / cartsCreated) * 100).toFixed(1) : 0;

  const avgCartRow = db.prepare(`
    SELECT AVG(value) AS avg_value FROM (
      SELECT session_id, MAX(value) AS value FROM cart_events WHERE event IN ('created','purchased') GROUP BY session_id
    )
  `).get() as Row;
  const avgCartValue = Math.round((avgCartRow["avg_value"] as number) || 0);

  // Most-abandoned products: latest created-cart items of abandoned sessions
  const abandonedProducts = new Map<string, { title: string; count: number }>();
  if (abandonedSessions.length > 0) {
    const stmt = db.prepare(`SELECT items FROM cart_events WHERE session_id = ? AND event='created' ORDER BY created_at DESC LIMIT 1`);
    for (const sid of abandonedSessions.slice(0, 500)) {
      const r = stmt.get(sid) as Row | undefined;
      if (!r) continue;
      try {
        for (const it of JSON.parse((r["items"] as string) || "[]") as LineItem[]) {
          const key = it.productId || it.title || "";
          if (!key) continue;
          const ex = abandonedProducts.get(key) || { title: it.title || titles.get(key) || key, count: 0 };
          ex.count += 1;
          abandonedProducts.set(key, ex);
        }
      } catch { /* skip */ }
    }
  }
  const mostAbandoned = [...abandonedProducts.entries()]
    .map(([productId, v]) => ({ productId, ...v }))
    .sort((a, b) => b.count - a.count).slice(0, 10);

  // ── Search behavior ─────────────────────────────────────────────────────────
  const topSearches = (db.prepare(`
    SELECT query, COUNT(*) AS n, MAX(results_count) AS results FROM search_logs GROUP BY query ORDER BY n DESC LIMIT 10
  `).all() as Row[]).map((r) => ({ query: r["query"] as string, count: (r["n"] as number) || 0, results: (r["results"] as number) || 0 }));
  const zeroResultSearches = (db.prepare(`
    SELECT query, COUNT(*) AS n FROM search_logs WHERE results_count = 0 GROUP BY query ORDER BY n DESC LIMIT 10
  `).all() as Row[]).map((r) => ({ query: r["query"] as string, count: (r["n"] as number) || 0 }));
  const topClicked = (db.prepare(`
    SELECT product_id, COUNT(*) AS n FROM search_clicks GROUP BY product_id ORDER BY n DESC LIMIT 10
  `).all() as Row[]).map((r) => ({
    productId: r["product_id"] as string,
    title: titles.get(r["product_id"] as string) ?? (r["product_id"] as string),
    clicks: (r["n"] as number) || 0,
  }));
  const searchSessions = (db.prepare(`SELECT DISTINCT session_id FROM search_logs WHERE session_id != ''`).all() as Row[])
    .map((r) => r["session_id"] as string);
  const searchThenPurchase = searchSessions.filter((s) => purchasedSessions.has(s)).length;
  const purchaseRateAfterSearch = searchSessions.length > 0
    ? +((searchThenPurchase / searchSessions.length) * 100).toFixed(1) : 0;
  const totalSearches = ((db.prepare(`SELECT COUNT(*) AS n FROM search_logs`).get() as Row)["n"] as number) || 0;

  // ── Coupons ─────────────────────────────────────────────────────────────────
  const couponRows = db.prepare(`SELECT code, usage_count, status FROM discounts ORDER BY usage_count DESC`).all() as Row[];
  const withDiscount = orders.filter((o) => o.discountCode);
  const withoutDiscount = orders.filter((o) => !o.discountCode);
  const salesWithDiscount = Math.round(withDiscount.reduce((s, o) => s + o.total, 0));
  const salesWithoutDiscount = Math.round(withoutDiscount.reduce((s, o) => s + o.total, 0));
  const perCoupon = new Map<string, { orders: number; revenue: number }>();
  for (const o of withDiscount) {
    const code = o.discountCode.toUpperCase();
    const ex = perCoupon.get(code) || { orders: 0, revenue: 0 };
    ex.orders += 1;
    ex.revenue += o.total;
    perCoupon.set(code, ex);
  }
  const couponImpact = couponRows.slice(0, 10).map((r) => {
    const code = (r["code"] as string).toUpperCase();
    const agg = perCoupon.get(code) || { orders: 0, revenue: 0 };
    return { code, usageCount: (r["usage_count"] as number) || 0, orders: agg.orders, revenue: Math.round(agg.revenue) };
  });
  const couponUsageRate = orders.length > 0 ? +((withDiscount.length / orders.length) * 100).toFixed(1) : 0;

  return {
    wishlist: {
      totalAdds: ((wlTotals["adds"] as number) || 0),
      uniqueUsers: ((wlTotals["users"] as number) || 0),
      topWishlisted,
    },
    sizeColor: {
      bestSize: sizesSold[0] ?? null,
      worstSize: sizesSold.length > 1 ? sizesSold[sizesSold.length - 1] : null,
      sizesSold: sizesSold.slice(0, 10),
      bestColor: colorsSold[0] ?? null,
      colorsSold: colorsSold.slice(0, 10),
      colorsViewed,
      mostViewedColor: colorsViewed[0] ?? null,
    },
    inventory: {
      outOfStockCount: outOfStock.length,
      lowStockCount: lowStock.length,
      needsReorderCount: needsReorder.length,
      outOfStock: outOfStock.slice(0, 10),
      lowStock: lowStock.slice(0, 10),
      needsReorder: needsReorder.slice(0, 10),
      velocityTop,
    },
    cart: {
      cartsCreated,
      cartsPurchased,
      cartsAbandoned,
      abandonmentRate,
      avgCartValue,
      mostAbandoned,
    },
    search: {
      totalSearches,
      topSearches,
      zeroResultSearches,
      topClicked,
      purchaseRateAfterSearch,
      searchSessions: searchSessions.length,
    },
    coupons: {
      mostUsed: couponImpact[0] ?? null,
      couponUsageRate,
      salesWithDiscount,
      salesWithoutDiscount,
      ordersWithDiscount: withDiscount.length,
      ordersWithoutDiscount: withoutDiscount.length,
      couponImpact,
    },
  };
}

// ─── Aggregation: Live View extras ────────────────────────────────────────────

export function getLiveStats() {
  const now = Date.now();
  const fiveMinAgo = new Date(now - 5 * 60_000).toISOString();
  const today = new Date().toISOString().substring(0, 10);
  const monthAgo = new Date(now - 30 * 86_400_000).toISOString();

  const one = (sql: string, ...params: unknown[]) =>
    ((db.prepare(sql).get(...params) as Row | undefined) ?? {}) as Row;

  const visitorsNow = (one(`SELECT COUNT(*) AS n FROM analytics_sessions WHERE last_seen_at >= ?`, fiveMinAgo)["n"] as number) || 0;
  const sessionsToday = (one(`SELECT COUNT(*) AS n FROM analytics_sessions WHERE substr(started_at,1,10) = ?`, today)["n"] as number) || 0;
  const dau = (one(`SELECT COUNT(*) AS n FROM analytics_sessions WHERE substr(last_seen_at,1,10) = ?`, today)["n"] as number) || 0;
  const mau = (one(`SELECT COUNT(*) AS n FROM analytics_sessions WHERE last_seen_at >= ?`, monthAgo)["n"] as number) || 0;

  const purchasesToday = (one(
    `SELECT COUNT(DISTINCT session_id) AS n FROM cart_events WHERE event='purchased' AND substr(created_at,1,10) = ?`, today
  )["n"] as number) || 0;
  const conversionRate = sessionsToday > 0 ? +((purchasesToday / sessionsToday) * 100).toFixed(1) : 0;

  const bounced = (one(
    `SELECT COUNT(*) AS n FROM analytics_sessions WHERE substr(started_at,1,10) = ? AND page_views <= 1`, today
  )["n"] as number) || 0;
  const bounceRate = sessionsToday > 0 ? +((bounced / sessionsToday) * 100).toFixed(1) : 0;

  const avgLoad = one(`SELECT AVG(load_time_ms) AS v FROM analytics_sessions WHERE load_time_ms IS NOT NULL AND started_at >= ?`, monthAgo);
  const avgLoadMs = Math.round((avgLoad["v"] as number) || 0);

  const dur = one(`
    SELECT AVG((julianday(last_seen_at) - julianday(started_at)) * 86400) AS v
    FROM analytics_sessions WHERE started_at >= ? AND last_seen_at > started_at
  `, monthAgo);
  const avgSessionSec = Math.round((dur["v"] as number) || 0);

  const ppv = one(`SELECT AVG(page_views) AS v FROM analytics_sessions WHERE started_at >= ? AND page_views > 0`, monthAgo);
  const pagesPerVisit = +((ppv["v"] as number) || 0).toFixed(1);

  const sourceBreakdown = (db.prepare(
    `SELECT source, COUNT(*) AS n FROM analytics_sessions WHERE started_at >= ? GROUP BY source ORDER BY n DESC`
  ).all(monthAgo) as Row[]).map((r) => ({ source: r["source"] as string, sessions: (r["n"] as number) || 0 }));

  const deviceBreakdown = (db.prepare(
    `SELECT device, COUNT(*) AS n FROM analytics_sessions WHERE started_at >= ? GROUP BY device ORDER BY n DESC`
  ).all(monthAgo) as Row[]).map((r) => ({ device: r["device"] as string, sessions: (r["n"] as number) || 0 }));

  // Today's cart funnel (from real cart events)
  const cartsActiveToday = (one(
    `SELECT COUNT(DISTINCT session_id) AS n FROM cart_events WHERE event='created' AND substr(created_at,1,10) = ?`, today
  )["n"] as number) || 0;
  const checkingOutToday = (one(
    `SELECT COUNT(DISTINCT session_id) AS n FROM cart_events WHERE event='checkout' AND substr(created_at,1,10) = ?`, today
  )["n"] as number) || 0;

  // New vs returning visitors today (device-session first seen today vs earlier)
  const newToday = (one(
    `SELECT COUNT(*) AS n FROM analytics_sessions WHERE substr(started_at,1,10) = ?`, today
  )["n"] as number) || 0;
  const returningToday = Math.max(0, dau - newToday);

  return {
    visitorsNow,
    sessionsToday,
    purchasesToday,
    conversionRate,
    bounceRate,
    avgLoadMs,
    dau,
    mau,
    avgSessionSec,
    pagesPerVisit,
    sourceBreakdown,
    deviceBreakdown,
    cartsActiveToday,
    checkingOutToday,
    newToday,
    returningToday,
  };
}
