// Deep analytics: Sales / Products / Customer Insights.
// All figures are computed from real orders/products/tracking tables — no fabricated data.
import { db } from "./db.js";
import type { Row } from "./types.js";

type LineItem = { productId?: string; title?: string; quantity?: number; price?: number };

function parseItems(json: string): LineItem[] {
  try { return JSON.parse(json || "[]") as LineItem[]; } catch { return []; }
}

function rangeOrders(from: string, to: string): Row[] {
  return db.prepare(
    `SELECT * FROM orders WHERE is_draft=0 AND is_abandoned=0 AND substr(created_at,1,10)>=? AND substr(created_at,1,10)<=?`
  ).all(from, to) as Row[];
}

function sumField(orders: Row[], field: string): number {
  return orders.reduce((s, o) => s + ((o[field] as number) || 0), 0);
}

function isoDate(d: Date) { return d.toISOString().substring(0, 10); }

// ─── Sales Analytics ────────────────────────────────────────────────────────

export function getSalesAnalytics() {
  const now = new Date();
  const todayStr = isoDate(now);
  const weekStart = isoDate(new Date(now.getTime() - 6 * 86_400_000));
  const monthStart = isoDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const yearStart = isoDate(new Date(now.getFullYear(), 0, 1));

  const today = rangeOrders(todayStr, todayStr);
  const week = rangeOrders(weekStart, todayStr);
  const month = rangeOrders(monthStart, todayStr);
  const year = rangeOrders(yearStart, todayStr);

  // Previous period comparisons (same length immediately preceding)
  const prevDayStr = isoDate(new Date(now.getTime() - 86_400_000));
  const prevWeekEnd = isoDate(new Date(now.getTime() - 7 * 86_400_000));
  const prevWeekStart = isoDate(new Date(now.getTime() - 13 * 86_400_000));
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const prevMonthStart = new Date(prevMonthEnd.getFullYear(), prevMonthEnd.getMonth(), 1);
  const prevYearStart = isoDate(new Date(now.getFullYear() - 1, 0, 1));
  const prevYearEnd = isoDate(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()));

  const prevDay = rangeOrders(prevDayStr, prevDayStr);
  const prevWeek = rangeOrders(prevWeekStart, prevWeekEnd);
  const prevMonth = rangeOrders(isoDate(prevMonthStart), isoDate(prevMonthEnd));
  const prevYear = rangeOrders(prevYearStart, prevYearEnd);

  const pct = (c: number, p: number): number | null => {
    if (p === 0) return c > 0 ? null : 0;
    return +(((c - p) / p) * 100).toFixed(1);
  };

  const salesOf = (rows: Row[]) => sumField(rows, "total");

  // Gross/net profit using current product+variant cost as best-effort COGS
  // (orders don't snapshot cost-at-time-of-sale, so this is an estimate from current cost data).
  const costMap = new Map<string, number>();
  for (const r of db.prepare(`SELECT id, cost FROM products WHERE cost IS NOT NULL`).all() as Row[]) {
    costMap.set(r["id"] as string, (r["cost"] as number) || 0);
  }
  const allOrders = rangeOrders("0000-00-00", todayStr);
  let grossRevenue = 0, cogs = 0, discountTotal = 0, shippingTotal = 0;
  const hourCounts = new Array(24).fill(0) as number[];
  const dowCounts = new Array(7).fill(0) as number[];
  const hourRevenue = new Array(24).fill(0) as number[];
  const dowRevenue = new Array(7).fill(0) as number[];
  for (const o of allOrders) {
    const items = parseItems(o["line_items"] as string);
    grossRevenue += (o["total"] as number) || 0;
    discountTotal += (o["discount_amount"] as number) || 0;
    shippingTotal += (o["shipping"] as number) || 0;
    for (const it of items) {
      const cost = it.productId ? costMap.get(it.productId) : undefined;
      if (cost !== undefined) cogs += cost * (it.quantity || 0);
    }
    const createdAt = new Date((o["created_at"] as string) + "Z");
    if (!Number.isNaN(createdAt.getTime())) {
      const h = createdAt.getUTCHours();
      const dow = createdAt.getUTCDay();
      hourCounts[h] += 1;
      dowCounts[dow] += 1;
      hourRevenue[h] += (o["total"] as number) || 0;
      dowRevenue[dow] += (o["total"] as number) || 0;
    }
  }
  const grossProfit = grossRevenue - cogs;
  const netProfit = grossProfit - shippingTotal - discountTotal;
  const hasCostData = costMap.size > 0;

  const dowNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  let bestHour: { hour: number; orders: number; revenue: number } | null = null;
  let bestDow: { day: string; orders: number; revenue: number } | null = null;
  if (allOrders.length > 0) {
    const bh = hourCounts.reduce((mi, v, i) => (v > hourCounts[mi] ? i : mi), 0);
    const bd = dowCounts.reduce((mi, v, i) => (v > dowCounts[mi] ? i : mi), 0);
    bestHour = { hour: bh, orders: hourCounts[bh], revenue: Math.round(hourRevenue[bh]) };
    bestDow = { day: dowNames[bd], orders: dowCounts[bd], revenue: Math.round(dowRevenue[bd]) };
  }

  return {
    today: { sales: Math.round(salesOf(today)), orders: today.length, changePct: pct(salesOf(today), salesOf(prevDay)) },
    week: { sales: Math.round(salesOf(week)), orders: week.length, changePct: pct(salesOf(week), salesOf(prevWeek)) },
    month: { sales: Math.round(salesOf(month)), orders: month.length, changePct: pct(salesOf(month), salesOf(prevMonth)) },
    year: { sales: Math.round(salesOf(year)), orders: year.length, changePct: pct(salesOf(year), salesOf(prevYear)) },
    grossProfit: hasCostData ? Math.round(grossProfit) : null,
    netProfit: hasCostData ? Math.round(netProfit) : null,
    hasCostData,
    bestHour,
    bestDow,
  };
}

