import { Router } from "express";
import db, { parseRows, parseOne } from "../lib/db.js";
import { requireAdmin } from "../middlewares/auth.js";
import type { Row } from "../lib/types.js";

const router = Router();

// ─── Public store endpoints ────────────────────────────────────────────────────

router.get("/store/products", (req, res) => {
  const { category, q, limit = "20", page = "1" } = req.query as Record<string, string>;
  let sql = `SELECT * FROM products WHERE status='active'`;
  const params: unknown[] = [];
  if (category === "sale") {
    // The Sale section auto-includes any discounted product (compare_price > price),
    // regardless of its category, plus anything explicitly filed under "sale".
    sql += ` AND (category='sale' OR (compare_price IS NOT NULL AND compare_price > price))`;
  } else if (category) {
    sql += ` AND category=?`; params.push(category);
  }
  if (q) { sql += ` AND (title LIKE ? OR tags LIKE ?)`; params.push(`%${q}%`, `%${q}%`); }
  const all = db.prepare(sql).all(...params) as Row[];
  const total = all.length;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const sliced = all.slice((pageNum - 1) * limitNum, pageNum * limitNum);
  const getVariants = db.prepare(`SELECT * FROM variants WHERE product_id=?`);
  const products = parseRows(sliced).map((p) => ({
    ...p,
    variants: parseRows(getVariants.all(p["id"] as string) as Row[]),
  }));
  res.json({ data: products, meta: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) }, error: null });
});

router.get("/store/products/:id", (req, res) => {
  const product = parseOne(db.prepare(`SELECT * FROM products WHERE id=?`).get(req.params["id"]) as Row | undefined);
  if (!product) { res.status(404).json({ data: null, meta: {}, error: "Product not found" }); return; }
  const variants = parseRows(db.prepare(`SELECT * FROM variants WHERE product_id=?`).all(req.params["id"]) as Row[]);
  res.json({ data: { ...product, variants }, meta: {}, error: null });
});

router.get("/store/search", (req, res) => {
  const { q = "" } = req.query as Record<string, string>;
  const rows = db.prepare(`SELECT * FROM products WHERE status='active' AND (title LIKE ? OR vendor LIKE ? OR tags LIKE ?)`).all(`%${q}%`, `%${q}%`, `%${q}%`) as Row[];
  res.json({ data: parseRows(rows), meta: { total: rows.length, query: q }, error: null });
});

router.get("/store/collections", (_req, res) => {
  const rows = db.prepare(`SELECT * FROM collections`).all() as Row[];
  res.json({ data: parseRows(rows), meta: { total: rows.length }, error: null });
});

router.get("/store/collections/:id", (req, res) => {
  const col = parseOne(db.prepare(`SELECT * FROM collections WHERE id=?`).get(req.params["id"]) as Row | undefined);
  if (!col) { res.status(404).json({ data: null, meta: {}, error: "Collection not found" }); return; }
  res.json({ data: col, meta: {}, error: null });
});

router.get("/store/settings", (_req, res) => {
  const row = db.prepare(`SELECT value FROM settings WHERE key='store'`).get() as Row | undefined;
  const s = (row ? JSON.parse(row["value"] as string) : {}) as Record<string, unknown>;
  res.json({
    data: {
      shippingMethods: s["shippingMethods"] ?? [],
      tax: s["tax"] ?? { enabled: false, inclusive: false, regions: [] },
      paymentMethods: s["paymentMethods"] ?? { card: true, cod: true, applePay: false, paypal: false },
      currency: s["currency"] ?? "USD",
    },
    meta: {},
    error: null,
  });
});

// ─── Admin: products ──────────────────────────────────────────────────────────

router.use("/admin/products", requireAdmin);

router.get("/admin/products", (req, res) => {
  const { status, category, q } = req.query as Record<string, string>;
  let sql = `SELECT p.*, (SELECT COALESCE(SUM(v.inventory),0) FROM variants v WHERE v.product_id=p.id) AS total_inventory, (SELECT COUNT(*) FROM variants v WHERE v.product_id=p.id) AS variants_count FROM products p WHERE 1=1`;
  const params: unknown[] = [];
  if (status) { sql += ` AND p.status=?`; params.push(status); }
  if (category) { sql += ` AND p.category=?`; params.push(category); }
  if (q) { sql += ` AND p.title LIKE ?`; params.push(`%${q}%`); }
  const rows = db.prepare(sql).all(...params) as Row[];
  res.json({ data: parseRows(rows), meta: { total: rows.length }, error: null });
});

