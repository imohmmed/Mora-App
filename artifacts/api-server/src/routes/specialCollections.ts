import { Router } from "express";
import db, { parseRows } from "../lib/db.js";
import { requireAdmin } from "../middlewares/auth.js";
import type { Row } from "../lib/types.js";

const router = Router();

const COLLECTION_META: Record<string, {
  title: string;
  description: string;
  heroImage: string;
  accentColor: string;
}> = {
  "super-deals": {
    title: "Super Deals",
    description: "Save 25% or more on these top picks",
    heroImage: "https://picsum.photos/seed/superdeals/800/500",
    accentColor: "#E53935",
  },
  "brand-deals": {
    title: "Brand Deals",
    description: "Curated picks from our favourite brands",
    heroImage: "https://picsum.photos/seed/branddeals/800/500",
    accentColor: "#0274C1",
  },
  "trends": {
    title: "Trends",
    description: "What's selling fast this week",
    heroImage: "https://picsum.photos/seed/trends777/800/500",
    accentColor: "#6A1B9A",
  },
  "hot-seller": {
    title: "Hot Seller",
    description: "Our hand-picked bestsellers",
    heroImage: "https://picsum.photos/seed/hotseller/800/500",
    accentColor: "#E65100",
  },
};

function getSuperDealsProducts(limit: number, offset: number) {
  const rows = db.prepare(`
    SELECT * FROM products
    WHERE status='active'
      AND compare_price IS NOT NULL
      AND compare_price > 0
      AND (compare_price - price) / compare_price >= 0.25
    ORDER BY (compare_price - price) / compare_price DESC
  `).all() as Row[];
  return { products: rows.slice(offset, offset + limit), total: rows.length };
}

function getTrendsProducts(limit: number, offset: number) {
  const rows = db.prepare(`
    SELECT * FROM products
    WHERE status='active'
    ORDER BY sold_count DESC, updated_at DESC
  `).all() as Row[];
  return { products: rows.slice(offset, offset + limit), total: rows.length };
}

function getCuratedProducts(slug: string, limit: number, offset: number) {
  const rows = db.prepare(`
    SELECT p.* FROM products p
    JOIN special_collection_items sci ON p.id = sci.product_id
    WHERE sci.collection_slug = ? AND p.status = 'active'
    ORDER BY sci.sort_order ASC
  `).all(slug) as Row[];
  return { products: rows.slice(offset, offset + limit), total: rows.length };
}

router.get("/store/special-collections", (_req, res) => {
  const slugs = ["super-deals", "brand-deals", "trends", "hot-seller"];
  const result = slugs.map((slug) => {
    const meta = COLLECTION_META[slug]!;
    let products: Row[];
    let total: number;
    if (slug === "super-deals") {
      ({ products, total } = getSuperDealsProducts(2, 0));
    } else if (slug === "trends") {
      ({ products, total } = getTrendsProducts(2, 0));
    } else {
      ({ products, total } = getCuratedProducts(slug, 2, 0));
    }
    return { slug, ...meta, total, products: parseRows(products) };
  });
  res.json({ data: result, meta: {}, error: null });
});

router.get("/store/special-collections/:slug", (req, res) => {
  const { slug } = req.params as { slug: string };
  const meta = COLLECTION_META[slug];
  if (!meta) {
    res.status(404).json({ data: null, meta: {}, error: "Collection not found" });
    return;
  }
  const { limit = "20", page = "1" } = req.query as Record<string, string>;
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const pageNum = Math.max(1, parseInt(page));
  const offset = (pageNum - 1) * limitNum;

  let products: Row[];
  let total: number;
  if (slug === "super-deals") {
    ({ products, total } = getSuperDealsProducts(limitNum, offset));
  } else if (slug === "trends") {
    ({ products, total } = getTrendsProducts(limitNum, offset));
  } else {
    ({ products, total } = getCuratedProducts(slug, limitNum, offset));
  }

  res.json({
    data: { slug, ...meta, products: parseRows(products) },
    meta: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
    error: null,
  });
});

router.use("/admin/special-collections", requireAdmin);

router.get("/admin/special-collections/:slug/items", (req, res) => {
  const { slug } = req.params as { slug: string };
  if (!["brand-deals", "hot-seller"].includes(slug)) {
    res.status(400).json({ data: null, meta: {}, error: "Only brand-deals and hot-seller support manual curation" });
    return;
  }
  const rows = db.prepare(`
    SELECT p.*, sci.sort_order FROM products p
    JOIN special_collection_items sci ON p.id = sci.product_id
    WHERE sci.collection_slug = ?
    ORDER BY sci.sort_order ASC
  `).all(slug) as Row[];
  res.json({ data: parseRows(rows), meta: { total: rows.length }, error: null });
});

router.post("/admin/special-collections/:slug/items", (req, res) => {
  const { slug } = req.params as { slug: string };
  if (!["brand-deals", "hot-seller"].includes(slug)) {
    res.status(400).json({ data: null, meta: {}, error: "Only brand-deals and hot-seller support manual curation" });
    return;
  }
  const { productId } = req.body as { productId: string };
  const count = ((db.prepare(`SELECT COUNT(*) as n FROM special_collection_items WHERE collection_slug=?`).get(slug) as Row)["n"] as number) ?? 0;
  try {
    db.prepare(`INSERT INTO special_collection_items (collection_slug, product_id, sort_order, created_at) VALUES (?, ?, ?, ?)`)
      .run(slug, productId, count, new Date().toISOString());
    res.status(201).json({ data: { collectionSlug: slug, productId, sortOrder: count }, meta: {}, error: null });
  } catch {
    res.status(409).json({ data: null, meta: {}, error: "Product already in collection" });
  }
});

router.delete("/admin/special-collections/:slug/items/:productId", (req, res) => {
  const { slug, productId } = req.params as { slug: string; productId: string };
  db.prepare(`DELETE FROM special_collection_items WHERE collection_slug=? AND product_id=?`).run(slug, productId);
  res.json({ data: null, meta: {}, error: null });
});

export default router;
