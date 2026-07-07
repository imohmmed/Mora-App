import { Router } from "express";
import db, { parseRows } from "../lib/db.js";
import { requireAdmin } from "../middlewares/auth.js";
import type { Row } from "../lib/types.js";

const router = Router();

function getIndex(): string[] {
  const row = db.prepare(`SELECT items FROM content_sections WHERE key='browse_col_index' LIMIT 1`).get() as { items: string } | undefined;
  if (!row) return [];
  try { return JSON.parse(row.items) as string[]; } catch { return []; }
}

function saveIndex(slugs: string[]) {
  const exists = db.prepare(`SELECT id FROM content_sections WHERE key='browse_col_index' LIMIT 1`).get();
  if (exists) {
    db.prepare(`UPDATE content_sections SET items=?, updated_at=? WHERE key='browse_col_index'`)
      .run(JSON.stringify(slugs), new Date().toISOString());
  } else {
    db.prepare(`INSERT INTO content_sections (id,key,title,items,sort_order,status,updated_at) VALUES (?,?,?,?,?,?,?)`)
      .run("browse_col_index", "browse_col_index", "Browse Collection Index", JSON.stringify(slugs), 0, "active", new Date().toISOString());
  }
}

export function getBrowseColMeta(slug: string): Record<string, string> | null {
  const key = `browse_col_meta_${slug}`;
  const row = db.prepare(`SELECT items FROM content_sections WHERE key=? LIMIT 1`).get(key) as { items: string } | undefined;
  if (!row) return null;
  try { return JSON.parse(row.items) as Record<string, string>; } catch { return null; }
}

function saveMeta(slug: string, meta: Record<string, string>) {
  const key = `browse_col_meta_${slug}`;
  const exists = db.prepare(`SELECT id FROM content_sections WHERE key=? LIMIT 1`).get(key);
  if (exists) {
    db.prepare(`UPDATE content_sections SET items=?, updated_at=? WHERE key=?`)
      .run(JSON.stringify(meta), new Date().toISOString(), key);
  } else {
    db.prepare(`INSERT INTO content_sections (id,key,title,items,sort_order,status,updated_at) VALUES (?,?,?,?,?,?,?)`)
      .run(`cs_bc_${slug}`, key, `Browse: ${slug}`, JSON.stringify(meta), 0, "active", new Date().toISOString());
  }
}

function getProducts(slug: string): Row[] {
  return db.prepare(`
    SELECT p.*, sci.sort_order FROM products p
    JOIN special_collection_items sci ON p.id = sci.product_id
    WHERE sci.collection_slug = ? AND p.status = 'active'
    ORDER BY sci.sort_order ASC
  `).all(slug) as Row[];
}

function withVariants(products: ReturnType<typeof parseRows>) {
  const getVars = db.prepare(`SELECT * FROM variants WHERE product_id=?`);
  return products.map((p) => ({
    ...p,
    variants: parseRows(getVars.all(p["id"] as string) as Row[]),
  }));
}

// ── Store: list all browse collections ─────────────────────────────────────
router.get("/store/browse-collections", (_req, res) => {
  const slugs = getIndex();
  const result = slugs
    .map((slug) => {
      const meta = getBrowseColMeta(slug);
      if (!meta) return null;
      return { slug, titleEn: meta["titleEn"] || slug, titleAr: meta["titleAr"] || "", image: meta["image"] || "" };
    })
    .filter(Boolean);
  res.json({ data: result, meta: {}, error: null });
});

// ── Store: single browse collection (used by collection page via fetchSpecialCollection) ──
router.get("/store/browse-collections/:slug", (req, res) => {
  const { slug } = req.params as { slug: string };
  const meta = getBrowseColMeta(slug);
  if (!meta) { res.status(404).json({ data: null, meta: {}, error: "Collection not found" }); return; }
  const { limit = "20", page = "1" } = req.query as Record<string, string>;
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const pageNum = Math.max(1, parseInt(page));
  const offset = (pageNum - 1) * limitNum;
  const all = getProducts(slug);
  const sliced = withVariants(parseRows(all.slice(offset, offset + limitNum)));
  res.json({
    data: { slug, title: meta["titleEn"] || slug, titleAr: meta["titleAr"] || "", heroImage: meta["image"] || "", accentColor: "#0274C1", products: sliced },
    meta: { total: all.length, page: pageNum, limit: limitNum, pages: Math.ceil(all.length / limitNum) },
    error: null,
  });
});

