import { Router } from "express";
import db, { parseRows, parseOne } from "../lib/db.js";
import { requireAdmin } from "../middlewares/auth.js";
import type { Row } from "../lib/types.js";

const router = Router();

// ─── Public: customer order lookup ────────────────────────────────────────────

router.get("/store/orders", (req, res) => {
  const { email } = req.query as Record<string, string>;
  let sql = `SELECT * FROM orders WHERE is_draft=0 AND is_abandoned=0`;
  const params: unknown[] = [];
  if (email) { sql += ` AND lower(email)=lower(?)`; params.push(email); }
  sql += ` ORDER BY created_at DESC`;
  const rows = db.prepare(sql).all(...params) as Row[];
  res.json({ data: parseRows(rows), meta: { total: rows.length }, error: null });
});

router.get("/store/orders/:id", (req, res) => {
  const order = parseOne(db.prepare(`SELECT * FROM orders WHERE id=?`).get(req.params["id"]) as Row | undefined);
  if (!order) { res.status(404).json({ data: null, meta: {}, error: "Order not found" }); return; }
  res.json({ data: order, meta: {}, error: null });
});

// ─── Admin endpoints ──────────────────────────────────────────────────────────

router.use("/admin/orders", requireAdmin);

router.get("/admin/orders", (req, res) => {
  const { status, type } = req.query as Record<string, string>;
  let sql = `SELECT * FROM orders WHERE 1=1`;
  const params: unknown[] = [];
  if (type === "drafts") { sql += ` AND is_draft=1`; }
  else if (type === "abandoned") { sql += ` AND is_abandoned=1`; }
  else { sql += ` AND is_draft=0 AND is_abandoned=0`; }
  if (status) { sql += ` AND status=?`; params.push(status); }
  sql += ` ORDER BY created_at DESC`;
  const rows = db.prepare(sql).all(...params) as Row[];
  res.json({ data: parseRows(rows), meta: { total: rows.length }, error: null });
});

router.get("/admin/orders/:id", (req, res) => {
  const order = parseOne(db.prepare(`SELECT * FROM orders WHERE id=?`).get(req.params["id"]) as Row | undefined);
  if (!order) { res.status(404).json({ data: null, meta: {}, error: "Order not found" }); return; }
  res.json({ data: order, meta: {}, error: null });
});

router.post("/admin/orders", (req, res) => {
  const id = `ord_${Date.now()}`;
  const now = new Date().toISOString();
  const count = (db.prepare(`SELECT COUNT(*) AS n FROM orders`).get() as Row)["n"] as number;
  const b = req.body as Record<string, unknown>;
  db.prepare(`INSERT INTO orders (id,order_number,customer_id,email,status,financial_status,fulfillment_status,subtotal,shipping,tax,total,currency,shipping_address,line_items,note,tags,is_draft,is_abandoned,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, `#${1000 + count}`, null, b["email"] ?? "", "pending", "pending", "unfulfilled", 0, 5.99, 0, 0, "USD", JSON.stringify(b["shippingAddress"] ?? {}), JSON.stringify(b["lineItems"] ?? []), b["note"] ?? "", "[]", 1, 0, now, now);
  const order = parseOne(db.prepare(`SELECT * FROM orders WHERE id=?`).get(id) as Row | undefined);
  res.status(201).json({ data: order, meta: {}, error: null });
});

router.put("/admin/orders/:id", (req, res) => {
  const id = req.params["id"];
  if (!db.prepare(`SELECT id FROM orders WHERE id=?`).get(id)) { res.status(404).json({ data: null, meta: {}, error: "Order not found" }); return; }
  const b = req.body as Record<string, unknown>;
  const now = new Date().toISOString();
  db.prepare(`UPDATE orders SET status=COALESCE(?,status), financial_status=COALESCE(?,financial_status), fulfillment_status=COALESCE(?,fulfillment_status), note=COALESCE(?,note), updated_at=? WHERE id=?`)
    .run(b["status"] ?? null, b["financialStatus"] ?? null, b["fulfillmentStatus"] ?? null, b["note"] ?? null, now, id);
  const order = parseOne(db.prepare(`SELECT * FROM orders WHERE id=?`).get(id) as Row | undefined);
  res.json({ data: order, meta: {}, error: null });
});

export default router;