router.get("/admin/products/:id", (req, res) => {
  const product = parseOne(db.prepare(`SELECT * FROM products WHERE id=?`).get(req.params["id"]) as Row | undefined);
  if (!product) { res.status(404).json({ data: null, meta: {}, error: "Product not found" }); return; }
  const variants = parseRows(db.prepare(`SELECT * FROM variants WHERE product_id=?`).all(req.params["id"]) as Row[]);
  res.json({ data: { ...product, variants }, meta: {}, error: null });
});

router.post("/admin/products", (req, res) => {
  const id = `p_${Date.now()}`;
  const now = new Date().toISOString();
  const b = req.body as Record<string, unknown>;
  const slug = (b["urlSlug"] as string | undefined) || (b["title"] as string || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || id;
  db.prepare(`INSERT INTO products (id,title,vendor,category,description,price,compare_price,cost,images,tags,status,option_definitions,seo_title,seo_description,url_slug,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, b["title"] ?? "", b["vendor"] ?? "", b["category"] ?? "women", b["description"] ?? "", b["price"] ?? 0, b["compareAtPrice"] ?? null, b["cost"] ?? null, JSON.stringify(b["images"] ?? []), JSON.stringify(b["tags"] ?? []), b["status"] ?? "draft", JSON.stringify(b["optionDefinitions"] ?? []), b["seoTitle"] ?? "", b["seoDescription"] ?? "", slug, now, now);
  const product = parseOne(db.prepare(`SELECT * FROM products WHERE id=?`).get(id) as Row | undefined);
  res.status(201).json({ data: product, meta: {}, error: null });
});

router.put("/admin/products/:id", (req, res) => {
  const id = req.params["id"];
  const existing = db.prepare(`SELECT id FROM products WHERE id=?`).get(id);
  if (!existing) { res.status(404).json({ data: null, meta: {}, error: "Product not found" }); return; }
  const b = req.body as Record<string, unknown>;
  const now = new Date().toISOString();
  db.prepare(`UPDATE products SET title=COALESCE(?,title), vendor=COALESCE(?,vendor), category=COALESCE(?,category), description=COALESCE(?,description), price=COALESCE(?,price), compare_price=?, cost=COALESCE(?,cost), images=COALESCE(?,images), tags=COALESCE(?,tags), status=COALESCE(?,status), option_definitions=COALESCE(?,option_definitions), seo_title=COALESCE(?,seo_title), seo_description=COALESCE(?,seo_description), url_slug=COALESCE(?,url_slug), updated_at=? WHERE id=?`)
    .run(b["title"] ?? null, b["vendor"] ?? null, b["category"] ?? null, b["description"] ?? null, b["price"] ?? null, b["compareAtPrice"] ?? null, b["cost"] ?? null, b["images"] !== undefined ? JSON.stringify(b["images"]) : null, b["tags"] !== undefined ? JSON.stringify(b["tags"]) : null, b["status"] ?? null, b["optionDefinitions"] !== undefined ? JSON.stringify(b["optionDefinitions"]) : null, b["seoTitle"] ?? null, b["seoDescription"] ?? null, b["urlSlug"] ?? null, now, id);
  const product = parseOne(db.prepare(`SELECT * FROM products WHERE id=?`).get(id) as Row | undefined);
  res.json({ data: product, meta: {}, error: null });
});

// ─── Admin: product collections & variant sync ────────────────────────────────

router.get("/admin/products/:id/collections", requireAdmin, (req, res) => {
  const productId = req.params["id"];
  const rows = db.prepare(`SELECT c.* FROM collections c JOIN product_collections pc ON pc.collection_id=c.id WHERE pc.product_id=?`).all(productId) as Row[];
  res.json({ data: parseRows(rows), meta: { total: rows.length }, error: null });
});

router.put("/admin/products/:id/collections", requireAdmin, (req, res) => {
  const productId = req.params["id"];
  if (!db.prepare(`SELECT id FROM products WHERE id=?`).get(productId)) { res.status(404).json({ data: null, meta: {}, error: "Product not found" }); return; }
  const b = req.body as { collectionIds?: string[] };
  const ids = b.collectionIds ?? [];
  db.prepare(`DELETE FROM product_collections WHERE product_id=?`).run(productId);
  const ins = db.prepare(`INSERT OR IGNORE INTO product_collections (product_id,collection_id) VALUES (?,?)`);
  for (const cid of ids) ins.run(productId, cid);
  res.json({ data: { collectionIds: ids }, meta: {}, error: null });
});

router.post("/admin/products/:id/variants/sync", requireAdmin, (req, res) => {
  const productId = req.params["id"];
  if (!db.prepare(`SELECT id FROM products WHERE id=?`).get(productId)) { res.status(404).json({ data: null, meta: {}, error: "Product not found" }); return; }
  const b = req.body as { variants?: Record<string, unknown>[] };
  const incoming = b.variants ?? [];
  const existing = db.prepare(`SELECT * FROM variants WHERE product_id=?`).all(productId) as Row[];
  const existingByKey = new Map<string, Row>();
  for (const v of existing) {
    const key = [v["option1"], v["option2"]].filter(Boolean).join(" / ") || "Default Title";
    existingByKey.set(key, v);
  }
  db.prepare(`DELETE FROM variants WHERE product_id=?`).run(productId);
  const insertMany = db.transaction(() => {
    for (let i = 0; i < incoming.length; i++) {
      const v = incoming[i];
      const o1 = (v["option1"] as string | undefined) ?? null;
      const o2 = (v["option2"] as string | undefined) ?? null;
      const key = [o1, o2].filter(Boolean).join(" / ") || "Default Title";
      const prev = existingByKey.get(key);
      const vid = `var_${Date.now()}_${i}_${Math.floor(Math.random() * 9999)}`;
      const title = key;
      const inventory = (v["inventory"] as number | undefined) ?? (prev?.["inventory"] as number | undefined) ?? 0;
      db.prepare(`INSERT INTO variants (id,product_id,title,sku,price,compare_price,cost,inventory,option1,option2) VALUES (?,?,?,?,?,?,?,?,?,?)`)
        .run(vid, productId, title, v["sku"] ?? "", v["price"] ?? 0, v["comparePrice"] ?? null, v["cost"] ?? null, inventory, o1, o2);
    }
  });
  insertMany();
  const variants = parseRows(db.prepare(`SELECT * FROM variants WHERE product_id=?`).all(productId) as Row[]);
  res.json({ data: variants, meta: { total: variants.length }, error: null });
});

router.delete("/admin/products/:id", (req, res) => {
  const id = req.params["id"];
  if (!db.prepare(`SELECT id FROM products WHERE id=?`).get(id)) { res.status(404).json({ data: null, meta: {}, error: "Product not found" }); return; }
  db.prepare(`DELETE FROM products WHERE id=?`).run(id);
  res.json({ data: { deleted: true }, meta: {}, error: null });
});

// ─── Admin: collections ───────────────────────────────────────────────────────

type SmartCondition = { field: string; operator: string; value: string };

function buildSmartWhere(conditions: SmartCondition[], match: string): { where: string; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];
  for (const cond of conditions) {
    const { field, operator, value } = cond;
    if (value === undefined || value === null || value === "") continue;
    if (["title", "vendor", "category"].includes(field)) {
      switch (operator) {
        case "is_equal_to":     clauses.push(`${field}=?`);         params.push(value); break;
        case "is_not_equal_to": clauses.push(`${field}!=?`);        params.push(value); break;
        case "contains":        clauses.push(`${field} LIKE ?`);    params.push(`%${value}%`); break;
        case "not_contains":    clauses.push(`${field} NOT LIKE ?`);params.push(`%${value}%`); break;
        case "starts_with":     clauses.push(`${field} LIKE ?`);    params.push(`${value}%`); break;
      }
    } else if (field === "tag") {
      switch (operator) {
        case "is_equal_to":     clauses.push(`tags LIKE ?`);     params.push(`%"${value}"%`); break;
        case "is_not_equal_to": clauses.push(`tags NOT LIKE ?`); params.push(`%"${value}"%`); break;
        case "contains":        clauses.push(`tags LIKE ?`);     params.push(`%${value}%`); break;
        case "not_contains":    clauses.push(`tags NOT LIKE ?`); params.push(`%${value}%`); break;
      }
    } else if (["price", "compare_price"].includes(field)) {
      const num = parseFloat(value);
      if (isNaN(num)) continue;
      switch (operator) {
        case "is_equal_to":     clauses.push(`${field}=?`); params.push(num); break;
        case "is_not_equal_to": clauses.push(`${field}!=?`);params.push(num); break;
        case "greater_than":    clauses.push(`${field}>?`); params.push(num); break;
        case "less_than":       clauses.push(`${field}<?`); params.push(num); break;
      }
    }
  }
  if (clauses.length === 0) return { where: "1=1", params: [] };
  const joiner = match === "any" ? " OR " : " AND ";
  return { where: `(${clauses.join(joiner)})`, params };
}

router.use("/admin/collections", requireAdmin);

router.get("/admin/collections", (_req, res) => {
  const rows = db.prepare(`SELECT * FROM collections`).all() as Row[];
  res.json({ data: parseRows(rows), meta: { total: rows.length }, error: null });
});

router.get("/admin/collections/:id", (req, res) => {
  const col = parseOne(db.prepare(`SELECT * FROM collections WHERE id=?`).get(req.params["id"]) as Row | undefined);
  if (!col) { res.status(404).json({ data: null, meta: {}, error: "Collection not found" }); return; }
  res.json({ data: col, meta: {}, error: null });
});

router.get("/admin/collections/:id/products", requireAdmin, (req, res) => {
  const col = db.prepare(`SELECT * FROM collections WHERE id=?`).get(req.params["id"]) as Row | undefined;
  if (!col) { res.status(404).json({ data: null, meta: {}, error: "Not found" }); return; }
  let rows: Row[];
  if (col["collection_type"] === "smart") {
    const conds: SmartCondition[] = JSON.parse((col["conditions"] as string) || "[]");
    const match = (col["conditions_match"] as string) || "all";
    const { where, params } = buildSmartWhere(conds, match);
    rows = db.prepare(`SELECT * FROM products WHERE status='active' AND ${where}`).all(...params) as Row[];
  } else {
    rows = db.prepare(`SELECT p.* FROM products p JOIN product_collections pc ON pc.product_id=p.id WHERE pc.collection_id=? AND p.status='active'`).all(req.params["id"]) as Row[];
  }
  res.json({ data: parseRows(rows), meta: { total: rows.length }, error: null });
});

router.post("/admin/collections/smart-preview", requireAdmin, (req, res) => {
  const { conditions = [], match = "all" } = req.body as { conditions?: SmartCondition[]; match?: string };
  const { where, params } = buildSmartWhere(conditions, match);
  const rows = db.prepare(`SELECT * FROM products WHERE status='active' AND ${where} LIMIT 50`).all(...params) as Row[];
  res.json({ data: parseRows(rows), meta: { total: rows.length }, error: null });
});

router.post("/admin/collections", (req, res) => {
  const id = `col_${Date.now()}`;
  const b = req.body as Record<string, unknown>;
  const type = (b["collectionType"] as string) || "manual";
  const conds = b["conditions"] ? JSON.stringify(b["conditions"]) : "[]";
  const match = (b["conditionsMatch"] as string) || "all";
  db.prepare(`INSERT INTO collections (id,title,description,image,background_image,collection_type,conditions,conditions_match,products_count,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(id, b["title"] ?? "", b["description"] ?? "", b["image"] ?? "", b["backgroundImage"] ?? "", type, conds, match, 0, new Date().toISOString());
  const col = parseOne(db.prepare(`SELECT * FROM collections WHERE id=?`).get(id) as Row | undefined);
  res.status(201).json({ data: col, meta: {}, error: null });
});

router.put("/admin/collections/:id", (req, res) => {
  const id = req.params["id"];
  if (!db.prepare(`SELECT id FROM collections WHERE id=?`).get(id)) { res.status(404).json({ data: null, meta: {}, error: "Collection not found" }); return; }
  const b = req.body as Record<string, unknown>;
  const conds = b["conditions"] !== undefined ? JSON.stringify(b["conditions"]) : null;
  db.prepare(`UPDATE collections SET title=COALESCE(?,title), description=COALESCE(?,description), image=COALESCE(?,image), background_image=COALESCE(?,background_image), collection_type=COALESCE(?,collection_type), conditions=COALESCE(?,conditions), conditions_match=COALESCE(?,conditions_match) WHERE id=?`)
    .run(b["title"] ?? null, b["description"] ?? null, b["image"] ?? null, b["backgroundImage"] ?? null, b["collectionType"] ?? null, conds, b["conditionsMatch"] ?? null, id);
  const col = parseOne(db.prepare(`SELECT * FROM collections WHERE id=?`).get(id) as Row | undefined);
  res.json({ data: col, meta: {}, error: null });
});

router.delete("/admin/collections/:id", (req, res) => {
  db.prepare(`DELETE FROM collections WHERE id=?`).run(req.params["id"]);
  res.json({ data: { deleted: true }, meta: {}, error: null });
});

// ─── Admin: variants / inventory ──────────────────────────────────────────────

router.use("/admin/variants", requireAdmin);

router.get("/admin/variants", (_req, res) => {
  const rows = db.prepare(`SELECT * FROM variants`).all() as Row[];
  res.json({ data: parseRows(rows), meta: { total: rows.length }, error: null });
});

router.get("/admin/variants/:productId", (req, res) => {
  const rows = db.prepare(`SELECT * FROM variants WHERE product_id=?`).all(req.params["productId"]) as Row[];
  res.json({ data: parseRows(rows), meta: { total: rows.length }, error: null });
});

router.post("/admin/variants", (req, res) => {
  const b = req.body as Record<string, unknown>;
  const productId = b["productId"] as string | undefined;
  if (!productId || !db.prepare(`SELECT id FROM products WHERE id=?`).get(productId)) { res.status(404).json({ data: null, meta: {}, error: "Product not found" }); return; }
  const id = `var_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const option1 = (b["option1"] as string | undefined) ?? null;
  const option2 = (b["option2"] as string | undefined) ?? null;
  const derived = [option1, option2].filter(Boolean).join(" / ");
  const title = (b["title"] as string | undefined) ?? (derived || "Default Title");
  db.prepare(`INSERT INTO variants (id,product_id,title,sku,price,compare_price,cost,inventory,option1,option2) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(id, productId, title, b["sku"] ?? "", b["price"] ?? 0, b["comparePrice"] ?? null, b["cost"] ?? null, b["inventory"] ?? 0, option1, option2);
  const variant = parseOne(db.prepare(`SELECT * FROM variants WHERE id=?`).get(id) as Row | undefined);
  res.status(201).json({ data: variant, meta: {}, error: null });
});

router.put("/admin/variants/:id/update", (req, res) => {
  const id = req.params["id"];
  if (!db.prepare(`SELECT id FROM variants WHERE id=?`).get(id)) { res.status(404).json({ data: null, meta: {}, error: "Variant not found" }); return; }
  const b = req.body as Record<string, unknown>;
  db.prepare(`UPDATE variants SET inventory=COALESCE(?,inventory), price=COALESCE(?,price), sku=COALESCE(?,sku), title=COALESCE(?,title), compare_price=COALESCE(?,compare_price), cost=COALESCE(?,cost) WHERE id=?`).run(b["inventory"] ?? null, b["price"] ?? null, b["sku"] ?? null, b["title"] ?? null, b["comparePrice"] ?? null, b["cost"] ?? null, id);
  const variant = parseOne(db.prepare(`SELECT * FROM variants WHERE id=?`).get(id) as Row | undefined);
  res.json({ data: variant, meta: {}, error: null });
});

router.delete("/admin/variants/:id", (req, res) => {
  const id = req.params["id"];
  if (!db.prepare(`SELECT id FROM variants WHERE id=?`).get(id)) { res.status(404).json({ data: null, meta: {}, error: "Variant not found" }); return; }
  db.prepare(`DELETE FROM variants WHERE id=?`).run(id);
  res.json({ data: { deleted: true }, meta: {}, error: null });
});

export default router;
