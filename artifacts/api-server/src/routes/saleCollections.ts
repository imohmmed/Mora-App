import { Router } from "express";
import db, { parseRows } from "../lib/db.js";
import { requireAdmin } from "../middlewares/auth.js";
import type { Row } from "../lib/types.js";

const router = Router();
const now = () => new Date().toISOString();

function parseCol(row: Row) {
  return {
    id: row["id"] as string,
    title: row["title"] as string,
    titleAr: row["title_ar"] as string,
    description: row["description"] as string,
    descriptionAr: row["description_ar"] as string,
    image: row["image"] as string,
    sortOrder: row["sort_order"] as number,
    active: Boolean(row["active"]),
    conditionType: row["condition_type"] as string,
    conditionValue: row["condition_value"] as string,
    createdAt: row["created_at"] as string,
    updatedAt: row["updated_at"] as string,
  };
}

function getProducts(id: string, conditionType: string, conditionValue: string): Row[] {
  if (conditionType === "tag" && conditionValue) {
    return db
      .prepare(
        `SELECT * FROM products WHERE status='active' AND json_extract(tags,'$') LIKE ? ORDER BY sold_count DESC LIMIT 60`
      )
      .all(`%"${conditionValue}"%`) as Row[];
  }
  if (conditionType === "all") {
    return db
      .prepare(`SELECT * FROM products WHERE status='active' ORDER BY sold_count DESC LIMIT 60`)
      .all() as Row[];
  }
  return db
    .prepare(
      `SELECT p.* FROM products p
       JOIN sale_collection_products scp ON p.id=scp.product_id
       WHERE scp.collection_id=? AND p.status='active'
       ORDER BY scp.sort_order ASC`
    )
    .all(id) as Row[];
}

function withVariants(rows: Row[]) {
  const getVars = db.prepare(`SELECT * FROM variants WHERE product_id=?`);
  return parseRows(rows).map((p) => ({
    ...p,
    variants: parseRows(getVars.all(p["id"] as string) as Row[]),
  }));
}

// ─── Store ───────────────────────────────────────────────────────────────────

router.get("/store/sale-collections", (_req, res) => {
  const rows = db
    .prepare(`SELECT * FROM sale_collections WHERE active=1 ORDER BY sort_order ASC`)
    .all() as Row[];
  res.json({ data: rows.map(parseCol), meta: {}, error: null });
});

router.get("/store/sale-collections/:id/products", (req, res) => {
  const col = db
    .prepare(`SELECT * FROM sale_collections WHERE id=?`)
    .get(req.params["id"]) as Row | undefined;
  if (!col) {
    res.status(404).json({ data: null, meta: {}, error: "Not found" });
    return;
  }
  const products = getProducts(
    col["id"] as string,
    col["condition_type"] as string,
    col["condition_value"] as string
  );
  res.json({ data: withVariants(products), meta: {}, error: null });
});

// ─── Admin ───────────────────────────────────────────────────────────────────

router.use("/admin/sale-collections", requireAdmin);

router.get("/admin/sale-collections", (_req, res) => {
  const rows = db
    .prepare(`SELECT * FROM sale_collections ORDER BY sort_order ASC`)
    .all() as Row[];
  const data = rows.map((col) => {
    const { c } = db
      .prepare(
        `SELECT COUNT(*) AS c FROM sale_collection_products WHERE collection_id=?`
      )
      .get(col["id"]) as { c: number };
    return { ...parseCol(col), productCount: c };
  });
  res.json({ data, meta: {}, error: null });
});

router.post("/admin/sale-collections", (req, res) => {
  const { title, titleAr, description, descriptionAr, image, conditionType, conditionValue } =
    req.body as Record<string, string>;
  const id = `sc_${Date.now()}`;
  const { m } = db
    .prepare(`SELECT COALESCE(MAX(sort_order),0) AS m FROM sale_collections`)
    .get() as { m: number };
  db.prepare(
    `INSERT INTO sale_collections
     (id,title,title_ar,description,description_ar,image,sort_order,active,condition_type,condition_value,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,1,?,?,?,?)`
  ).run(
    id,
    title || "New Collection",
    titleAr || "",
    description || "",
    descriptionAr || "",
    image || "",
    m + 1,
    conditionType || "manual",
    conditionValue || "",
    now(),
    now()
  );
  const row = db.prepare(`SELECT * FROM sale_collections WHERE id=?`).get(id) as Row;
  res.json({ data: { ...parseCol(row), productCount: 0 }, meta: {}, error: null });
});

