import { Router } from "express";
import db, { parseRows, parseOne, logActivity } from "../lib/db.js";
import { requireAdmin } from "../middlewares/auth.js";
import type { Row } from "../lib/types.js";

const router = Router();

const numOrNull = (v: unknown): number | null =>
  v === null || v === undefined || v === "" ? null : Number(v);

// ─── Public: storefront ───────────────────────────────────────────────────────

router.get("/store/shipping-zones", (_req, res) => {
  const rows = db.prepare(
    `SELECT * FROM shipping_zones WHERE enabled=1 ORDER BY sort_order, governorate`,
  ).all() as Row[];
  res.json({ data: parseRows(rows), meta: { total: rows.length }, error: null });
});

router.get("/store/shipping-rules", (_req, res) => {
  const rows = db.prepare(
    `SELECT * FROM shipping_rules WHERE enabled=1 ORDER BY sort_order, created_at`,
  ).all() as Row[];
  res.json({ data: parseRows(rows), meta: { total: rows.length }, error: null });
});

// ─── Admin: shipping zones (per-governorate pricing) ──────────────────────────

router.use("/admin/shipping-zones", requireAdmin);
router.use("/admin/shipping-rules", requireAdmin);

router.get("/admin/shipping-zones", (_req, res) => {
  const rows = db.prepare(
    `SELECT * FROM shipping_zones ORDER BY sort_order, governorate`,
  ).all() as Row[];
  res.json({ data: parseRows(rows), meta: { total: rows.length }, error: null });
});