// ── Admin ───────────────────────────────────────────────────────────────────
router.use("/admin/browse-collections", requireAdmin);

router.get("/admin/browse-collections", (_req, res) => {
  const slugs = getIndex();
  const result = slugs
    .map((slug) => {
      const meta = getBrowseColMeta(slug);
      if (!meta) return null;
      const count = ((db.prepare(`SELECT COUNT(*) as n FROM special_collection_items WHERE collection_slug=?`).get(slug) as Row)["n"] as number) ?? 0;
      return { slug, titleEn: meta["titleEn"] || "", titleAr: meta["titleAr"] || "", image: meta["image"] || "", productCount: count };
    })
    .filter(Boolean);
  res.json({ data: result, meta: {}, error: null });
});

router.post("/admin/browse-collections", (req, res) => {
  const { titleEn, titleAr } = req.body as Record<string, string>;
  const slug = `bc_${Date.now()}`;
  const meta = { titleEn: titleEn || "New Collection", titleAr: titleAr || "مجموعة جديدة", image: "", slug, createdAt: new Date().toISOString() };
  saveMeta(slug, meta);
  const slugs = getIndex();
  saveIndex([...slugs, slug]);
  res.status(201).json({ data: { slug, ...meta, productCount: 0 }, meta: {}, error: null });
});

router.put("/admin/browse-collections/:slug/meta", (req, res) => {
  const { slug } = req.params as { slug: string };
  const { titleEn, titleAr, image } = req.body as Record<string, string>;
  const existing = getBrowseColMeta(slug);
  if (!existing) { res.status(404).json({ data: null, meta: {}, error: "Not found" }); return; }
  if (titleEn !== undefined) existing["titleEn"] = titleEn;
  if (titleAr !== undefined) existing["titleAr"] = titleAr;
  if (image !== undefined) existing["image"] = image;
  saveMeta(slug, existing);
  res.json({ data: existing, meta: {}, error: null });
});

router.delete("/admin/browse-collections/:slug", (req, res) => {
  const { slug } = req.params as { slug: string };
  db.prepare(`DELETE FROM content_sections WHERE key=?`).run(`browse_col_meta_${slug}`);
  db.prepare(`DELETE FROM special_collection_items WHERE collection_slug=?`).run(slug);
  saveIndex(getIndex().filter((s) => s !== slug));
  res.json({ data: null, meta: {}, error: null });
});

router.get("/admin/browse-collections/:slug/products", (req, res) => {
  const { slug } = req.params as { slug: string };
  const rows = getProducts(slug);
  res.json({ data: parseRows(rows), meta: { total: rows.length }, error: null });
});

router.post("/admin/browse-collections/:slug/products", (req, res) => {
  const { slug } = req.params as { slug: string };
  const { productId } = req.body as { productId: string };
  const count = ((db.prepare(`SELECT COUNT(*) as n FROM special_collection_items WHERE collection_slug=?`).get(slug) as Row)["n"] as number) ?? 0;
  try {
    db.prepare(`INSERT INTO special_collection_items (collection_slug, product_id, sort_order, created_at) VALUES (?, ?, ?, ?)`)
      .run(slug, productId, count, new Date().toISOString());
    res.status(201).json({ data: { slug, productId }, meta: {}, error: null });
  } catch {
    res.status(409).json({ data: null, meta: {}, error: "Product already in collection" });
  }
});

router.delete("/admin/browse-collections/:slug/products/:productId", (req, res) => {
  const { slug, productId } = req.params as { slug: string; productId: string };
  db.prepare(`DELETE FROM special_collection_items WHERE collection_slug=? AND product_id=?`).run(slug, productId);
  res.json({ data: null, meta: {}, error: null });
});

export default router;
