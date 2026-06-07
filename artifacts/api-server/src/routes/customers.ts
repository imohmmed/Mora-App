import { Router } from "express";
import db, { parseRows, parseOne } from "../lib/db.js";
import { requireAdmin } from "../middlewares/auth.js";
import type { Row } from "../lib/types.js";

const router = Router();

router.use("/admin/customers", requireAdmin);

// ─── Segments & Companies MUST come before /:id ───────────────────────────────

router.get("/admin/customers/segments", (_req, res) => {
  const all = db.prepare(`SELECT segment, orders_count, accepts_marketing FROM customers`).all() as Row[];
  const segments = [
    { id: "vip",       name: "VIP Customers",     count: all.filter((c) => c["segment"] === "vip").length },
    { id: "repeat",    name: "Repeat Buyers",      count: all.filter((c) => (c["orders_count"] as number) > 2).length },
    { id: "new",       name: "New Customers",      count: all.filter((c) => (c["orders_count"] as number) === 1).length },
    { id: "marketing", name: "Accepts Marketing",  count: all.filter((c) => c["accepts_marketing"] === 1).length },
  ];
  res.json({ data: segments, meta: { total: segments.length }, error: null });
});

router.get("/admin/customers/companies", (_req, res) => {
  const rows = db.prepare(`SELECT company, COUNT(*) AS customer_count FROM customers WHERE company IS NOT NULL GROUP BY company`).all() as Row[];
  res.json({ data: parseRows(rows), meta: { total: rows.length }, error: null });
});

// ─── Customer CRUD (/:id after named sub-routes) ──────────────────────────────

router.get("/admin/customers", (req, res) => {
  const { q, segment } = req.query as Record<string, string>;
  let sql = `SELECT * FROM customers WHERE 1=1`;
  const params: unknown[] = [];
  if (q) { sql += ` AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)`; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  if (segment) { sql += ` AND segment=?`; params.push(segment); }
  sql += ` ORDER BY created_at DESC`;
  const rows = db.prepare(sql).all(...params) as Row[];
  res.json({ data: parseRows(rows), meta: { total: rows.length }, error: null });
});

router.get("/admin/customers/:id", (req, res) => {
  const customer = parseOne(db.prepare(`SELECT * FROM customers WHERE id=?`).get(req.params["id"]) as Row | undefined);
  if (!customer) { res.status(404).json({ data: null, meta: {}, error: "Customer not found" }); return; }
  const orders = parseRows(db.prepare(`SELECT * FROM orders WHERE customer_id=? ORDER BY created_at DESC`).all(req.params["id"]) as Row[]);
  res.json({ data: { ...customer, orders }, meta: {}, error: null });
});

router.post("/admin/customers", (req, res) => {
  const id = `cust_${Date.now()}`;
  const b = req.body as Record<string, unknown>;
  db.prepare(`INSERT INTO customers (id,first_name,last_name,email,phone,orders_count,total_spent,tags,segment,company,address,accepts_marketing,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, b["firstName"] ?? "", b["lastName"] ?? "", b["email"] ?? "", b["phone"] ?? "", 0, 0, "[]", null, null, JSON.stringify(b["address"] ?? {}), b["acceptsMarketing"] ? 1 : 0, new Date().toISOString());
  const customer = parseOne(db.prepare(`SELECT * FROM customers WHERE id=?`).get(id) as Row | undefined);
  res.status(201).json({ data: customer, meta: {}, error: null });
});

router.put("/admin/customers/:id", (req, res) => {
  const id = req.params["id"];
  if (!db.prepare(`SELECT id FROM customers WHERE id=?`).get(id)) { res.status(404).json({ data: null, meta: {}, error: "Customer not found" }); return; }
  const b = req.body as Record<string, unknown>;
  db.prepare(`UPDATE customers SET first_name=COALESCE(?,first_name), last_name=COALESCE(?,last_name), email=COALESCE(?,email), phone=COALESCE(?,phone), segment=COALESCE(?,segment), company=COALESCE(?,company) WHERE id=?`)
    .run(b["firstName"] ?? null, b["lastName"] ?? null, b["email"] ?? null, b["phone"] ?? null, b["segment"] ?? null, b["company"] ?? null, id);
  const customer = parseOne(db.prepare(`SELECT * FROM customers WHERE id=?`).get(id) as Row | undefined);
  res.json({ data: customer, meta: {}, error: null });
});

export default router;
