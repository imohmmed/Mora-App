import { Router } from "express";
import { products, variants, collections } from "../lib/db.js";
import { requireAdmin } from "../middlewares/auth.js";

const router = Router();

// ─── Public store endpoints ────────────────────────────────────────────────────

router.get("/store/products", (req, res) => {
  const { category, q, limit = "20", page = "1" } = req.query as Record<string, string>;
  let list = [...products.values()].filter((p) => p.status === "active");
  if (category) list = list.filter((p) => p.category === category);
  if (q) {
    const qlo = q.toLowerCase();
    list = list.filter((p) => p.title.toLowerCase().includes(qlo) || p.tags.some((t) => t.includes(qlo)));
  }
  const total = list.length;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const data = list.slice((pageNum - 1) * limitNum, pageNum * limitNum);
  res.json({ data, meta: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) }, error: null });
});

router.get("/store/products/:id", (req, res) => {
  const product = products.get(req.params.id!);
  if (!product) {
    res.status(404).json({ data: null, meta: {}, error: "Product not found" });
    return;
  }
  const productVariants = [...variants.values()].filter((v) => v.productId === product.id);
  res.json({ data: { ...product, variants: productVariants }, meta: {}, error: null });
});

router.get("/store/search", (req, res) => {
  const { q = "" } = req.query as Record<string, string>;
  const qlo = q.toLowerCase();
  const list = [...products.values()].filter(
    (p) => p.status === "active" && (p.title.toLowerCase().includes(qlo) || p.vendor.toLowerCase().includes(qlo) || p.tags.some((t) => t.includes(qlo)))
  );
  res.json({ data: list, meta: { total: list.length, query: q }, error: null });
});

router.get("/store/collections", (_req, res) => {
  res.json({ data: [...collections.values()], meta: { total: collections.size }, error: null });
});

router.get("/store/collections/:id", (req, res) => {
  const col = collections.get(req.params.id!);
  if (!col) {
    res.status(404).json({ data: null, meta: {}, error: "Collection not found" });
    return;
  }
  res.json({ data: col, meta: {}, error: null });
});

// ─── Admin endpoints ──────────────────────────────────────────────────────────

router.use("/admin/products", requireAdmin);
router.use("/admin/collections", requireAdmin);
router.use("/admin/variants", requireAdmin);

router.get("/admin/products", (req, res) => {
  const { status, category, q } = req.query as Record<string, string>;
  let list = [...products.values()];
  if (status) list = list.filter((p) => p.status === status);
  if (category) list = list.filter((p) => p.category === category);
  if (q) {
    const qlo = q.toLowerCase();
    list = list.filter((p) => p.title.toLowerCase().includes(qlo));
  }
  const withInventory = list.map((p) => {
    const pvars = [...variants.values()].filter((v) => v.productId === p.id);
    const totalInventory = pvars.reduce((s, v) => s + v.inventory, 0);
    return { ...p, totalInventory, variantsCount: pvars.length };
  });
  res.json({ data: withInventory, meta: { total: list.length }, error: null });
});

router.get("/admin/products/:id", (req, res) => {
  const product = products.get(req.params.id!);
  if (!product) {
    res.status(404).json({ data: null, meta: {}, error: "Product not found" });
    return;
  }
  const productVariants = [...variants.values()].filter((v) => v.productId === product.id);
  res.json({ data: { ...product, variants: productVariants }, meta: {}, error: null });
});

router.post("/admin/products", (req, res) => {
  const id = `p${Date.now()}`;
  const now = new Date().toISOString();
  const product = { id, createdAt: now, updatedAt: now, status: "draft" as const, images: [], tags: [], compareAtPrice: null, ...req.body } as typeof products extends Map<string, infer V> ? V : never;
  products.set(id, product);
  res.status(201).json({ data: product, meta: {}, error: null });
});

router.put("/admin/products/:id", (req, res) => {
  const product = products.get(req.params.id!);
  if (!product) {
    res.status(404).json({ data: null, meta: {}, error: "Product not found" });
    return;
  }
  const updated = { ...product, ...req.body, id: product.id, updatedAt: new Date().toISOString() };
  products.set(product.id, updated);
  res.json({ data: updated, meta: {}, error: null });
});

router.delete("/admin/products/:id", (req, res) => {
  if (!products.has(req.params.id!)) {
    res.status(404).json({ data: null, meta: {}, error: "Product not found" });
    return;
  }
  products.delete(req.params.id!);
  res.json({ data: { deleted: true }, meta: {}, error: null });
});

// Collections CRUD
router.get("/admin/collections", (_req, res) => {
  res.json({ data: [...collections.values()], meta: { total: collections.size }, error: null });
});

router.get("/admin/collections/:id", (req, res) => {
  const col = collections.get(req.params.id!);
  if (!col) {
    res.status(404).json({ data: null, meta: {}, error: "Collection not found" });
    return;
  }
  res.json({ data: col, meta: {}, error: null });
});

router.post("/admin/collections", (req, res) => {
  const id = `col${Date.now()}`;
  const col = { id, createdAt: new Date().toISOString(), productsCount: 0, image: "", ...req.body };
  collections.set(id, col);
  res.status(201).json({ data: col, meta: {}, error: null });
});

router.put("/admin/collections/:id", (req, res) => {
  const col = collections.get(req.params.id!);
  if (!col) {
    res.status(404).json({ data: null, meta: {}, error: "Collection not found" });
    return;
  }
  const updated = { ...col, ...req.body, id: col.id };
  collections.set(col.id, updated);
  res.json({ data: updated, meta: {}, error: null });
});

router.delete("/admin/collections/:id", (req, res) => {
  collections.delete(req.params.id!);
  res.json({ data: { deleted: true }, meta: {}, error: null });
});

// Inventory / Variants
router.get("/admin/variants", (_req, res) => {
  res.json({ data: [...variants.values()], meta: { total: variants.size }, error: null });
});

router.get("/admin/variants/:productId", (req, res) => {
  const list = [...variants.values()].filter((v) => v.productId === req.params.productId);
  res.json({ data: list, meta: { total: list.length }, error: null });
});

router.put("/admin/variants/:id", (req, res) => {
  const variant = variants.get(req.params.id!);
  if (!variant) {
    res.status(404).json({ data: null, meta: {}, error: "Variant not found" });
    return;
  }
  const updated = { ...variant, ...req.body, id: variant.id };
  variants.set(variant.id, updated);
  res.json({ data: updated, meta: {}, error: null });
});

export default router;
