import { Router } from "express";
import { db } from "../lib/db.js";

const router = Router();
const now = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 10);

// ─── Store: get all active rows with active items ──────────────────────────
router.get("/store/stories", (_req, res) => {
  const rows = db.prepare(
    `SELECT id, title, sort_order FROM story_rows WHERE status='active' ORDER BY sort_order ASC`
  ).all() as { id: string; title: string; sort_order: number }[];

  const getItems = db.prepare(
    `SELECT id, title, image_url, link_url, sort_order FROM story_items
     WHERE row_id=? AND status='active' ORDER BY sort_order ASC`
  );

  const result = rows.map((row) => ({
    id: row.id,
    title: row.title,
    sortOrder: row.sort_order,
    items: (getItems.all(row.id) as { id: string; title: string; image_url: string; link_url: string; sort_order: number }[]).map((item) => ({
      id: item.id,
      title: item.title,
      imageUrl: item.image_url,
      linkUrl: item.link_url,
      sortOrder: item.sort_order,
    })),
  }));

  res.json({ data: result, meta: {}, error: null });
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
    title: row.title,
    sortOrder: row.sort_order,
    status: row.status,
    createdAt: row.created_at,
    items: (getItems.all(row.id) as { id: string; row_id: string; title: string; image_url: string; link_url: string; sort_order: number; status: string; created_at: string }[]).map((item) => ({
      id: item.id,
      rowId: item.row_id,
      title: item.title,
      imageUrl: item.image_url,
      linkUrl: item.link_url,
      sortOrder: item.sort_order,
      status: item.status,
      createdAt: item.created_at,
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
  const { title, status, sortOrder } = req.body as { title?: string; status?: string; sortOrder?: number };
  const row = db.prepare(`SELECT id FROM story_rows WHERE id=?`).get(req.params.id);
  if (!row) return res.status(404).json({ data: null, meta: {}, error: "Not found" });
  if (title !== undefined) db.prepare(`UPDATE story_rows SET title=? WHERE id=?`).run(title, req.params.id);
  if (status !== undefined) db.prepare(`UPDATE story_rows SET status=? WHERE id=?`).run(status, req.params.id);
  if (sortOrder !== undefined) db.prepare(`UPDATE story_rows SET sort_order=? WHERE id=?`).run(sortOrder, req.params.id);
  const updated = db.prepare(`SELECT * FROM story_rows WHERE id=?`).get(req.params.id);
  res.json({ data: updated, meta: {}, error: null });
});

// ─── Admin: delete row ─────────────────────────────────────────────────────
router.delete("/admin/story-rows/:id", (req, res) => {
  db.prepare(`DELETE FROM story_rows WHERE id=?`).run(req.params.id);
  res.json({ data: { deleted: true }, meta: {}, error: null });
});

// ─── Admin: create item ────────────────────────────────────────────────────
router.post("/admin/story-items", (req, res) => {
  const { rowId, title = "", imageUrl = "", linkUrl = "", status = "active" } = req.body as { rowId?: string; title?: string; imageUrl?: string; linkUrl?: string; status?: string };
  if (!rowId) return res.status(400).json({ data: null, meta: {}, error: "rowId required" });
  const maxOrder = (db.prepare(`SELECT COALESCE(MAX(sort_order),0) as m FROM story_items WHERE row_id=?`).get(rowId) as { m: number }).m;
  const id = `si_${uid()}`;
  db.prepare(
    `INSERT INTO story_items (id, row_id, title, image_url, link_url, sort_order, status, created_at) VALUES (?,?,?,?,?,?,?,?)`
  ).run(id, rowId, title, imageUrl, linkUrl, maxOrder + 1, status, now());
  const item = db.prepare(`SELECT * FROM story_items WHERE id=?`).get(id) as { id: string; row_id: string; title: string; image_url: string; link_url: string; sort_order: number; status: string; created_at: string };
  res.status(201).json({
    data: { id: item.id, rowId: item.row_id, title: item.title, imageUrl: item.image_url, linkUrl: item.link_url, sortOrder: item.sort_order, status: item.status, createdAt: item.created_at },
    meta: {}, error: null,
  });
});

// ─── Admin: update item ────────────────────────────────────────────────────
router.put("/admin/story-items/:id", (req, res) => {
  const { title, imageUrl, linkUrl, status, rowId, sortOrder } = req.body as { title?: string; imageUrl?: string; linkUrl?: string; status?: string; rowId?: string; sortOrder?: number };
  const item = db.prepare(`SELECT id FROM story_items WHERE id=?`).get(req.params.id);
  if (!item) return res.status(404).json({ data: null, meta: {}, error: "Not found" });
  if (title !== undefined) db.prepare(`UPDATE story_items SET title=? WHERE id=?`).run(title, req.params.id);
  if (imageUrl !== undefined) db.prepare(`UPDATE story_items SET image_url=? WHERE id=?`).run(imageUrl, req.params.id);
  if (linkUrl !== undefined) db.prepare(`UPDATE story_items SET link_url=? WHERE id=?`).run(linkUrl, req.params.id);
  if (status !== undefined) db.prepare(`UPDATE story_items SET status=? WHERE id=?`).run(status, req.params.id);
  if (rowId !== undefined) db.prepare(`UPDATE story_items SET row_id=? WHERE id=?`).run(rowId, req.params.id);
  if (sortOrder !== undefined) db.prepare(`UPDATE story_items SET sort_order=? WHERE id=?`).run(sortOrder, req.params.id);
  const updated = db.prepare(`SELECT * FROM story_items WHERE id=?`).get(req.params.id) as { id: string; row_id: string; title: string; image_url: string; link_url: string; sort_order: number; status: string; created_at: string };
  res.json({
    data: { id: updated.id, rowId: updated.row_id, title: updated.title, imageUrl: updated.image_url, linkUrl: updated.link_url, sortOrder: updated.sort_order, status: updated.status, createdAt: updated.created_at },
    meta: {}, error: null,
  });
});

// ─── Admin: delete item ────────────────────────────────────────────────────
router.delete("/admin/story-items/:id", (req, res) => {
  db.prepare(`DELETE FROM story_items WHERE id=?`).run(req.params.id);
  res.json({ data: { deleted: true }, meta: {}, error: null });
});

export default router;
