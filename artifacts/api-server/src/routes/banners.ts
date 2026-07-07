import { Router } from "express";
import db, { parseRows, parseOne } from "../lib/db.js";
import { requireAdmin } from "../middlewares/auth.js";
import type { Row } from "../lib/types.js";

const router = Router();

router.get("/store/banners", (_req, res) => {
  const rows = db.prepare(`SELECT * FROM banners WHERE status='active' ORDER BY sort_order ASC`).all() as Row[];
  res.json({ data: parseRows(rows), meta: {}, error: null });
});

router.use("/admin/banners", requireAdmin);

router.get("/admin/banners", (_req, res) => {
  const rows = db.prepare(`SELECT * FROM banners ORDER BY sort_order ASC`).all() as Row[];
  res.json({ data: parseRows(rows), meta: { total: rows.length }, error: null });
});

router.post("/admin/banners", (req, res) => {
  const b = req.body as Record<string, unknown>;
  const id = `ban_${Date.now()}`;
  const count = ((db.prepare(`SELECT COUNT(*) as n FROM banners`).get() as Row)["n"] as number) ?? 0;
  db.prepare(`INSERT INTO banners (id,title,subtitle,image_url,video_url,bg_color,link_url,has_button,button_text,button_align,sort_order,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, b["title"] ?? "", b["subtitle"] ?? "", b["imageUrl"] ?? "", b["videoUrl"] ?? "", b["bgColor"] ?? "#0274C1", b["linkUrl"] ?? "", b["hasButton"] !== false ? 1 : 0, b["buttonText"] ?? "SHOP NOW", b["buttonAlign"] ?? "left", count, b["status"] ?? "active", new Date().toISOString());
  res.status(201).json({ data: parseOne(db.prepare(`SELECT * FROM banners WHERE id=?`).get(id) as Row | undefined), meta: {}, error: null });
});

router.put("/admin/banners/:id", (req, res) => {
  const { id } = req.params as { id: string };
  const b = req.body as Record<string, unknown>;
  db.prepare(`UPDATE banners SET title=?,subtitle=?,image_url=?,video_url=?,bg_color=?,link_url=?,has_button=?,button_text=?,button_align=?,sort_order=?,status=?,updated_at=? WHERE id=?`)
    .run(b["title"] ?? "", b["subtitle"] ?? "", b["imageUrl"] ?? "", b["videoUrl"] ?? "", b["bgColor"] ?? "#0274C1", b["linkUrl"] ?? "", b["hasButton"] !== false ? 1 : 0, b["buttonText"] ?? "SHOP NOW", b["buttonAlign"] ?? "left", b["sortOrder"] ?? 0, b["status"] ?? "active", new Date().toISOString(), id);
  res.json({ data: parseOne(db.prepare(`SELECT * FROM banners WHERE id=?`).get(id) as Row | undefined), meta: {}, error: null });
});

router.delete("/admin/banners/:id", (req, res) => {
  db.prepare(`DELETE FROM banners WHERE id=?`).run((req.params as { id: string }).id);
  res.json({ data: null, meta: {}, error: null });
});

export default router;
