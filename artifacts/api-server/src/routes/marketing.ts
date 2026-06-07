import { Router } from "express";
import { campaigns, discounts, blogPosts, menus, type Campaign, type Discount, type BlogPost, type Menu } from "../lib/db.js";
import { requireAdmin } from "../middlewares/auth.js";

const router = Router();

router.use("/admin/campaigns", requireAdmin);
router.use("/admin/discounts", requireAdmin);
router.use("/admin/content", requireAdmin);

// ─── Campaigns ────────────────────────────────────────────────────────────────

router.get("/admin/campaigns", (_req, res) => {
  res.json({ data: [...campaigns.values()], meta: { total: campaigns.size }, error: null });
});

router.get("/admin/campaigns/:id", (req, res) => {
  const c = campaigns.get(req.params.id!);
  if (!c) {
    res.status(404).json({ data: null, meta: {}, error: "Campaign not found" });
    return;
  }
  res.json({ data: c, meta: {}, error: null });
});

router.post("/admin/campaigns", (req, res) => {
  const id = `camp_${Date.now()}`;
  const camp: Campaign = {
    id,
    title: "",
    type: "email",
    status: "active",
    budget: 0,
    spent: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    createdAt: new Date().toISOString(),
    ...req.body,
  };
  campaigns.set(id, camp);
  res.status(201).json({ data: camp, meta: {}, error: null });
});

// ─── Discounts ────────────────────────────────────────────────────────────────

router.get("/admin/discounts", (_req, res) => {
  res.json({ data: [...discounts.values()], meta: { total: discounts.size }, error: null });
});

router.get("/admin/discounts/:id", (req, res) => {
  const d = discounts.get(req.params.id!);
  if (!d) {
    res.status(404).json({ data: null, meta: {}, error: "Discount not found" });
    return;
  }
  res.json({ data: d, meta: {}, error: null });
});

router.post("/admin/discounts", (req, res) => {
  const id = `disc_${Date.now()}`;
  const disc: Discount = {
    id,
    code: "",
    type: "percentage",
    value: 0,
    usageCount: 0,
    usageLimit: null,
    startsAt: new Date().toISOString(),
    endsAt: null,
    status: "active",
    ...req.body,
  };
  discounts.set(id, disc);
  res.status(201).json({ data: disc, meta: {}, error: null });
});

router.put("/admin/discounts/:id", (req, res) => {
  const disc = discounts.get(req.params.id!);
  if (!disc) {
    res.status(404).json({ data: null, meta: {}, error: "Discount not found" });
    return;
  }
  const updated = { ...disc, ...req.body, id: disc.id };
  discounts.set(disc.id, updated);
  res.json({ data: updated, meta: {}, error: null });
});

router.delete("/admin/discounts/:id", (req, res) => {
  discounts.delete(req.params.id!);
  res.json({ data: { deleted: true }, meta: {}, error: null });
});

// Validate discount code (public)
router.post("/store/discounts/validate", (req, res) => {
  const { code } = req.body as { code: string };
  const disc = [...discounts.values()].find((d) => d.code.toUpperCase() === code?.toUpperCase() && d.status === "active");
  if (!disc) {
    res.status(404).json({ data: null, meta: {}, error: "Invalid or expired discount code" });
    return;
  }
  res.json({ data: disc, meta: {}, error: null });
});

// ─── Content: Blog Posts ──────────────────────────────────────────────────────

router.get("/admin/content/blog-posts", (_req, res) => {
  res.json({ data: [...blogPosts.values()], meta: { total: blogPosts.size }, error: null });
});

router.get("/admin/content/blog-posts/:id", (req, res) => {
  const post = blogPosts.get(req.params.id!);
  if (!post) {
    res.status(404).json({ data: null, meta: {}, error: "Post not found" });
    return;
  }
  res.json({ data: post, meta: {}, error: null });
});

router.post("/admin/content/blog-posts", (req, res) => {
  const id = `post_${Date.now()}`;
  const now = new Date().toISOString();
  const post: BlogPost = {
    id,
    title: "",
    handle: "",
    author: "Admin",
    body: "",
    excerpt: "",
    tags: [],
    status: "draft",
    publishedAt: null,
    createdAt: now,
    ...req.body,
  };
  blogPosts.set(id, post);
  res.status(201).json({ data: post, meta: {}, error: null });
});

router.put("/admin/content/blog-posts/:id", (req, res) => {
  const post = blogPosts.get(req.params.id!);
  if (!post) {
    res.status(404).json({ data: null, meta: {}, error: "Post not found" });
    return;
  }
  const updated = { ...post, ...req.body, id: post.id };
  blogPosts.set(post.id, updated);
  res.json({ data: updated, meta: {}, error: null });
});

router.delete("/admin/content/blog-posts/:id", (req, res) => {
  blogPosts.delete(req.params.id!);
  res.json({ data: { deleted: true }, meta: {}, error: null });
});

// ─── Content: Menus ───────────────────────────────────────────────────────────

router.get("/admin/content/menus", (_req, res) => {
  res.json({ data: [...menus.values()], meta: { total: menus.size }, error: null });
});

router.get("/admin/content/menus/:id", (req, res) => {
  const menu = menus.get(req.params.id!);
  if (!menu) {
    res.status(404).json({ data: null, meta: {}, error: "Menu not found" });
    return;
  }
  res.json({ data: menu, meta: {}, error: null });
});

router.put("/admin/content/menus/:id", (req, res) => {
  const menu = menus.get(req.params.id!);
  if (!menu) {
    res.status(404).json({ data: null, meta: {}, error: "Menu not found" });
    return;
  }
  const updated: Menu = { ...menu, ...req.body, id: menu.id };
  menus.set(menu.id, updated);
  res.json({ data: updated, meta: {}, error: null });
});

// Public blog posts (storefront)
router.get("/store/blog-posts", (_req, res) => {
  const list = [...blogPosts.values()].filter((p) => p.status === "published");
  res.json({ data: list, meta: { total: list.length }, error: null });
});

// Public menus
router.get("/store/menus/:handle", (req, res) => {
  const menu = [...menus.values()].find((m) => m.handle === req.params.handle);
  if (!menu) {
    res.status(404).json({ data: null, meta: {}, error: "Menu not found" });
    return;
  }
  res.json({ data: menu, meta: {}, error: null });
});

export default router;
