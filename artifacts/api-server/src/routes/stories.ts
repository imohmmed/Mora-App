import { Router } from "express";
import db, { parseRows } from "../lib/db.js";
import { requireAdmin } from "../middlewares/auth.js";
import type { Row } from "../lib/types.js";

const router = Router();
const now = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 10);

router.use(["/admin/story-rows", "/admin/story-items"], requireAdmin);

// ─── Store: get all active rows with active items ──────────────────────────
router.get("/store/stories", (_req, res) => {
  const rows = db.prepare(
    `SELECT id, title, title_ar, sort_order FROM story_rows WHERE status='active' ORDER BY sort_order ASC`
  ).all() as { id: string; title: string; title_ar: string; sort_order: number }[];

  const getItems = db.prepare(
    `SELECT id, title, title_ar, image_url, link_url, sort_order, gender, collection_id FROM story_items
     WHERE row_id=? AND status='active' ORDER BY sort_order ASC`
  );

  const result = rows.map((row) => ({
    id: row.id,
    title: row.title,
    titleAr: row.title_ar ?? "",
    sortOrder: row.sort_order,
    items: (getItems.all(row.id) as { id: string; title: string; title_ar: string; image_url: string; link_url: string; sort_order: number; gender: string; collection_id: string | null }[]).map((item) => ({
      id: item.id,
      title: item.title,
      titleAr: item.title_ar ?? "",
      imageUrl: item.image_url,
      linkUrl: item.link_url,
      sortOrder: item.sort_order,
      gender: item.gender ?? "all",
      collectionId: item.collection_id ?? null,
    })),
  }));

  res.json({ data: result, meta: {}, error: null });
});

// ─── Store: products by collection IDs (filtered by gender) ───────────────
router.get("/store/collection-products", (req, res) => {
  const { ids = "", gender = "", limit = "10" } = req.query as Record<string, string>;
  const collectionIds = ids.split(",").map(s => s.trim()).filter(Boolean);
  if (collectionIds.length === 0) {
    return res.json({ data: [], meta: { total: 0 }, error: null });
  }

  const limitNum = Math.min(20, Math.max(1, parseInt(limit) || 10));
  const placeholders = collectionIds.map(() => "?").join(",");

  let sql = `SELECT DISTINCT p.* FROM products p
    JOIN product_collections pc ON pc.product_id = p.id
    WHERE pc.collection_id IN (${placeholders})
      AND p.status = 'active'`;
  const params: unknown[] = [...collectionIds];

  if (gender === "women") {
    sql += ` AND (p.gender = 'women' OR p.gender = 'all')`;
  } else if (gender === "men") {
    sql += ` AND (p.gender = 'men' OR p.gender = 'all')`;
  }

  sql += ` ORDER BY p.created_at DESC LIMIT ?`;
  params.push(limitNum);

  const rows = db.prepare(sql).all(...params) as Row[];
  const getVariants = db.prepare(`SELECT * FROM variants WHERE product_id=?`);
  const products = parseRows(rows).map((p) => ({
    ...p,
    variants: parseRows(getVariants.all(p["id"] as string) as Row[]),
  }));

  res.json({ data: products, meta: { total: products.length }, error: null });
});

// ─── Store: sibling story items (same row) for a given collection ─────────
router.get("/store/story-siblings/:collectionId", (req, res) => {
  const { collectionId } = req.params;
  const item = db.prepare(
    `SELECT id, row_id FROM story_items WHERE collection_id=? AND status='active'`
  ).get(collectionId) as { id: string; row_id: string } | undefined;

  if (!item) return res.json({ data: [], meta: {}, error: null });

  const siblings = db.prepare(
    `SELECT id, title, title_ar, image_url, collection_id FROM story_items
     WHERE row_id=? AND status='active' AND id != ? ORDER BY sort_order ASC`
  ).all(item.row_id, item.id) as { id: string; title: string; title_ar: string; image_url: string; collection_id: string | null }[];

  res.json({
    data: siblings.map((s) => ({
      id: s.id,
      title: s.title,
      titleAr: s.title_ar ?? "",
      imageUrl: s.image_url,
      collectionId: s.collection_id,
    })),
    meta: {},
    error: null,
  });
});