router.post("/admin/shipping-zones", (req, res) => {
  const b = req.body as Record<string, unknown>;
  const gov = ((b["governorate"] as string) ?? "").trim();
  if (!gov) {
    res.status(400).json({ data: null, error: "governorate is required" });
    return;
  }
  const id = `sz_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const sortOrder = (db.prepare(`SELECT COALESCE(MAX(sort_order),-1)+1 AS n FROM shipping_zones`).get() as Row)["n"] as number;
  db.prepare(
    `INSERT INTO shipping_zones (id,governorate,governorate_ar,price,sort_order,enabled) VALUES (?,?,?,?,?,?)`,
  ).run(id, gov, (b["governorateAr"] as string) ?? "", Number(b["price"]) || 0, sortOrder, b["enabled"] === false ? 0 : 1);
  logActivity("shipping.zone_created", "Settings", "shipping_zone", id, gov, "Admin", {});
  const row = parseOne(db.prepare(`SELECT * FROM shipping_zones WHERE id=?`).get(id) as Row);
  res.status(201).json({ data: row, error: null });
});

// Bulk save (the admin "Save prices" button sends the whole list).
router.put("/admin/shipping-zones", (req, res) => {
  const b = req.body as { zones?: Array<Record<string, unknown>> };
  const zones = Array.isArray(b.zones) ? b.zones : [];
  const upd = db.prepare(
    `UPDATE shipping_zones SET price=?, enabled=?, governorate_ar=COALESCE(?,governorate_ar) WHERE id=?`,
  );
  const tx = db.transaction((list: Array<Record<string, unknown>>) => {
    for (const z of list) {
      upd.run(Number(z["price"]) || 0, z["enabled"] === false ? 0 : 1, (z["governorateAr"] as string) ?? null, z["id"]);
    }
  });
  tx(zones);
  logActivity("shipping.zones_updated", "Settings", "shipping_zone", null, `${zones.length} governorates`, "Admin", {});
  const rows = db.prepare(`SELECT * FROM shipping_zones ORDER BY sort_order, governorate`).all() as Row[];
  res.json({ data: parseRows(rows), meta: { total: rows.length }, error: null });
});

router.put("/admin/shipping-zones/:id", (req, res) => {
  const id = req.params["id"];
  const existing = db.prepare(`SELECT id FROM shipping_zones WHERE id=?`).get(id) as Row | undefined;
  if (!existing) { res.status(404).json({ data: null, error: "Not found" }); return; }
  const b = req.body as Record<string, unknown>;
  db.prepare(
    `UPDATE shipping_zones SET
       governorate=COALESCE(?,governorate),
       governorate_ar=COALESCE(?,governorate_ar),
       price=COALESCE(?,price),
       enabled=COALESCE(?,enabled)
     WHERE id=?`,
  ).run(
    (b["governorate"] as string) ?? null,
    (b["governorateAr"] as string) ?? null,
    b["price"] != null ? Number(b["price"]) : null,
    b["enabled"] != null ? (b["enabled"] ? 1 : 0) : null,
    id,
  );
  const row = parseOne(db.prepare(`SELECT * FROM shipping_zones WHERE id=?`).get(id) as Row);
  res.json({ data: row, error: null });
});

router.delete("/admin/shipping-zones/:id", (req, res) => {
  db.prepare(`DELETE FROM shipping_zones WHERE id=?`).run(req.params["id"]);
  res.json({ data: { deleted: true }, error: null });
});

// ─── Admin: shipping rules (bilingual text + free-delivery threshold) ──────────

router.get("/admin/shipping-rules", (_req, res) => {
  const rows = db.prepare(
    `SELECT * FROM shipping_rules ORDER BY sort_order, created_at`,
  ).all() as Row[];
  res.json({ data: parseRows(rows), meta: { total: rows.length }, error: null });
});

router.post("/admin/shipping-rules", (req, res) => {
  const b = req.body as Record<string, unknown>;
  const id = `sr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const sortOrder = (db.prepare(`SELECT COALESCE(MAX(sort_order),-1)+1 AS n FROM shipping_rules`).get() as Row)["n"] as number;
  db.prepare(
    `INSERT INTO shipping_rules (id,text_en,text_ar,threshold,enabled,sort_order,created_at) VALUES (?,?,?,?,?,?,?)`,
  ).run(
    id,
    (b["textEn"] as string) ?? "",
    (b["textAr"] as string) ?? "",
    numOrNull(b["threshold"]),
    b["enabled"] === false ? 0 : 1,
    sortOrder,
    new Date().toISOString(),
  );
  logActivity("shipping.rule_created", "Settings", "shipping_rule", id, (b["textEn"] as string) ?? "", "Admin", {});
  const row = parseOne(db.prepare(`SELECT * FROM shipping_rules WHERE id=?`).get(id) as Row);
  res.status(201).json({ data: row, error: null });
});

router.put("/admin/shipping-rules/:id", (req, res) => {
  const id = req.params["id"];
  const existing = db.prepare(`SELECT id FROM shipping_rules WHERE id=?`).get(id) as Row | undefined;
  if (!existing) { res.status(404).json({ data: null, error: "Not found" }); return; }
  const b = req.body as Record<string, unknown>;
  const has = (k: string) => Object.prototype.hasOwnProperty.call(b, k);
  db.prepare(
    `UPDATE shipping_rules SET
       text_en=COALESCE(?,text_en),
       text_ar=COALESCE(?,text_ar),
       threshold=CASE WHEN ?=1 THEN ? ELSE threshold END,
       enabled=COALESCE(?,enabled)
     WHERE id=?`,
  ).run(
    (b["textEn"] as string) ?? null,
    (b["textAr"] as string) ?? null,
    has("threshold") ? 1 : 0, numOrNull(b["threshold"]),
    b["enabled"] != null ? (b["enabled"] ? 1 : 0) : null,
    id,
  );
  const row = parseOne(db.prepare(`SELECT * FROM shipping_rules WHERE id=?`).get(id) as Row);
  res.json({ data: row, error: null });
});

router.delete("/admin/shipping-rules/:id", (req, res) => {
  db.prepare(`DELETE FROM shipping_rules WHERE id=?`).run(req.params["id"]);
  res.json({ data: { deleted: true }, error: null });
});

export default router;