router.put("/admin/sale-collections/:id", (req, res) => {
  const existing = db
    .prepare(`SELECT * FROM sale_collections WHERE id=?`)
    .get(req.params["id"]) as Row | undefined;
  if (!existing) {
    res.status(404).json({ data: null, meta: {}, error: "Not found" });
    return;
  }
  const {
    title, titleAr, description, descriptionAr, image,
    active, conditionType, conditionValue, sortOrder,
  } = req.body as Record<string, string | number | boolean>;

  db.prepare(
    `UPDATE sale_collections SET
     title=?,title_ar=?,description=?,description_ar=?,image=?,active=?,
     condition_type=?,condition_value=?,sort_order=?,updated_at=?
     WHERE id=?`
  ).run(
    title          ?? existing["title"],
    titleAr        ?? existing["title_ar"],
    description    ?? existing["description"],
    descriptionAr  ?? existing["description_ar"],
    image          ?? existing["image"],
    active !== undefined ? (active ? 1 : 0) : existing["active"],
    conditionType  ?? existing["condition_type"],
    conditionValue ?? existing["condition_value"],
    sortOrder      ?? existing["sort_order"],
    now(),
    req.params["id"]
  );
  const row = db.prepare(`SELECT * FROM sale_collections WHERE id=?`).get(req.params["id"]) as Row;
  const { c } = db
    .prepare(`SELECT COUNT(*) AS c FROM sale_collection_products WHERE collection_id=?`)
    .get(req.params["id"]) as { c: number };
  res.json({ data: { ...parseCol(row), productCount: c }, meta: {}, error: null });
});

router.delete("/admin/sale-collections/:id", (req, res) => {
  db.prepare(`DELETE FROM sale_collection_products WHERE collection_id=?`).run(req.params["id"]);
  db.prepare(`DELETE FROM sale_collections WHERE id=?`).run(req.params["id"]);
  res.json({ data: null, meta: {}, error: null });
});

router.put("/admin/sale-collections/reorder", (req, res) => {
  const { ids } = req.body as { ids: string[] };
  const update = db.prepare(`UPDATE sale_collections SET sort_order=?,updated_at=? WHERE id=?`);
  ids.forEach((id, i) => update.run(i, now(), id));
  res.json({ data: null, meta: {}, error: null });
});

router.get("/admin/sale-collections/:id/products", (req, res) => {
  const col = db
    .prepare(`SELECT * FROM sale_collections WHERE id=?`)
    .get(req.params["id"]) as Row | undefined;
  if (!col) {
    res.status(404).json({ data: null, meta: {}, error: "Not found" });
    return;
  }
  const products = getProducts(
    col["id"] as string,
    col["condition_type"] as string,
    col["condition_value"] as string
  );
  res.json({ data: withVariants(products), meta: {}, error: null });
});

router.post("/admin/sale-collections/:id/products", (req, res) => {
  const { productId } = req.body as { productId: string };
  const { m } = db
    .prepare(
      `SELECT COALESCE(MAX(sort_order),0) AS m FROM sale_collection_products WHERE collection_id=?`
    )
    .get(req.params["id"]) as { m: number };
  try {
    db.prepare(
      `INSERT INTO sale_collection_products (collection_id,product_id,sort_order) VALUES (?,?,?)`
    ).run(req.params["id"], productId, m + 1);
  } catch {
    /* already exists */
  }
  res.json({ data: null, meta: {}, error: null });
});

router.delete("/admin/sale-collections/:id/products/:productId", (req, res) => {
  db.prepare(
    `DELETE FROM sale_collection_products WHERE collection_id=? AND product_id=?`
  ).run(req.params["id"], req.params["productId"]);
  res.json({ data: null, meta: {}, error: null });
});

export default router;
