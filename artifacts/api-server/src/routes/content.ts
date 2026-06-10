import { Router } from "express";
import { db } from "../lib/db.js";

const router = Router();
const now = () => new Date().toISOString();

// ─── Store: get all active content sections ───────────────────────────────
router.get("/store/content-sections", (_req, res) => {
  const rows = db.prepare(
    `SELECT * FROM content_sections WHERE status='active' ORDER BY sort_order ASC`
  ).all() as { id: string; key: string; title: string; items: string; sort_order: number }[];

  const result: Record<string, unknown> = {};
  for (const row of rows) {
    result[row.key] = {
      id: row.id,
      key: row.key,
      title: row.title,
      items: JSON.parse(row.items || "[]"),
      sortOrder: row.sort_order,
    };
  }
  res.json({ data: result, meta: {}, error: null });
});

// ─── Admin: list all sections ─────────────────────────────────────────────
router.get("/admin/content-sections", (_req, res) => {
  const rows = db.prepare(
    `SELECT * FROM content_sections ORDER BY sort_order ASC`
  ).all() as { id: string; key: string; title: string; items: string; sort_order: number; status: string; updated_at: string }[];

  const data = rows.map((r) => ({
    id: r.id,
    key: r.key,
    title: r.title,
    items: JSON.parse(r.items || "[]"),
    sortOrder: r.sort_order,
    status: r.status,
    updatedAt: r.updated_at,
  }));
  res.json({ data, meta: {}, error: null });
});

// ─── Admin: update section ────────────────────────────────────────────────
router.put("/admin/content-sections/:id", (req, res) => {
  const { id } = req.params;
  const { title, items, status } = req.body as {
    title?: string;
    items?: unknown[];
    status?: string;
  };

  const existing = db.prepare(`SELECT * FROM content_sections WHERE id=?`).get(id) as { id: string } | undefined;
  if (!existing) {
    res.status(404).json({ data: null, meta: {}, error: "Section not found" });
    return;
  }

  db.prepare(
    `UPDATE content_sections SET title=COALESCE(?,title), items=COALESCE(?,items), status=COALESCE(?,status), updated_at=? WHERE id=?`
  ).run(
    title ?? null,
    items !== undefined ? JSON.stringify(items) : null,
    status ?? null,
    now(),
    id
  );

  const updated = db.prepare(`SELECT * FROM content_sections WHERE id=?`).get(id) as { id: string; key: string; title: string; items: string; sort_order: number; status: string; updated_at: string };
  res.json({
    data: { ...updated, items: JSON.parse(updated.items || "[]") },
    meta: {},
    error: null,
  });
});

export default router;