// ─── Admin: list rows with items ───────────────────────────────────────────
router.get("/admin/story-rows", (_req, res) => {
  const rows = db.prepare(
    `SELECT * FROM story_rows ORDER BY sort_order ASC`
  ).all() as { id: string; title: string; sort_order: number; status: string; created_at: string }[];

  const getItems = db.prepare(
    `SELECT * FROM story_items WHERE row_id=? ORDER BY sort_order ASC`
  );

  const result = rows.map((row) => ({
    id: row.id,
    title: (row as any).title,
    titleAr: (row as any).title_ar ?? "",
    descriptionEn: (row as any).description_en ?? "",
    descriptionAr: (row as any).description_ar ?? "",
    backgroundImage: (row as any).background_image ?? "",
    image: (row as any).image ?? "",
    conditionType: (row as any).condition_type ?? "manual",
    conditionValue: (row as any).condition_value ?? "",
    sortOrder: (row as any).sort_order,
    status: (row as any).status,
    createdAt: (row as any).created_at,
    items: (getItems.all(row.id) as { id: string; row_id: string; title: string; title_ar: string; image_url: string; link_url: string; sort_order: number; status: string; created_at: string; gender: string; collection_id: string | null }[]).map((item) => ({
      id: item.id,
      rowId: item.row_id,
      title: item.title,
      titleAr: item.title_ar ?? "",
      imageUrl: item.image_url,
      linkUrl: item.link_url,
      sortOrder: item.sort_order,
      status: item.status,
      createdAt: item.created_at,
      gender: item.gender ?? "all",
      collectionId: item.collection_id ?? null,
    })),
  }));

  res.json({ data: result, meta: {}, error: null });
});

// ─── Admin: create row ─────────────────────────────────────────────────────
router.post("/admin/story-rows", (req, res) => {
  const { title = "", status = "active" } = req.body as { title?: string; status?: string };
  const maxOrder = (db.prepare(`SELECT COALESCE(MAX(sort_order),0) as m FROM story_rows`).get() as { m: number }).m;
  const id = `sr_${uid()}`;
  db.prepare(
    `INSERT INTO story_rows (id, title, sort_order, status, created_at) VALUES (?,?,?,?,?)`
  ).run(id, title, maxOrder + 1, status, now());
  const row = db.prepare(`SELECT * FROM story_rows WHERE id=?`).get(id) as { id: string; title: string; sort_order: number; status: string; created_at: string };
  res.status(201).json({ data: { ...row, items: [] }, meta: {}, error: null });
});

// ─── Admin: update row ─────────────────────────────────────────────────────
router.put("/admin/story-rows/:id", (req, res) => {
  const { title, titleAr, status, sortOrder, descriptionEn, descriptionAr, backgroundImage, image, conditionType, conditionValue } =
    req.body as { title?: string; titleAr?: string; status?: string; sortOrder?: number; descriptionEn?: string; descriptionAr?: string; backgroundImage?: string; image?: string; conditionType?: string; conditionValue?: string };
  const row = db.prepare(`SELECT id FROM story_rows WHERE id=?`).get(req.params.id);
  if (!row) return res.status(404).json({ data: null, meta: {}, error: "Not found" });
  if (title !== undefined)           db.prepare(`UPDATE story_rows SET title=? WHERE id=?`).run(title, req.params.id);
  if (titleAr !== undefined)         db.prepare(`UPDATE story_rows SET title_ar=? WHERE id=?`).run(titleAr, req.params.id);
  if (status !== undefined)          db.prepare(`UPDATE story_rows SET status=? WHERE id=?`).run(status, req.params.id);
  if (sortOrder !== undefined)       db.prepare(`UPDATE story_rows SET sort_order=? WHERE id=?`).run(sortOrder, req.params.id);
  if (descriptionEn !== undefined)   db.prepare(`UPDATE story_rows SET description_en=? WHERE id=?`).run(descriptionEn, req.params.id);
  if (descriptionAr !== undefined)   db.prepare(`UPDATE story_rows SET description_ar=? WHERE id=?`).run(descriptionAr, req.params.id);
  if (backgroundImage !== undefined) db.prepare(`UPDATE story_rows SET background_image=? WHERE id=?`).run(backgroundImage, req.params.id);
  if (image !== undefined)           db.prepare(`UPDATE story_rows SET image=? WHERE id=?`).run(image, req.params.id);
  if (conditionType !== undefined)   db.prepare(`UPDATE story_rows SET condition_type=? WHERE id=?`).run(conditionType, req.params.id);
  if (conditionValue !== undefined)  db.prepare(`UPDATE story_rows SET condition_value=? WHERE id=?`).run(conditionValue, req.params.id);
  const updated = db.prepare(`SELECT * FROM story_rows WHERE id=?`).get(req.params.id);
  return res.json({ data: updated, meta: {}, error: null });
});