// ─── Products Analytics ─────────────────────────────────────────────────────

export function getProductsAnalytics() {
  const products = db.prepare(`SELECT id, title, status, sold_count FROM products`).all() as Row[];
  const titles = new Map(products.map((p) => [p["id"] as string, p["title"] as string]));

  const orders = db.prepare(`SELECT line_items, created_at FROM orders WHERE is_draft=0 AND is_abandoned=0`).all() as Row[];
  const unitsSold = new Map<string, number>();
  const revenueByProduct = new Map<string, number>();
  const soldInLast30 = new Set<string>();
  const thirtyAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  for (const o of orders) {
    const items = parseItems(o["line_items"] as string);
    const recent = (o["created_at"] as string) >= thirtyAgo;
    for (const it of items) {
      if (!it.productId) continue;
      unitsSold.set(it.productId, (unitsSold.get(it.productId) || 0) + (it.quantity || 0));
      revenueByProduct.set(it.productId, (revenueByProduct.get(it.productId) || 0) + (it.price || 0) * (it.quantity || 0));
      if (recent) soldInLast30.add(it.productId);
    }
  }

  const bestSelling = [...unitsSold.entries()]
    .map(([id, units]) => ({ productId: id, title: titles.get(id) ?? id, units, revenue: Math.round(revenueByProduct.get(id) || 0) }))
    .sort((a, b) => b.units - a.units).slice(0, 10);

  const activeProducts = products.filter((p) => p["status"] === "active");
  const leastSelling = activeProducts
    .map((p) => ({ productId: p["id"] as string, title: p["title"] as string, units: unitsSold.get(p["id"] as string) || 0 }))
    .sort((a, b) => a.units - b.units).slice(0, 10);

  const stagnant = activeProducts
    .filter((p) => !soldInLast30.has(p["id"] as string))
    .map((p) => ({ productId: p["id"] as string, title: p["title"] as string, totalUnitsEver: unitsSold.get(p["id"] as string) || 0 }))
    .slice(0, 20);

  const viewRows = db.prepare(`SELECT product_id, COUNT(*) AS n FROM product_views GROUP BY product_id`).all() as Row[];
  const viewsByProduct = new Map(viewRows.map((r) => [r["product_id"] as string, (r["n"] as number) || 0]));
  const mostViewed = [...viewsByProduct.entries()]
    .map(([id, views]) => ({ productId: id, title: titles.get(id) ?? id, views }))
    .sort((a, b) => b.views - a.views).slice(0, 10);

  const cartRows = db.prepare(`SELECT items FROM cart_events WHERE event='created'`).all() as Row[];
  const addedToCart = new Map<string, number>();
  for (const r of cartRows) {
    for (const it of parseItems(r["items"] as string)) {
      if (!it.productId) continue;
      addedToCart.set(it.productId, (addedToCart.get(it.productId) || 0) + (it.quantity || 1));
    }
  }
  const mostAddedToCart = [...addedToCart.entries()]
    .map(([id, count]) => ({ productId: id, title: titles.get(id) ?? id, count }))
    .sort((a, b) => b.count - a.count).slice(0, 10);

  const wlRows = db.prepare(`
    SELECT product_id, SUM(CASE WHEN action='add' THEN 1 ELSE -1 END) AS net
    FROM wishlist_events GROUP BY product_id
  `).all() as Row[];
  const mostWishlisted = wlRows
    .map((r) => ({ productId: r["product_id"] as string, title: titles.get(r["product_id"] as string) ?? (r["product_id"] as string), count: Math.max(0, (r["net"] as number) || 0) }))
    .filter((p) => p.count > 0)
    .sort((a, b) => b.count - a.count).slice(0, 10);

  const viewedNotPurchased = [...viewsByProduct.entries()]
    .filter(([id]) => !unitsSold.has(id))
    .map(([id, views]) => ({ productId: id, title: titles.get(id) ?? id, views }))
    .sort((a, b) => b.views - a.views).slice(0, 10);

  const conversionByProduct = [...viewsByProduct.entries()]
    .map(([id, views]) => {
      const purchases = unitsSold.get(id) || 0;
      return {
        productId: id,
        title: titles.get(id) ?? id,
        views,
        purchases,
        conversionRate: views > 0 ? +(Math.min(100, (purchases / views) * 100)).toFixed(1) : 0,
      };
    })
    .filter((p) => p.views >= 3)
    .sort((a, b) => b.conversionRate - a.conversionRate).slice(0, 10);

  const invRows = db.prepare(`
    SELECT p.id, p.title, COALESCE(SUM(v.inventory),0) AS stock
    FROM products p LEFT JOIN variants v ON v.product_id = p.id
    WHERE p.status='active' GROUP BY p.id HAVING stock > 0 AND stock <= 5
    ORDER BY stock ASC LIMIT 15
  `).all() as Row[];
  const nearSoldOut = invRows.map((r) => ({ productId: r["id"] as string, title: r["title"] as string, stock: (r["stock"] as number) || 0 }));

  return {
    bestSelling, leastSelling, mostViewed, mostAddedToCart, mostWishlisted,
    viewedNotPurchased, conversionByProduct, nearSoldOut, stagnant,
  };
}

