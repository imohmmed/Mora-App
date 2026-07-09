import { Router } from "express";
import db, { parseRows, getAnalyticsSummary, getRevenueByDay, getTopProducts, getAnalyticsForRange, getActivityLog } from "../lib/db.js";
import { getSalesAnalytics, getProductsAnalytics, getCustomerInsights } from "../lib/analytics2.js";
import { requireAdmin } from "../middlewares/auth.js";
import type { Row } from "../lib/types.js";

const router = Router();

router.use("/admin/analytics", requireAdmin);
router.use("/admin/markets", requireAdmin);
router.use("/admin/settings", requireAdmin);

// ─── Analytics ────────────────────────────────────────────────────────────────

router.get("/admin/analytics/summary", (_req, res) => {
  res.json({ data: getAnalyticsSummary(), meta: {}, error: null });
});

router.get("/admin/analytics/revenue", (req, res) => {
  const days = Math.min(90, Math.max(1, parseInt((req.query["days"] as string) ?? "14")));
  res.json({ data: getRevenueByDay(days), meta: { days }, error: null });
});

router.get("/admin/analytics/top-products", (req, res) => {
  const limit = Math.min(20, Math.max(1, parseInt((req.query["limit"] as string) ?? "5")));
  res.json({ data: getTopProducts(limit), meta: {}, error: null });
});

router.get("/admin/analytics/overview", (req, res) => {
  const today = new Date().toISOString().substring(0, 10);
  const from  = ((req.query["from"] as string) || today).substring(0, 10);
  const to    = ((req.query["to"]   as string) || from ).substring(0, 10);
  res.json({ data: getAnalyticsForRange(from, to), meta: { from, to }, error: null });
});

router.get("/admin/analytics/reports", (_req, res) => {
  const today      = new Date().toISOString().substring(0, 10);
  const last30From = new Date(Date.now() - 30 * 86_400_000).toISOString().substring(0, 10);
  const last60From = new Date(Date.now() - 60 * 86_400_000).toISOString().substring(0, 10);
  const last31To   = new Date(Date.now() - 31 * 86_400_000).toISOString().substring(0, 10);

  const curr = getAnalyticsForRange(last30From, today);
  const prev = getAnalyticsForRange(last60From, last31To);

  const pct = (c: number, p: number) => {
    if (p === 0) return c > 0 ? "—" : "0%";
    const v = ((c - p) / p) * 100;
    return (v >= 0 ? "+" : "") + v.toFixed(1) + "%";
  };
  const iqd = (n: number) => `${Math.round(n).toLocaleString("en-US")} IQD`;

  const summary = getAnalyticsSummary();
  const totalProducts = ((db.prepare(`SELECT COUNT(*) as n FROM products`).get() as Row)["n"] as number) || 0;

  const reports = [
    { name: "Total Sales (last 30 days)",      value: iqd(curr.totalSalesBreakdown.totalSales), change: pct(curr.totalSalesBreakdown.totalSales, prev.totalSalesBreakdown.totalSales) },
    { name: "Gross Sales (last 30 days)",       value: iqd(curr.grossSales),                     change: pct(curr.grossSales, prev.grossSales) },
    { name: "Net Sales (last 30 days)",         value: iqd(curr.totalSalesBreakdown.netSales),   change: pct(curr.totalSalesBreakdown.netSales, prev.totalSalesBreakdown.netSales) },
    { name: "Orders (last 30 days)",            value: String(curr.orders),                       change: pct(curr.orders, prev.orders) },
    { name: "Orders Fulfilled (last 30 days)",  value: String(curr.ordersFulfilled),              change: pct(curr.ordersFulfilled, prev.ordersFulfilled) },
    { name: "Average Order Value",              value: iqd(curr.avgOrderValue),                  change: pct(curr.avgOrderValue, prev.avgOrderValue) },
    { name: "Shipping Revenue",                 value: iqd(curr.totalSalesBreakdown.shippingCharges), change: pct(curr.totalSalesBreakdown.shippingCharges, prev.totalSalesBreakdown.shippingCharges) },
    { name: "Tax Collected",                    value: iqd(curr.totalSalesBreakdown.taxes),      change: pct(curr.totalSalesBreakdown.taxes, prev.totalSalesBreakdown.taxes) },
    { name: "Returning Customer Rate",          value: `${summary.returningCustomerRate}%`,      change: "—" },
    { name: "Total Customers",                  value: String(summary.customers),                change: "—" },
    { name: "Total Active Products",            value: String(totalProducts),                    change: "—" },
  ];
  res.json({ data: reports, meta: {}, error: null });
});