// ─── Admin: delete row ─────────────────────────────────────────────────────
router.delete("/admin/story-rows/:id", (req, res) => {
  db.prepare(`DELETE FROM story_rows WHERE id=?`).run(req.params.id);
  res.json({ data: { deleted: true }, meta: {}, error: null });
});

// ─── Admin: create item ────────────────────────────────────────────────────
router.post("/admin/story-items", (req, res) => {
  const { rowId, title = "", titleAr = "", imageUrl = "", linkUrl = "", status = "active", gender = "all" } = req.body as { rowId?: string; title?: string; titleAr?: string; imageUrl?: string; linkUrl?: string; status?: string; gender?: string };
  if (!rowId) return res.status(400).json({ data: null, meta: {}, error: "rowId required" });

  const maxOrder = (db.prepare(`SELECT COALESCE(MAX(sort_order),0) as m FROM story_items WHERE row_id=?`).get(rowId) as { m: number }).m;
  const id = `si_${uid()}`;

  // Auto-create a collection for this story item
  const colId = `col_${Date.now()}`;
  db.prepare(
    `INSERT INTO collections (id,title,title_ar,description,image,background_image,collection_type,conditions,conditions_match,products_count,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  ).run(colId, title || titleAr || "Story", titleAr || title || "Story", "", "", "", "story", "[]", "all", 0, now());

  db.prepare(
    `INSERT INTO story_items (id, row_id, title, title_ar, image_url, link_url, sort_order, status, created_at, gender, collection_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  ).run(id, rowId, title, titleAr, imageUrl, linkUrl, maxOrder + 1, status, now(), gender, colId);

  const item = db.prepare(`SELECT * FROM story_items WHERE id=?`).get(id) as { id: string; row_id: string; title: string; title_ar: string; image_url: string; link_url: string; sort_order: number; status: string; created_at: string; gender: string; collection_id: string | null };
  return res.status(201).json({
    data: { id: item.id, rowId: item.row_id, title: item.title, titleAr: item.title_ar ?? "", imageUrl: item.image_url, linkUrl: item.link_url, sortOrder: item.sort_order, status: item.status, createdAt: item.created_at, gender: item.gender ?? "all", collectionId: item.collection_id ?? null },
    meta: {}, error: null,
  });
});

// ─── Admin: update item ────────────────────────────────────────────────────
router.put("/admin/story-items/:id", (req, res) => {
  const { title, titleAr, imageUrl, linkUrl, status, rowId, sortOrder, gender, collectionId } = req.body as { title?: string; titleAr?: string; imageUrl?: string; linkUrl?: string; status?: string; rowId?: string; sortOrder?: number; gender?: string; collectionId?: string | null };
  const existing = db.prepare(`SELECT * FROM story_items WHERE id=?`).get(req.params.id) as { id: string; collection_id: string | null } | undefined;
  if (!existing) return res.status(404).json({ data: null, meta: {}, error: "Not found" });

  // Ensure this item has a linked collection — create one if missing
  let linkedColId = existing.collection_id;
  if (!linkedColId) {
    linkedColId = `col_${Date.now()}`;
    const fallbackTitle = title ?? (db.prepare(`SELECT title, title_ar FROM story_items WHERE id=?`).get(req.params.id) as { title: string; title_ar: string } | undefined)?.title ?? "Story";
    const fallbackAr   = titleAr ?? (db.prepare(`SELECT title_ar FROM story_items WHERE id=?`).get(req.params.id) as { title_ar: string } | undefined)?.title_ar ?? fallbackTitle;
    db.prepare(
      `INSERT INTO collections (id,title,title_ar,description,image,background_image,collection_type,conditions,conditions_match,products_count,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    ).run(linkedColId, fallbackTitle, fallbackAr, "", "", "", "story", "[]", "all", 0, now());
    db.prepare(`UPDATE story_items SET collection_id=? WHERE id=?`).run(linkedColId, req.params.id);
  }

  if (title !== undefined) db.prepare(`UPDATE story_items SET title=? WHERE id=?`).run(title, req.params.id);
  if (titleAr !== undefined) db.prepare(`UPDATE story_items SET title_ar=? WHERE id=?`).run(titleAr, req.params.id);
  if (imageUrl !== undefined) db.prepare(`UPDATE story_items SET image_url=? WHERE id=?`).run(imageUrl, req.params.id);
  if (linkUrl !== undefined) db.prepare(`UPDATE story_items SET link_url=? WHERE id=?`).run(linkUrl, req.params.id);
  if (status !== undefined) db.prepare(`UPDATE story_items SET status=? WHERE id=?`).run(status, req.params.id);
  if (rowId !== undefined) db.prepare(`UPDATE story_items SET row_id=? WHERE id=?`).run(rowId, req.params.id);
  if (sortOrder !== undefined) db.prepare(`UPDATE story_items SET sort_order=? WHERE id=?`).run(sortOrder, req.params.id);
  if (gender !== undefined) db.prepare(`UPDATE story_items SET gender=? WHERE id=?`).run(gender, req.params.id);
  if (collectionId !== undefined) db.prepare(`UPDATE story_items SET collection_id=? WHERE id=?`).run(collectionId, req.params.id);

  // Sync collection title to match story item title
  const finalColId = collectionId ?? linkedColId;
  if (finalColId && (title !== undefined || titleAr !== undefined)) {
    db.prepare(`UPDATE collections SET title=COALESCE(?,title), title_ar=COALESCE(?,title_ar) WHERE id=?`)
      .run(title ?? null, titleAr ?? null, finalColId);
  }

  const updated = db.prepare(`SELECT * FROM story_items WHERE id=?`).get(req.params.id) as { id: string; row_id: string; title: string; title_ar: string; image_url: string; link_url: string; sort_order: number; status: string; created_at: string; gender: string; collection_id: string | null };
  return res.json({
    data: { id: updated.id, rowId: updated.row_id, title: updated.title, titleAr: updated.title_ar ?? "", imageUrl: updated.image_url, linkUrl: updated.link_url, sortOrder: updated.sort_order, status: updated.status, createdAt: updated.created_at, gender: updated.gender ?? "all", collectionId: updated.collection_id ?? null },
    meta: {}, error: null,
  });
});

// ─── Admin: delete item ────────────────────────────────────────────────────
router.delete("/admin/story-items/:id", (req, res) => {
  // Delete the auto-linked story collection if it exists
  const item = db.prepare(`SELECT collection_id FROM story_items WHERE id=?`).get(req.params.id) as { collection_id: string | null } | undefined;
  if (item?.collection_id) {
    db.prepare(`DELETE FROM collections WHERE id=? AND collection_type='story'`).run(item.collection_id);
  }
  db.prepare(`DELETE FROM story_items WHERE id=?`).run(req.params.id);
  res.json({ data: { deleted: true }, meta: {}, error: null });
});

export default router;