// ─── Customer Insights ──────────────────────────────────────────────────────

export function getCustomerInsights() {
  const now = new Date();
  const monthStart = isoDate(new Date(now.getFullYear(), now.getMonth(), 1));

  const newCustomersThisMonth = ((db.prepare(
    `SELECT COUNT(*) AS n FROM customers WHERE substr(created_at,1,10) >= ?`
  ).get(monthStart) as Row)["n"] as number) || 0;

  const totalCustomers = ((db.prepare(`SELECT COUNT(*) AS n FROM customers`).get() as Row)["n"] as number) || 0;

  const returningCount = ((db.prepare(
    `SELECT COUNT(*) AS n FROM (SELECT customer_id FROM orders WHERE is_draft=0 AND is_abandoned=0 AND customer_id IS NOT NULL GROUP BY customer_id HAVING COUNT(*)>1)`
  ).get() as Row)["n"] as number) || 0;
  const totalWithOrders = ((db.prepare(
    `SELECT COUNT(DISTINCT customer_id) AS n FROM orders WHERE is_draft=0 AND is_abandoned=0 AND customer_id IS NOT NULL`
  ).get() as Row)["n"] as number) || 0;
  const returningRate = totalWithOrders > 0 ? +((returningCount / totalWithOrders) * 100).toFixed(1) : 0;

  const topSpenders = (db.prepare(
    `SELECT id, first_name, last_name, email, orders_count, total_spent FROM customers WHERE total_spent > 0 ORDER BY total_spent DESC LIMIT 10`
  ).all() as Row[]).map((r) => ({
    id: r["id"] as string,
    name: `${r["first_name"] as string} ${r["last_name"] as string}`.trim(),
    email: r["email"] as string,
    ordersCount: (r["orders_count"] as number) || 0,
    totalSpent: Math.round((r["total_spent"] as number) || 0),
  }));

  const avgRow = db.prepare(
    `SELECT AVG(orders_count) AS avg_orders, AVG(total_spent) AS avg_spent FROM customers WHERE orders_count > 0`
  ).get() as Row;
  const avgOrdersPerCustomer = +((avgRow["avg_orders"] as number) || 0).toFixed(1);
  const avgSpendPerCustomer = Math.round((avgRow["avg_spent"] as number) || 0);

  // Top cities from order shipping addresses (real data only)
  const addrRows = db.prepare(
    `SELECT shipping_address FROM orders WHERE is_draft=0 AND is_abandoned=0`
  ).all() as Row[];
  const cityCounts = new Map<string, number>();
  for (const r of addrRows) {
    try {
      const addr = JSON.parse((r["shipping_address"] as string) || "{}") as { city?: string };
      const city = (addr.city || "").trim();
      if (city) cityCounts.set(city, (cityCounts.get(city) || 0) + 1);
    } catch { /* skip */ }
  }
  const topCities = [...cityCounts.entries()]
    .map(([city, orders]) => ({ city, orders }))
    .sort((a, b) => b.orders - a.orders).slice(0, 10);

  // Age/gender: only real if customers have set these fields (no fabrication/backfill)
  const genderRows = db.prepare(
    `SELECT gender, COUNT(*) AS n FROM customers WHERE gender IS NOT NULL AND gender != '' GROUP BY gender`
  ).all() as Row[];
  const genderBreakdown = genderRows.map((r) => ({ gender: r["gender"] as string, count: (r["n"] as number) || 0 }));

  const currentYear = now.getFullYear();
  const ageRows = db.prepare(
    `SELECT birth_year FROM customers WHERE birth_year IS NOT NULL AND birth_year > 1900`
  ).all() as Row[];
  const ageBuckets = new Map<string, number>();
  for (const r of ageRows) {
    const age = currentYear - ((r["birth_year"] as number) || currentYear);
    let bucket = "55+";
    if (age < 18) bucket = "<18";
    else if (age <= 24) bucket = "18-24";
    else if (age <= 34) bucket = "25-34";
    else if (age <= 44) bucket = "35-44";
    else if (age <= 54) bucket = "45-54";
    ageBuckets.set(bucket, (ageBuckets.get(bucket) || 0) + 1);
  }
  const topAges = [...ageBuckets.entries()].map(([bucket, count]) => ({ bucket, count }));

  return {
    newCustomersThisMonth,
    returningCount,
    returningRate,
    totalCustomers,
    topSpenders,
    avgOrdersPerCustomer,
    avgSpendPerCustomer,
    topCities,
    genderBreakdown,
    topAges,
    hasDemographicData: genderRows.length > 0 || ageRows.length > 0,
  };
}
