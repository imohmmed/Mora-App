import { Router } from "express";
import db, { parseRows, parseOne } from "../lib/db.js";
import { requireAdmin } from "../middlewares/auth.js";
import type { Row } from "../lib/types.js";

const router = Router();

router.use("/admin/campaigns", requireAdmin);
router.use("/admin/discounts", requireAdmin);
router.use("/admin/content", requireAdmin);

// ─── Campaigns ────────────────────────────────────────────────────────────────

router.get("/admin/campaigns", (_req, res) => {
  const rows = db.prepare(`SELECT * FROM campaigns ORDER BY created_at DESC`).all() as Row[];
  res.json({ data: parseRows(rows), meta: { total: rows.length }, error: null });
});

router.get("/admin/campaigns/:id", (req, res) => {
  const c = parseOne(db.prepare(`SELECT * FROM campaigns WHERE id=?`).get(req.params["id"]) as Row | undefined);
  if (!c) { res.status(404).json({ data: null, meta: {}, error: "Campaign not found" }); return; }
  res.json({ data: c, meta: {}, error: null });
});

router.post("/admin/campaigns", (req, res) => {
  const id = `camp_${Date.now()}`;
  const b = req.body as Record<string, unknown>;
  db.prepare(`INSERT INTO campaigns (id,title,type,status,budget,spent,impressions,clicks,conversions,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(id, b["title"] ?? "", b["type"] ?? "email", "active", b["budget"] ?? 0, 0, 0, 0, 0, new Date().toISOString());
  const c = parseOne(db.prepare(`SELECT * FROM campaigns WHERE id=?`).get(id) as Row | undefined);
  res.status(201).json({ data: c, meta: {}, error: null });
});

router.put("/admin/campaigns/:id", (req, res) => {
  const id = req.params["id"];
  if (!db.prepare(`SELECT id FROM campaigns WHERE id=?`).get(id)) { res.status(404).json({ data: null, meta: {}, error: "Campaign not found" }); return; }
  const b = req.body as Record<string, unknown>;
  db.prepare(`UPDATE campaigns SET title=COALESCE(?,title), status=COALESCE(?,status), budget=COALESCE(?,budget) WHERE id=?`).run(b["title"] ?? null, b["status"] ?? null, b["budget"] ?? null, id);
  const c = parseOne(db.prepare(`SELECT * FROM campaigns WHERE id=?`).get(id) as Row | undefined);
  res.json({ data: c, meta: {}, error: null });
});

router.delete("/admin/campaigns/:id", (req, res) => {
  db.prepare(`DELETE FROM campaigns WHERE id=?`).run(req.params["id"]);
  res.json({ data: { deleted: true }, meta: {}, error: null });
});

// ─── Discounts ────────────────────────────────────────────────────────────────

router.get("/admin/discounts", (_req, res) => {
  const rows = db.prepare(`SELECT * FROM discounts ORDER BY starts_at DESC`).all() as Row[];
  res.json({ data: parseRows(rows), meta: { total: rows.length }, error: null });
});

router.get("/admin/discounts/:id", (req, res) => {
  const d = parseOne(db.prepare(`SELECT * FROM discounts WHERE id=?`).get(req.params["id"]) as Row | undefined);
  if (!d) { res.status(404).json({ data: null, meta: {}, error: "Discount not found" }); return; }
  res.json({ data: d, meta: {}, error: null });
});

router.post("/admin/discounts", (req, res) => {
  const id = `disc_${Date.now()}`;
  const b = req.body as Record<string, unknown>;
  db.prepare(`INSERT INTO discounts (id,code,type,value,usage_count,usage_limit,starts_at,ends_at,status) VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(id, b["code"] ?? "", b["type"] ?? "percentage", b["value"] ?? 0, 0, b["usageLimit"] ?? null, new Date().toISOString(), b["endsAt"] ?? null, "active");
  const d = parseOne(db.prepare(`SELECT * FROM discounts WHERE id=?`).get(id) as Row | undefined);
  res.status(201).json({ data: d, meta: {}, error: null });
});

router.put("/admin/discounts/:id", (req, res) => {
  const id = req.params["id"];
  if (!db.prepare(`SELECT id FROM discounts WHERE id=?`).get(id)) { res.status(404).json({ data: null, meta: {}, error: "Discount not found" }); return; }
  const b = req.body as Record<string, unknown>;
  db.prepare(`UPDATE discounts SET code=COALESCE(?,code), value=COALESCE(?,value), status=COALESCE(?,status), ends_at=COALESCE(?,ends_at) WHERE id=?`).run(b["code"] ?? null, b["value"] ?? null, b["status"] ?? null, b["endsAt"] ?? null, id);
  const d = parseOne(db.prepare(`SELECT * FROM discounts WHERE id=?`).get(id) as Row | undefined);
  res.json({ data: d, meta: {}, error: null });
});

router.delete("/admin/discounts/:id", (req, res) => {
  db.prepare(`DELETE FROM discounts WHERE id=?`).run(req.params["id"]);
  res.json({ data: { deleted: true }, meta: {}, error: null });
});

// Public: validate discount code
router.post("/store/discounts/validate", (req, res) => {
  const { code } = req.body as { code: string };
  const disc = parseOne(db.prepare(`SELECT * FROM discounts WHERE upper(code)=upper(?) AND status='active'`).get(code ?? "") as Row | undefined);
  if (!disc) { res.status(404).json({ data: null, meta: {}, error: "Invalid or expired discount code" }); return; }
  res.json({ data: disc, meta: {}, error: null });
});

// ─── Content: Blog posts ──────────────────────────────────────────────────────

router.get("/admin/content/blog-posts", (_req, res) => {
  const rows = db.prepare(`SELECT * FROM blog_posts ORDER BY created_at DESC`).all() as Row[];
  res.json({ data: parseRows(rows), meta: { total: rows.length }, error: null });
});

router.get("/admin/content/blog-posts/:id", (req, res) => {
  const post = parseOne(db.prepare(`SELECT * FROM blog_posts WHERE id=?`).get(req.params["id"]) as Row | undefined);
  if (!post) { res.status(404).json({ data: null, meta: {}, error: "Post not found" }); return; }
  res.json({ data: post, meta: {}, error: null });
});

router.post("/admin/content/blog-posts", (req, res) => {
  const id = `post_${Date.now()}`;
  const b = req.body as Record<string, unknown>;
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO blog_posts (id,title,handle,author,body,excerpt,tags,status,published_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(id, b["title"] ?? "", b["handle"] ?? id, b["author"] ?? "Admin", b["body"] ?? "", b["excerpt"] ?? "", JSON.stringify(b["tags"] ?? []), b["status"] ?? "draft", b["publishedAt"] ?? null, now);
  const post = parseOne(db.prepare(`SELECT * FROM blog_posts WHERE id=?`).get(id) as Row | undefined);
  res.status(201).json({ data: post, meta: {}, error: null });
});

router.put("/admin/content/blog-posts/:id", (req, res) => {
  const id = req.params["id"];
  if (!db.prepare(`SELECT id FROM blog_posts WHERE id=?`).get(id)) { res.status(404).json({ data: null, meta: {}, error: "Post not found" }); return; }
  const b = req.body as Record<string, unknown>;
  db.prepare(`UPDATE blog_posts SET title=COALESCE(?,title), body=COALESCE(?,body), excerpt=COALESCE(?,excerpt), status=COALESCE(?,status), published_at=COALESCE(?,published_at) WHERE id=?`)
    .run(b["title"] ?? null, b["body"] ?? null, b["excerpt"] ?? null, b["status"] ?? null, b["publishedAt"] ?? null, id);
  const post = parseOne(db.prepare(`SELECT * FROM blog_posts WHERE id=?`).get(id) as Row | undefined);
  res.json({ data: post, meta: {}, error: null });
});

router.delete("/admin/content/blog-posts/:id", (req, res) => {
  db.prepare(`DELETE FROM blog_posts WHERE id=?`).run(req.params["id"]);
  res.json({ data: { deleted: true }, meta: {}, error: null });
});

// ─── Content: Menus (full CRUD) ───────────────────────────────────────────────

router.get("/admin/content/menus", (_req, res) => {
  const rows = db.prepare(`SELECT * FROM menus`).all() as Row[];
  res.json({ data: parseRows(rows), meta: { total: rows.length }, error: null });
});

router.get("/admin/content/menus/:id", (req, res) => {
  const menu = parseOne(db.prepare(`SELECT * FROM menus WHERE id=?`).get(req.params["id"]) as Row | undefined);
  if (!menu) { res.status(404).json({ data: null, meta: {}, error: "Menu not found" }); return; }
  res.json({ data: menu, meta: {}, error: null });
});

router.post("/admin/content/menus", (req, res) => {
  const id = `menu_${Date.now()}`;
  const b = req.body as Record<string, unknown>;
  db.prepare(`INSERT INTO menus (id,title,handle,items) VALUES (?,?,?,?)`)
    .run(id, b["title"] ?? "", b["handle"] ?? id, JSON.stringify(b["items"] ?? []));
  const menu = parseOne(db.prepare(`SELECT * FROM menus WHERE id=?`).get(id) as Row | undefined);
  res.status(201).json({ data: menu, meta: {}, error: null });
});

router.put("/admin/content/menus/:id", (req, res) => {
  const id = req.params["id"];
  if (!db.prepare(`SELECT id FROM menus WHERE id=?`).get(id)) { res.status(404).json({ data: null, meta: {}, error: "Menu not found" }); return; }
  const b = req.body as Record<string, unknown>;
  db.prepare(`UPDATE menus SET title=COALESCE(?,title), handle=COALESCE(?,handle), items=COALESCE(?,items) WHERE id=?`)
    .run(b["title"] ?? null, b["handle"] ?? null, b["items"] ? JSON.stringify(b["items"]) : null, id);
  const menu = parseOne(db.prepare(`SELECT * FROM menus WHERE id=?`).get(id) as Row | undefined);
  res.json({ data: menu, meta: {}, error: null });
});

router.delete("/admin/content/menus/:id", (req, res) => {
  db.prepare(`DELETE FROM menus WHERE id=?`).run(req.params["id"]);
  res.json({ data: { deleted: true }, meta: {}, error: null });
});

// ─── Content: Metaobjects & Files stubs ───────────────────────────────────────

router.get("/admin/content/metaobjects", (_req, res) => {
  res.json({ data: [
    { id: "meta1", type: "size_guide", fields: { title: "Women's Size Guide", content: "XS: 6-8, S: 8-10, M: 10-12, L: 12-14, XL: 14-16" } },
    { id: "meta2", type: "size_guide", fields: { title: "Men's Size Guide", content: "S: 36-38, M: 38-40, L: 40-42, XL: 42-44" } },
    { id: "meta3", type: "faq", fields: { question: "What is your return policy?", answer: "Free returns within 30 days." } },
  ], meta: { total: 3 }, error: null });
});

router.get("/admin/content/files", (_req, res) => {
  res.json({ data: [
    { id: "f1", filename: "summer-lookbook.pdf", size: 2_400_000, mimeType: "application/pdf", url: "#", createdAt: new Date().toISOString() },
    { id: "f2", filename: "size-guide.png",       size: 340_000,   mimeType: "image/png",       url: "#", createdAt: new Date().toISOString() },
  ], meta: { total: 2 }, error: null });
});

// ─── Public: blog posts & menus ───────────────────────────────────────────────

router.get("/store/blog-posts", (_req, res) => {
  const rows = db.prepare(`SELECT * FROM blog_posts WHERE status='published' ORDER BY published_at DESC`).all() as Row[];
  res.json({ data: parseRows(rows), meta: { total: rows.length }, error: null });
});

router.get("/store/menus/:handle", (req, res) => {
  const menu = parseOne(db.prepare(`SELECT * FROM menus WHERE handle=?`).get(req.params["handle"]) as Row | undefined);
  if (!menu) { res.status(404).json({ data: null, meta: {}, error: "Menu not found" }); return; }
  res.json({ data: menu, meta: {}, error: null });
});

export default router;
