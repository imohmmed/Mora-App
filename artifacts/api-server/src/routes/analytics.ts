import { Router } from "express";
import { markets, storeSettings, getAnalyticsSummary, getRevenueByDay, getTopProducts, orders, type Market } from "../lib/db.js";
import { requireAdmin } from "../middlewares/auth.js";

const router = Router();

router.use("/admin/analytics", requireAdmin);
router.use("/admin/markets", requireAdmin);
router.use("/admin/settings", requireAdmin);

// ─── Analytics ────────────────────────────────────────────────────────────────

router.get("/admin/analytics/summary", (_req, res) => {
  res.json({ data: getAnalyticsSummary(), meta: {}, error: null });
});

router.get("/admin/analytics/revenue", (req, res) => {
  const days = parseInt((req.query["days"] as string) ?? "14");
  res.json({ data: getRevenueByDay(days), meta: { days }, error: null });
});

router.get("/admin/analytics/top-products", (req, res) => {
  const limit = parseInt((req.query["limit"] as string) ?? "5");
  res.json({ data: getTopProducts(limit), meta: {}, error: null });
});

router.get("/admin/analytics/reports", (_req, res) => {
  const orderList = [...orders.values()].filter((o) => !o.isDraft && !o.isAbandoned);
  const reports = [
    { name: "Total Sales", value: `$${orderList.reduce((s, o) => s + o.total, 0).toFixed(2)}`, change: "+12.4%" },
    { name: "Average Order Value", value: `$${(orderList.reduce((s, o) => s + o.total, 0) / Math.max(orderList.length, 1)).toFixed(2)}`, change: "+3.1%" },
    { name: "Orders Fulfilled", value: orderList.filter((o) => o.fulfillmentStatus === "fulfilled").length, change: "+8.7%" },
    { name: "Return Rate", value: "4.2%", change: "-0.5%" },
    { name: "New Customers", value: 42, change: "+22%" },
    { name: "Repeat Purchase Rate", value: "31%", change: "+5%" },
  ];
  res.json({ data: reports, meta: {}, error: null });
});

router.get("/admin/analytics/live", (_req, res) => {
  // Last 5 orders as "live" activity
  const live = [...orders.values()]
    .filter((o) => !o.isDraft && !o.isAbandoned)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);
  res.json({ data: live, meta: { asOf: new Date().toISOString() }, error: null });
});

// ─── Markets ──────────────────────────────────────────────────────────────────

router.get("/admin/markets", (_req, res) => {
  res.json({ data: [...markets.values()], meta: { total: markets.size }, error: null });
});

router.get("/admin/markets/:id", (req, res) => {
  const m = markets.get(req.params.id!);
  if (!m) {
    res.status(404).json({ data: null, meta: {}, error: "Market not found" });
    return;
  }
  res.json({ data: m, meta: {}, error: null });
});

router.post("/admin/markets", (req, res) => {
  const id = `mkt_${Date.now()}`;
  const market: Market = {
    id,
    name: "",
    countries: [],
    currency: "USD",
    status: "inactive",
    createdAt: new Date().toISOString(),
    ...req.body,
  };
  markets.set(id, market);
  res.status(201).json({ data: market, meta: {}, error: null });
});

router.put("/admin/markets/:id", (req, res) => {
  const m = markets.get(req.params.id!);
  if (!m) {
    res.status(404).json({ data: null, meta: {}, error: "Market not found" });
    return;
  }
  const updated = { ...m, ...req.body, id: m.id };
  markets.set(m.id, updated);
  res.json({ data: updated, meta: {}, error: null });
});

// ─── Settings ─────────────────────────────────────────────────────────────────

router.get("/admin/settings", (_req, res) => {
  res.json({ data: storeSettings, meta: {}, error: null });
});

router.put("/admin/settings", (req, res) => {
  Object.assign(storeSettings, req.body);
  res.json({ data: storeSettings, meta: {}, error: null });
});

// ─── Metaobjects / Files stubs ─────────────────────────────────────────────────

router.get("/admin/content/metaobjects", requireAdmin, (_req, res) => {
  res.json({
    data: [
      { id: "meta1", type: "size_guide", fields: { title: "Women's Size Guide", content: "XS: 6-8, S: 8-10, M: 10-12, L: 12-14, XL: 14-16" } },
      { id: "meta2", type: "size_guide", fields: { title: "Men's Size Guide", content: "S: 36-38, M: 38-40, L: 40-42, XL: 42-44" } },
      { id: "meta3", type: "faq", fields: { question: "What is your return policy?", answer: "Free returns within 30 days." } },
    ],
    meta: { total: 3 },
    error: null,
  });
});

router.get("/admin/content/files", requireAdmin, (_req, res) => {
  res.json({
    data: [
      { id: "f1", filename: "summer-lookbook.pdf", size: 2_400_000, mimeType: "application/pdf", url: "#", createdAt: new Date().toISOString() },
      { id: "f2", filename: "size-guide.png", size: 340_000, mimeType: "image/png", url: "#", createdAt: new Date().toISOString() },
    ],
    meta: { total: 2 },
    error: null,
  });
});

export default router;