router.get("/admin/analytics/sales-deep", (_req, res) => {
  res.json({ data: getSalesAnalytics(), meta: {}, error: null });
});

router.get("/admin/analytics/products-deep", (_req, res) => {
  res.json({ data: getProductsAnalytics(), meta: {}, error: null });
});

router.get("/admin/analytics/customer-insights", (_req, res) => {
  res.json({ data: getCustomerInsights(), meta: {}, error: null });
});

router.get("/admin/analytics/live", (_req, res) => {
  const rows = db.prepare(`SELECT * FROM orders WHERE is_draft=0 AND is_abandoned=0 ORDER BY created_at DESC LIMIT 8`).all() as Row[];
  res.json({ data: parseRows(rows), meta: { asOf: new Date().toISOString() }, error: null });
});

// ─── Markets ──────────────────────────────────────────────────────────────────

router.get("/admin/markets", (_req, res) => {
  const rows = db.prepare(`SELECT * FROM markets ORDER BY created_at DESC`).all() as Row[];
  res.json({ data: parseRows(rows), meta: { total: rows.length }, error: null });
});

router.get("/admin/markets/:id", (req, res) => {
  const rows = db.prepare(`SELECT * FROM markets`).all() as Row[];
  const m = parseRows(rows).find((r) => r["id"] === req.params["id"]);
  if (!m) { res.status(404).json({ data: null, meta: {}, error: "Market not found" }); return; }
  res.json({ data: m, meta: {}, error: null });
});

router.post("/admin/markets", (req, res) => {
  const id = `mkt_${Date.now()}`;
  const b = req.body as Record<string, unknown>;
  db.prepare(`INSERT INTO markets (id,name,countries,currency,status,created_at) VALUES (?,?,?,?,?,?)`)
    .run(id, b["name"] ?? "", JSON.stringify(b["countries"] ?? []), b["currency"] ?? "USD", "inactive", new Date().toISOString());
  const rows = db.prepare(`SELECT * FROM markets WHERE id=?`).all(id) as Row[];
  res.status(201).json({ data: parseRows(rows)[0], meta: {}, error: null });
});

router.put("/admin/markets/:id", (req, res) => {
  const id = req.params["id"];
  const b = req.body as Record<string, unknown>;
  db.prepare(`UPDATE markets SET name=COALESCE(?,name), currency=COALESCE(?,currency), status=COALESCE(?,status) WHERE id=?`).run(b["name"] ?? null, b["currency"] ?? null, b["status"] ?? null, id);
  const rows = db.prepare(`SELECT * FROM markets WHERE id=?`).all(id) as Row[];
  res.json({ data: parseRows(rows)[0] ?? null, meta: {}, error: null });
});

router.delete("/admin/markets/:id", (req, res) => {
  db.prepare(`DELETE FROM markets WHERE id=?`).run(req.params["id"]);
  res.json({ data: { deleted: true }, meta: {}, error: null });
});

// ─── Activity Log ─────────────────────────────────────────────────────────────

router.get("/admin/analytics/activity", (req, res) => {
  const limit    = Math.min(100, Math.max(1, parseInt((req.query["limit"]    as string) ?? "60")));
  const offset   = Math.max(0,              parseInt((req.query["offset"]   as string) ?? "0"));
  const category = (req.query["category"] as string | undefined)?.trim() || undefined;
  const search   = (req.query["search"]   as string | undefined)?.trim() || undefined;
  const result = getActivityLog(limit, offset, category, search);
  res.json({ data: result.items, meta: { total: result.total, limit, offset }, error: null });
});

// ─── Settings ─────────────────────────────────────────────────────────────────

router.get("/admin/settings", (_req, res) => {
  const row = db.prepare(`SELECT value FROM settings WHERE key='store'`).get() as Row | undefined;
  const settings = row ? JSON.parse(row["value"] as string) : {};
  res.json({ data: settings, meta: {}, error: null });
});

router.put("/admin/settings", (req, res) => {
  const row = db.prepare(`SELECT value FROM settings WHERE key='store'`).get() as Row | undefined;
  const current = row ? JSON.parse(row["value"] as string) : {};
  const updated = { ...current, ...req.body };
  db.prepare(`INSERT OR REPLACE INTO settings (key,value) VALUES ('store',?)`).run(JSON.stringify(updated));
  res.json({ data: updated, meta: {}, error: null });
});

export default router;
