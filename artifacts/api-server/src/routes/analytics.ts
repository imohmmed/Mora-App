import { Router } from "express";
import db, { parseRows, getAnalyticsSummary, getRevenueByDay, getTopProducts } from "../lib/db.js";
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

router.get("/admin/analytics/reports", (_req, res) => {
  const summary = getAnalyticsSummary();
  const reports = [
    { name: "Total Sales",           value: `$${summary.revenue.toFixed(2)}`,  change: "+12.4%" },
    { name: "Average Order Value",   value: `$${summary.avgOrderValue.toFixed(2)}`, change: "+3.1%" },
    { name: "Orders Fulfilled",      value: (db.prepare(`SELECT COUNT(*) AS n FROM orders WHERE fulfillment_status='fulfilled'`).get() as Row)["n"], change: "+8.7%" },
    { name: "Return Rate",           value: "4.2%",                            change: "-0.5%" },
    { name: "New Customers",         value: 42,                                change: "+22%" },
    { name: "Repeat Purchase Rate",  value: "31%",                             change: "+5%" },
  ];
  res.json({ data: reports, meta: {}, error: null });
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
