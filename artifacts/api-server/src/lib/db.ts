// SQLite database using better-sqlite3.
// File-backed when DATABASE_PATH is set (production — survives restarts);
// in-memory otherwise (dev — fresh seed on each restart).

import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const DB_PATH = process.env.DATABASE_PATH?.trim() || ":memory:";
if (DB_PATH !== ":memory:") {
  const dir = dirname(DB_PATH);
  if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export const db = new Database(DB_PATH);

// ─── Schema ───────────────────────────────────────────────────────────────────

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS products (
    id            TEXT PRIMARY KEY,
    title         TEXT NOT NULL,
    vendor        TEXT NOT NULL,
    category      TEXT NOT NULL,
    description   TEXT NOT NULL DEFAULT '',
    price         REAL NOT NULL,
    compare_price REAL,
    cost          REAL,
    images        TEXT NOT NULL DEFAULT '[]',
    tags          TEXT NOT NULL DEFAULT '[]',
    status        TEXT NOT NULL DEFAULT 'active',
    sold_count    INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS special_collection_items (
    collection_slug TEXT NOT NULL,
    product_id      TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL,
    PRIMARY KEY (collection_slug, product_id)
  );

  CREATE TABLE IF NOT EXISTS product_complete_set (
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    related_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (product_id, related_id)
  );

  CREATE TABLE IF NOT EXISTS variants (
    id            TEXT PRIMARY KEY,
    product_id    TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    sku           TEXT NOT NULL,
    price         REAL NOT NULL,
    compare_price REAL,
    cost          REAL,
    inventory     INTEGER NOT NULL DEFAULT 0,
    option1       TEXT,
    option2       TEXT
  );

  CREATE TABLE IF NOT EXISTS restock_requests (
    id          TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    product_id  TEXT NOT NULL,
    variant_id  TEXT NOT NULL,
    email       TEXT NOT NULL DEFAULT '',
    push_token  TEXT NOT NULL DEFAULT '',
    notified    INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL,
    notified_at TEXT
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_restock_unique  ON restock_requests(customer_id, variant_id);
  CREATE INDEX IF NOT EXISTS        idx_restock_pending ON restock_requests(variant_id, notified);

  CREATE TABLE IF NOT EXISTS collections (
    id             TEXT PRIMARY KEY,
    title          TEXT NOT NULL,
    description    TEXT NOT NULL DEFAULT '',
    image          TEXT NOT NULL DEFAULT '',
    products_count INTEGER NOT NULL DEFAULT 0,
    created_at     TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS customers (
    id                TEXT PRIMARY KEY,
    first_name        TEXT NOT NULL,
    last_name         TEXT NOT NULL,
    email             TEXT NOT NULL UNIQUE,
    password_hash     TEXT,
    phone             TEXT NOT NULL DEFAULT '',
    orders_count      INTEGER NOT NULL DEFAULT 0,
    total_spent       REAL NOT NULL DEFAULT 0,
    tags              TEXT NOT NULL DEFAULT '[]',
    segment           TEXT,
    company           TEXT,
    address           TEXT NOT NULL DEFAULT '{}',
    accepts_marketing INTEGER NOT NULL DEFAULT 0,
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token       TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    created_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS banners (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL DEFAULT '',
    subtitle     TEXT NOT NULL DEFAULT '',
    image_url    TEXT NOT NULL DEFAULT '',
    bg_color     TEXT NOT NULL DEFAULT '#0274C1',
    link_url     TEXT NOT NULL DEFAULT '',
    has_button   INTEGER NOT NULL DEFAULT 1,
    button_text  TEXT NOT NULL DEFAULT 'SHOP NOW',
    button_align TEXT NOT NULL DEFAULT 'left',
    sort_order   INTEGER NOT NULL DEFAULT 0,
    status       TEXT NOT NULL DEFAULT 'active',
    updated_at   TEXT,
    created_at   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id                       TEXT PRIMARY KEY,
    order_number             TEXT NOT NULL,
    customer_id              TEXT,
    email                    TEXT NOT NULL DEFAULT '',
    status                   TEXT NOT NULL DEFAULT 'pending',
    financial_status         TEXT NOT NULL DEFAULT 'pending',
    fulfillment_status       TEXT NOT NULL DEFAULT 'unfulfilled',
    subtotal                 REAL NOT NULL DEFAULT 0,
    shipping                 REAL NOT NULL DEFAULT 5.99,
    tax                      REAL NOT NULL DEFAULT 0,
    total                    REAL NOT NULL DEFAULT 0,
    currency                 TEXT NOT NULL DEFAULT 'USD',
    shipping_address         TEXT NOT NULL DEFAULT '{}',
    line_items               TEXT NOT NULL DEFAULT '[]',
    note                     TEXT NOT NULL DEFAULT '',
    tags                     TEXT NOT NULL DEFAULT '[]',
    is_draft                 INTEGER NOT NULL DEFAULT 0,
    is_abandoned             INTEGER NOT NULL DEFAULT 0,
    live_activity_push_token TEXT,
    delivery_stage           TEXT NOT NULL DEFAULT 'confirmed',
    delivery_type            TEXT NOT NULL DEFAULT 'standard',
    payment_method           TEXT NOT NULL DEFAULT 'cod',
    created_at               TEXT NOT NULL,
    updated_at               TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS discounts (
    id          TEXT PRIMARY KEY,
    code        TEXT NOT NULL UNIQUE,
    type        TEXT NOT NULL,
    value       REAL NOT NULL DEFAULT 0,
    usage_count INTEGER NOT NULL DEFAULT 0,
    usage_limit INTEGER,
    starts_at   TEXT NOT NULL,
    ends_at     TEXT,
    status      TEXT NOT NULL DEFAULT 'active'
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    type        TEXT NOT NULL DEFAULT 'email',
    status      TEXT NOT NULL DEFAULT 'active',
    budget      REAL NOT NULL DEFAULT 0,
    spent       REAL NOT NULL DEFAULT 0,
    impressions INTEGER NOT NULL DEFAULT 0,
    clicks      INTEGER NOT NULL DEFAULT 0,
    conversions INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS blog_posts (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    handle       TEXT NOT NULL UNIQUE,
    author       TEXT NOT NULL DEFAULT 'Admin',
    body         TEXT NOT NULL DEFAULT '',
    excerpt      TEXT NOT NULL DEFAULT '',
    tags         TEXT NOT NULL DEFAULT '[]',
    status       TEXT NOT NULL DEFAULT 'draft',
    published_at TEXT,
    created_at   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS menus (
    id     TEXT PRIMARY KEY,
    title  TEXT NOT NULL,
    handle TEXT NOT NULL UNIQUE,
    items  TEXT NOT NULL DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS markets (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    countries  TEXT NOT NULL DEFAULT '[]',
    currency   TEXT NOT NULL DEFAULT 'USD',
    status     TEXT NOT NULL DEFAULT 'inactive',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS story_rows (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    status     TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS story_items (
    id         TEXT PRIMARY KEY,
    row_id     TEXT NOT NULL REFERENCES story_rows(id) ON DELETE CASCADE,
    title      TEXT NOT NULL DEFAULT '',
    image_url  TEXT NOT NULL DEFAULT '',
    link_url   TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    status     TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS content_sections (
    id         TEXT PRIMARY KEY,
    key        TEXT UNIQUE NOT NULL,
    title      TEXT NOT NULL DEFAULT '',
    items      TEXT NOT NULL DEFAULT '[]',
    sort_order INTEGER NOT NULL DEFAULT 0,
    status     TEXT NOT NULL DEFAULT 'active',
    updated_at TEXT NOT NULL
  );
`);

// ─── Migrations (additive, safe on existing DBs) ──────────────────────────────

function ensureColumn(table: string, column: string, decl: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${decl}`);
  }
}
ensureColumn("products", "cost", "REAL");
ensureColumn("variants", "cost", "REAL");
ensureColumn("products", "option_definitions", "TEXT NOT NULL DEFAULT '[]'");
ensureColumn("products", "seo_title", "TEXT NOT NULL DEFAULT ''");
ensureColumn("products", "seo_description", "TEXT NOT NULL DEFAULT ''");
ensureColumn("products", "url_slug", "TEXT NOT NULL DEFAULT ''");
ensureColumn("collections", "background_image", "TEXT NOT NULL DEFAULT ''");
ensureColumn("collections", "collection_type", "TEXT NOT NULL DEFAULT 'manual'");
ensureColumn("collections", "conditions", "TEXT NOT NULL DEFAULT '[]'");
ensureColumn("collections", "conditions_match", "TEXT NOT NULL DEFAULT 'all'");
ensureColumn("collections", "title_ar", "TEXT NOT NULL DEFAULT ''");
ensureColumn("story_items", "title_ar", "TEXT NOT NULL DEFAULT ''");
ensureColumn("story_rows",  "title_ar",        "TEXT NOT NULL DEFAULT ''");
ensureColumn("story_rows",  "description_en",  "TEXT NOT NULL DEFAULT ''");
ensureColumn("story_rows",  "description_ar",  "TEXT NOT NULL DEFAULT ''");
ensureColumn("story_rows",  "background_image","TEXT NOT NULL DEFAULT ''");
ensureColumn("story_rows",  "image",           "TEXT NOT NULL DEFAULT ''");
ensureColumn("story_rows",  "condition_type",  "TEXT NOT NULL DEFAULT 'manual'");
ensureColumn("story_rows",  "condition_value", "TEXT NOT NULL DEFAULT ''");
ensureColumn("customers",   "gender",          "TEXT");
ensureColumn("customers",   "birth_year",      "INTEGER");

db.exec(`
  CREATE TABLE IF NOT EXISTS product_collections (
    product_id    TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, collection_id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS activity_log (
    id           TEXT PRIMARY KEY,
    action       TEXT NOT NULL,
    category     TEXT NOT NULL,
    entity_type  TEXT NOT NULL,
    entity_id    TEXT,
    entity_title TEXT NOT NULL DEFAULT '',
    actor        TEXT NOT NULL DEFAULT 'Admin',
    metadata     TEXT NOT NULL DEFAULT '{}',
    created_at   TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_act_created ON activity_log(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_act_category ON activity_log(category);
`);

// ─── Notifications infrastructure ────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS push_tokens (
    id          TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    token       TEXT NOT NULL UNIQUE,
    platform    TEXT NOT NULL DEFAULT 'ios',
    created_at  TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_pt_customer ON push_tokens(customer_id);

  CREATE TABLE IF NOT EXISTS notification_log (
    id          TEXT PRIMARY KEY,
    type        TEXT NOT NULL DEFAULT 'push',
    title       TEXT NOT NULL DEFAULT '',
    body        TEXT NOT NULL DEFAULT '',
    payload     TEXT NOT NULL DEFAULT '{}',
    tokens_sent INTEGER NOT NULL DEFAULT 0,
    success     INTEGER NOT NULL DEFAULT 0,
    failed      INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_nlog_created ON notification_log(created_at DESC);
`);

// ─── Notification templates ───────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS notification_templates (
    key        TEXT PRIMARY KEY,
    title      TEXT NOT NULL,
    body       TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

// ─── Migrations (add columns to existing DBs) ────────────────────────────────
try { db.exec(`ALTER TABLE customers ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''`); } catch { /* column already exists */ }
try { db.exec(`ALTER TABLE products ADD COLUMN rating REAL NOT NULL DEFAULT 0`); } catch { /* already exists */ }
try { db.exec(`ALTER TABLE products ADD COLUMN rating_count INTEGER NOT NULL DEFAULT 0`); } catch { /* already exists */ }
try { db.exec(`ALTER TABLE products ADD COLUMN video_url TEXT NOT NULL DEFAULT ''`); } catch { /* already exists */ }
try { db.exec(`ALTER TABLE banners ADD COLUMN video_url TEXT NOT NULL DEFAULT ''`); } catch { /* already exists */ }

// ─── Admin users (Google OAuth) ──────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT    NOT NULL UNIQUE,
    name        TEXT    NOT NULL,
    role        TEXT    NOT NULL DEFAULT 'admin',
    permissions TEXT    NOT NULL DEFAULT '{}',
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    last_login  TEXT
  );
`);

// Seed super-owner (always upserted with full permissions)
const OWNER_EMAIL = "aaaa35059@gmail.com";
const OWNER_PERMS = JSON.stringify({
  orders: true, products: true, customers: true,
  analytics: true, marketing: true, content: true, settings: true,
});
db.prepare(`
  INSERT INTO admin_users (email, name, role, permissions, is_active, created_at)
  VALUES (?, 'Owner', 'owner', ?, 1, datetime('now'))
  ON CONFLICT(email) DO UPDATE SET role='owner', is_active=1
`).run(OWNER_EMAIL, OWNER_PERMS);

// ─── Seed helpers ─────────────────────────────────────────────────────────────

const iso = (daysAgo: number) =>
  new Date(Date.now() - daysAgo * 86_400_000).toISOString();

const j = (v: unknown) => JSON.stringify(v);

// Seed only when the database is empty (fresh file, or every restart for :memory:).
const needsSeed =
  (db.prepare(`SELECT COUNT(*) AS n FROM products`).get() as { n: number }).n === 0;

if (needsSeed) {
// ─── Seed: Products ───────────────────────────────────────────────────────────

const seedProducts = [
  { id: "p001", title: "Oversized Blazer",        vendor: "Mora Studio",    category: "women",  price: 117000, compare_price: null,   sold_count: 142, tags: ["blazer","office"] },
  { id: "p002", title: "Slim Fit Trousers",        vendor: "Mora Essentials",category: "women",  price: 72000,  compare_price: 98000,  sold_count: 98,  tags: ["trousers","sale"] },
  { id: "p003", title: "Ribbed Knit Dress",        vendor: "Mora Studio",    category: "women",  price: 94000,  compare_price: null,   sold_count: 87,  tags: ["dress","knit"] },
  { id: "p004", title: "Linen Shirt",              vendor: "Mora Essentials",category: "women",  price: 58000,  compare_price: null,   sold_count: 63,  tags: ["shirt","linen"] },
  { id: "p005", title: "High Waist Jeans",         vendor: "Mora Denim",     category: "women",  price: 88000,  compare_price: null,   sold_count: 110, tags: ["jeans","denim"] },
  { id: "p006", title: "Satin Midi Skirt",         vendor: "Mora Studio",    category: "women",  price: 78000,  compare_price: 110000, sold_count: 76,  tags: ["skirt","satin","sale"] },
  { id: "p007", title: "Cropped Leather Jacket",   vendor: "Mora Studio",    category: "women",  price: 194000, compare_price: null,   sold_count: 54,  tags: ["jacket","leather"] },
  { id: "p008", title: "Cashmere Sweater",         vendor: "Mora Essentials",category: "women",  price: 124000, compare_price: null,   sold_count: 91,  tags: ["sweater","cashmere"] },
  { id: "p009", title: "Slim Fit Chinos",          vendor: "Mora Mens",      category: "men",    price: 68000,  compare_price: null,   sold_count: 79,  tags: ["chinos","slim"] },
  { id: "p010", title: "Oxford Shirt",             vendor: "Mora Mens",      category: "men",    price: 62000,  compare_price: null,   sold_count: 103, tags: ["shirt","oxford"] },
  { id: "p011", title: "Wool Coat",                vendor: "Mora Mens",      category: "men",    price: 246000, compare_price: 325000, sold_count: 45,  tags: ["coat","wool","sale"] },
  { id: "p012", title: "Track Jacket",             vendor: "Mora Sport",     category: "men",    price: 85000,  compare_price: null,   sold_count: 67,  tags: ["jacket","sport"] },
  { id: "p013", title: "Relaxed Denim",            vendor: "Mora Denim",     category: "men",    price: 94000,  compare_price: null,   sold_count: 82,  tags: ["jeans","denim"] },
  { id: "p014", title: "Piqué Polo Shirt",         vendor: "Mora Mens",      category: "men",    price: 49000,  compare_price: null,   sold_count: 118, tags: ["polo"] },
  { id: "p015", title: "Vitamin C Serum",          vendor: "Mora Beauty",    category: "beauty", price: 45000,  compare_price: null,   sold_count: 156, tags: ["serum","skincare"] },
  { id: "p016", title: "Hydra-Glow Moisturiser",   vendor: "Mora Beauty",    category: "beauty", price: 36000,  compare_price: null,   sold_count: 129, tags: ["moisturiser","skincare"] },
  { id: "p017", title: "Volumising Mascara",       vendor: "Mora Beauty",    category: "beauty", price: 24000,  compare_price: null,   sold_count: 171, tags: ["mascara","makeup"] },
  { id: "p018", title: "Matte Lip Set",            vendor: "Mora Beauty",    category: "beauty", price: 29000,  compare_price: 39000,  sold_count: 93,  tags: ["lipstick","makeup","sale"] },
  { id: "p019", title: "Silk Slip Dress",          vendor: "Mora Studio",    category: "new_in", price: 129000, compare_price: null,   sold_count: 38,  tags: ["dress","silk","new"] },
  { id: "p020", title: "Tailored Waistcoat",       vendor: "Mora Studio",    category: "new_in", price: 103000, compare_price: null,   sold_count: 29,  tags: ["waistcoat","new"] },
  { id: "p021", title: "Cargo Trousers",           vendor: "Mora Mens",      category: "sale",   price: 46000,  compare_price: 85000,  sold_count: 134, tags: ["cargo","sale"] },
  { id: "p022", title: "Wrap Midi Dress",          vendor: "Mora Studio",    category: "sale",   price: 52000,  compare_price: 98000,  sold_count: 147, tags: ["dress","wrap","sale"] },
];

const insertProduct = db.prepare(`
  INSERT INTO products (id,title,vendor,category,description,price,compare_price,cost,images,tags,status,sold_count,created_at,updated_at)
  VALUES (@id,@title,@vendor,@category,@description,@price,@compare_price,@cost,@images,@tags,@status,@sold_count,@created_at,@updated_at)
`);
const insertVariant = db.prepare(`
  INSERT INTO variants (id,product_id,title,sku,price,compare_price,cost,inventory,option1,option2)
  VALUES (@id,@product_id,@title,@sku,@price,@compare_price,@cost,@inventory,@option1,@option2)
`);

const SIZES = ["XS", "S", "M", "L", "XL"];

for (const p of seedProducts) {
  insertProduct.run({
    ...p,
    description: `Premium quality ${p.title.toLowerCase()} from ${p.vendor}. Crafted for comfort and style.`,
    images: j([`https://picsum.photos/seed/${p.id}/600/800`]),
    tags: j(p.tags),
    compare_price: p.compare_price ?? null,
    cost: Math.round(p.price * 0.55),
    sold_count: p.sold_count,
    status: "active",
    created_at: iso(Math.floor(Math.random() * 90)),
    updated_at: iso(Math.floor(Math.random() * 7)),
  });
  SIZES.forEach((size, si) => {
    insertVariant.run({
      id: `v_${p.id}_${si}`,
      product_id: p.id,
      title: size,
      sku: `${p.id.toUpperCase()}-${size}`,
      price: p.price,
      compare_price: p.compare_price ?? null,
      cost: Math.round(p.price * 0.55),
      inventory: Math.floor(Math.random() * 40) + 5,
      option1: size,
      option2: null,
    });
  });
}

// ─── Seed: Banners ────────────────────────────────────────────────────────────

const insertBanner = db.prepare(`
  INSERT INTO banners (id,title,subtitle,image_url,bg_color,link_url,has_button,button_text,button_align,sort_order,status,created_at)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
`);

[
  { id: "ban001", title: "New Season\nArrived", subtitle: "Up to 40% off selected styles", image: "https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=800&auto=format&fit=crop", bg: "#0274C1", link: "/products?category=women", hasBtn: 1, btnText: "SHOP WOMEN", align: "left" },
  { id: "ban002", title: "Summer Edit",         subtitle: "Fresh styles for warm days",   image: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=800&auto=format&fit=crop", bg: "#1A1A1A", link: "/products", hasBtn: 1, btnText: "EXPLORE",    align: "center" },
  { id: "ban003", title: "Beauty Week",          subtitle: "20% off all beauty products",  image: "https://images.unsplash.com/photo-1596462502278-27bf85033e5a?q=80&w=800&auto=format&fit=crop", bg: "#6A1B9A", link: "/products?category=beauty", hasBtn: 0, btnText: "", align: "left" },
].forEach((b, i) => insertBanner.run(b.id, b.title, b.subtitle, b.image, b.bg, b.link, b.hasBtn, b.btnText, b.align, i, "active", new Date().toISOString()));

// ─── Seed: Special Collection Items ───────────────────────────────────────────

const insertSCI = db.prepare(`
  INSERT OR IGNORE INTO special_collection_items (collection_slug, product_id, sort_order, created_at)
  VALUES (?, ?, ?, ?)
`);

const now = new Date().toISOString();
[
  { slug: "brand-deals",  products: ["p019","p020","p007","p008"] },
  { slug: "hot-seller",   products: ["p001","p015","p017","p022"] },
].forEach(({ slug, products }) => {
  products.forEach((pid, i) => insertSCI.run(slug, pid, i, now));
});

// ─── Seed: Collections ────────────────────────────────────────────────────────

const insertCollection = db.prepare(`
  INSERT INTO collections (id,title,description,image,products_count,created_at)
  VALUES (@id,@title,@description,@image,@products_count,@created_at)
`);
[
  { id: "col1", title: "New Season Arrivals",  description: "Fresh styles for the new season.",       products_count: 8,  days: 30 },
  { id: "col2", title: "Women's Edit",         description: "Curated looks for every occasion.",      products_count: 10, days: 45 },
  { id: "col3", title: "Men's Essentials",     description: "Wardrobe staples for modern men.",       products_count: 6,  days: 60 },
  { id: "col4", title: "Beauty Favourites",    description: "Top-rated skincare and makeup.",         products_count: 4,  days: 20 },
  { id: "col5", title: "Sale Picks",           description: "Up to 50% off selected styles.",         products_count: 6,  days: 10 },
  { id: "col_mora-perfumes", title: "Mora Perfumes", description: "Signature scents, curated.",       products_count: 12, days: 5 },
].forEach(({ days, ...c }) =>
  insertCollection.run({ ...c, image: `https://picsum.photos/seed/${c.id}/800/400`, created_at: iso(days) })
);

const insertProductCollection = db.prepare(`
  INSERT OR IGNORE INTO product_collections (product_id, collection_id) VALUES (?, ?)
`);
["p001","p002","p003","p004","p005","p006","p007","p008","p009","p010","p011","p012"].forEach((pid) =>
  insertProductCollection.run(pid, "col_mora-perfumes")
);

// ─── Seed: Customers ──────────────────────────────────────────────────────────

const FIRST = ["Sara","Lena","Nour","Maya","Hana","Omar","Ali","Zaid","Yara","Reem"];
const LAST  = ["Al-Hassan","Ibrahim","Mohammed","Ahmed","Khalid","Saeed","Nasser","Hamad","Jaber","Yousef"];

const insertCustomer = db.prepare(`
  INSERT INTO customers (id,first_name,last_name,email,phone,orders_count,total_spent,tags,segment,company,address,accepts_marketing,created_at)
  VALUES (@id,@first_name,@last_name,@email,@phone,@orders_count,@total_spent,@tags,@segment,@company,@address,@accepts_marketing,@created_at)
`);

const customers: Array<{ id: string; email: string; first_name: string; last_name: string }> = [];
FIRST.forEach((fn, i) => {
  const ln = LAST[i]!;
  const id = `cust_${String(i + 1).padStart(4, "0")}`;
  const email = `${fn.toLowerCase()}.${ln.toLowerCase().replace(/[^a-z]/g, "")}@example.com`;
  insertCustomer.run({
    id,
    first_name: fn,
    last_name: ln,
    email,
    phone: `+9647${(700_000_000 + i * 13_777_777).toString().slice(0, 9)}`,
    orders_count: Math.floor(Math.random() * 8) + 1,
    total_spent: +(Math.random() * 800 + 50).toFixed(2),
    tags: j(i % 3 === 0 ? ["vip"] : []),
    segment: i % 4 === 0 ? "vip" : null,
    company: i % 5 === 0 ? "Mora Corp" : null,
    address: j({ city: "Baghdad", country: "Iraq", zip: "10001" }),
    accepts_marketing: i % 2 === 0 ? 1 : 0,
    created_at: iso(30 + i * 10),
  });
  customers.push({ id, email, first_name: fn, last_name: ln });
});

// ─── Seed: Orders ─────────────────────────────────────────────────────────────

const insertOrder = db.prepare(`
  INSERT INTO orders (id,order_number,customer_id,email,status,financial_status,fulfillment_status,subtotal,shipping,tax,total,currency,shipping_address,line_items,note,tags,is_draft,is_abandoned,created_at,updated_at)
  VALUES (@id,@order_number,@customer_id,@email,@status,@financial_status,@fulfillment_status,@subtotal,@shipping,@tax,@total,@currency,@shipping_address,@line_items,@note,@tags,@is_draft,@is_abandoned,@created_at,@updated_at)
`);

const ORDER_STATUSES = ["pending","processing","fulfilled","cancelled","refunded"] as const;

for (let i = 0; i < 18; i++) {
  const id = `ord_${String(i + 1).padStart(4, "0")}`;
  const cust = customers[i % customers.length]!;
  const status = ORDER_STATUSES[i % ORDER_STATUSES.length]!;
  const isDraft = i >= 16 ? 1 : 0;
  const isAbandoned = i === 15 ? 1 : 0;
  const prod = seedProducts[i % seedProducts.length]!;
  const qty = Math.floor(Math.random() * 3) + 1;
  const lineItems = [{ id: `li_${id}_1`, productId: prod.id, variantId: `v_${prod.id}_0`, title: prod.title, variantTitle: "M", quantity: qty, price: prod.price, image: `https://picsum.photos/seed/${prod.id}/600/800` }];
  const subtotal = +(lineItems.reduce((s, li) => s + li.price * li.quantity, 0)).toFixed(2);
  const shipping = 5.99;
  const tax = +(subtotal * 0.1).toFixed(2);
  insertOrder.run({
    id,
    order_number: `#${1000 + i}`,
    customer_id: cust.id,
    email: cust.email,
    status,
    financial_status: status === "fulfilled" ? "paid" : status === "cancelled" ? "refunded" : "pending",
    fulfillment_status: status === "fulfilled" ? "fulfilled" : "unfulfilled",
    subtotal,
    shipping,
    tax,
    total: +(subtotal + shipping + tax).toFixed(2),
    currency: "USD",
    shipping_address: j({ city: "Baghdad", country: "Iraq", firstName: cust.first_name, lastName: cust.last_name }),
    line_items: j(lineItems),
    note: "",
    tags: j([]),
    is_draft: isDraft,
    is_abandoned: isAbandoned,
    created_at: iso(i * 2),
    updated_at: iso(i),
  });
}

// ─── Seed: Discounts ──────────────────────────────────────────────────────────

const insertDiscount = db.prepare(`
  INSERT INTO discounts (id,code,type,value,usage_count,usage_limit,starts_at,ends_at,status)
  VALUES (@id,@code,@type,@value,@usage_count,@usage_limit,@starts_at,@ends_at,@status)
`);
[
  { id: "disc1", code: "MORA20",   type: "percentage",  value: 20, usage_count: 34, usage_limit: 100, starts_at: iso(30), ends_at: null,     status: "active" },
  { id: "disc2", code: "WELCOME10",type: "fixed_amount", value: 10, usage_count: 12, usage_limit: 50,  starts_at: iso(60), ends_at: iso(-30), status: "active" },
  { id: "disc3", code: "FREESHIP", type: "free_shipping",value: 0,  usage_count: 8,  usage_limit: null,starts_at: iso(10), ends_at: null,     status: "active" },
].forEach((d) => insertDiscount.run(d));

// ─── Seed: Campaigns ──────────────────────────────────────────────────────────

const insertCampaign = db.prepare(`
  INSERT INTO campaigns (id,title,type,status,budget,spent,impressions,clicks,conversions,created_at)
  VALUES (@id,@title,@type,@status,@budget,@spent,@impressions,@clicks,@conversions,@created_at)
`);
[
  { id: "camp1", title: "Summer Collection Launch", type: "email",  status: "active", budget: 500, spent: 312, impressions: 45000, clicks: 2300, conversions: 87, created_at: iso(20) },
  { id: "camp2", title: "Instagram Sale Promo",     type: "social", status: "active", budget: 300, spent: 180, impressions: 28000, clicks: 1200, conversions: 45, created_at: iso(15) },
  { id: "camp3", title: "New In Email Blast",       type: "email",  status: "paused", budget: 200, spent: 200, impressions: 18000, clicks: 980,  conversions: 32, created_at: iso(40) },
].forEach((c) => insertCampaign.run(c));

// ─── Seed: Blog posts ─────────────────────────────────────────────────────────

const insertPost = db.prepare(`
  INSERT INTO blog_posts (id,title,handle,author,body,excerpt,tags,status,published_at,created_at)
  VALUES (@id,@title,@handle,@author,@body,@excerpt,@tags,@status,@published_at,@created_at)
`);
[
  { id: "post1", title: "How to Style an Oversized Blazer", handle: "style-oversized-blazer", author: "Mora Team",   body: "The oversized blazer is one of the most versatile pieces in your wardrobe...", excerpt: "Five ways to style the season's most wanted piece.", tags: j(["style","tips"]),      status: "published", published_at: iso(5),  created_at: iso(7)  },
  { id: "post2", title: "Top Skincare Ingredients",         handle: "skincare-ingredients",    author: "Mora Beauty", body: "When it comes to skincare, ingredients matter more than branding...",       excerpt: "A guide to reading your skincare labels.",              tags: j(["beauty","skincare"]),status: "published", published_at: iso(12), created_at: iso(14) },
  { id: "post3", title: "Men's Style Essentials 2026",      handle: "mens-style-2026",         author: "Mora Team",   body: "Building a wardrobe that works for every occasion doesn't have to be complicated...", excerpt: "The 10 pieces every man needs this year.", tags: j(["men","style"]),       status: "draft",     published_at: null,   created_at: iso(2)  },
].forEach((p) => insertPost.run(p));

// ─── Seed: Menus ──────────────────────────────────────────────────────────────

const insertMenu = db.prepare(`INSERT INTO menus (id,title,handle,items) VALUES (@id,@title,@handle,@items)`);
insertMenu.run({ id: "menu1", title: "Main Navigation", handle: "main-menu", items: j([
  { id: "mi1", title: "New In",  url: "/collections/new-in",  children: [] },
  { id: "mi2", title: "Women",   url: "/collections/women",   children: [
    { id: "mi2a", title: "Clothing",     url: "/collections/women-clothing",     children: [] },
    { id: "mi2b", title: "Accessories",  url: "/collections/women-accessories",  children: [] },
  ]},
  { id: "mi3", title: "Men",    url: "/collections/men",    children: [] },
  { id: "mi4", title: "Beauty", url: "/collections/beauty", children: [] },
  { id: "mi5", title: "Sale",   url: "/collections/sale",   children: [] },
]) });
insertMenu.run({ id: "menu2", title: "Footer", handle: "footer-menu", items: j([
  { id: "fi1", title: "About Us", url: "/pages/about",   children: [] },
  { id: "fi2", title: "Contact",  url: "/pages/contact", children: [] },
  { id: "fi3", title: "Returns",  url: "/pages/returns", children: [] },
]) });

// ─── Seed: Markets ────────────────────────────────────────────────────────────

const insertMarket = db.prepare(`INSERT INTO markets (id,name,countries,currency,status,created_at) VALUES (@id,@name,@countries,@currency,@status,@created_at)`);
[
  { id: "mkt1", name: "United Kingdom", countries: j(["GB"]),             currency: "GBP", status: "active",   created_at: iso(90) },
  { id: "mkt2", name: "Middle East",    countries: j(["IQ","SA","AE","KW"]), currency: "USD", status: "active",   created_at: iso(60) },
  { id: "mkt3", name: "Europe",         countries: j(["DE","FR","IT","ES"]), currency: "EUR", status: "inactive", created_at: iso(45) },
].forEach((m) => insertMarket.run(m));

// ─── Seed: Settings ───────────────────────────────────────────────────────────

const insertSetting = db.prepare(`INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)`);
const DEFAULT_SETTINGS = {
  name: "Mora Store",
  email: "hello@mora.store",
  phone: "+44 20 1234 5678",
  currency: "GBP",
  timezone: "Europe/London",
  weightUnit: "kg",
  address: { line1: "123 Fashion Street", city: "London", country: "United Kingdom", zip: "E1 6QA" },
  checkoutDomain: "checkout.mora.store",
  shippingMethods: [
    { id: "standard", label: "Standard Shipping", duration: "5–7 business days", price: 0 },
    { id: "express", label: "Express Shipping", duration: "2–3 business days", price: 9.99 },
  ],
  tax: {
    enabled: true,
    inclusive: false,
    regions: [
      { id: "tax_iraq", region: "Iraq", rate: 15 },
      { id: "tax_uae", region: "UAE", rate: 5 },
    ],
  },
  locations: [
    { id: "loc_hq", name: "Mora HQ — Baghdad", address: "Al-Mansour District, Baghdad, Iraq", primary: true },
  ],
  notifications: {
    newOrder: true,
    orderFulfilled: true,
    orderRefunded: true,
    lowInventory: false,
    newCustomer: false,
    abandonedCart: false,
  },
  paymentMethods: { card: true, cod: true, applePay: false, paypal: false },
};
insertSetting.run("store", j(DEFAULT_SETTINGS));
} // ── end seed block 1 ─────────────────────────────────────────────────────────

// ─── Query helpers (typed row → JS object) ────────────────────────────────────

type Row = Record<string, unknown>;

function parseRow(row: Row): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) {
    const camel = k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    if (typeof v === "string" && (v.startsWith("{") || v.startsWith("["))) {
      try { out[camel] = JSON.parse(v); continue; } catch { /* fall through */ }
    }
    out[camel] = v;
  }
  return out;
}

export function parseRows(rows: Row[]): Row[] {
  return rows.map(parseRow);
}

export function parseOne(row: Row | undefined): Row | null {
  return row ? parseRow(row) : null;
}

// ─── Analytics helpers ────────────────────────────────────────────────────────

export function getAnalyticsSummary() {
  const rows = db.prepare(`SELECT subtotal, total FROM orders WHERE is_draft=0 AND is_abandoned=0`).all() as Row[];
  const revenue = rows.reduce((s, r) => s + ((r["subtotal"] as number) || 0), 0);
  const orders = rows.length;
  const returningCount = ((db.prepare(
    `SELECT COUNT(*) as n FROM (SELECT customer_id FROM orders WHERE is_draft=0 AND is_abandoned=0 AND customer_id IS NOT NULL GROUP BY customer_id HAVING COUNT(*)>1)`
  ).get() as Row)["n"] as number) || 0;
  const totalUnique = ((db.prepare(
    `SELECT COUNT(DISTINCT customer_id) as n FROM orders WHERE is_draft=0 AND is_abandoned=0 AND customer_id IS NOT NULL`
  ).get() as Row)["n"] as number) || 0;
  return {
    revenue: Math.round(revenue),
    orders,
    customers: (db.prepare(`SELECT COUNT(*) as n FROM customers`).get() as Row)["n"],
    avgOrderValue: orders ? Math.round(revenue / orders) : 0,
    returningCustomerRate: totalUnique > 0 ? +((returningCount / totalUnique) * 100).toFixed(1) : 0,
  };
}

export function getRevenueByDay(days = 14) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 86_400_000);
    const dateStr = d.toISOString().substring(0, 10);
    const row = db.prepare(
      `SELECT COALESCE(SUM(subtotal),0) as rev, COUNT(*) as cnt FROM orders WHERE is_draft=0 AND is_abandoned=0 AND substr(created_at,1,10)=?`
    ).get(dateStr) as Row;
    return {
      date: dateStr,
      revenue: Math.round((row["rev"] as number) || 0),
      orders: (row["cnt"] as number) || 0,
    };
  });
}

export function getTopProducts(limit = 5) {
  const orderRows = db.prepare(`SELECT line_items FROM orders WHERE is_draft=0 AND is_abandoned=0`).all() as Row[];
  const map = new Map<string, { id: string; title: string; unitsSold: number; revenue: number }>();
  for (const order of orderRows) {
    try {
      const items = JSON.parse((order["line_items"] as string) || "[]") as Array<{productId?: string; title: string; quantity: number; price: number}>;
      for (const item of items) {
        const key = item.productId || item.title;
        const ex = map.get(key) || { id: item.productId || key, title: item.title, unitsSold: 0, revenue: 0 };
        ex.unitsSold += item.quantity || 0;
        ex.revenue   += (item.price || 0) * (item.quantity || 0);
        map.set(key, ex);
      }
    } catch { /* skip malformed */ }
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

export function getAnalyticsForRange(from: string, to: string) {
  const orders = db.prepare(
    `SELECT * FROM orders WHERE is_draft=0 AND is_abandoned=0 AND substr(created_at,1,10)>=? AND substr(created_at,1,10)<=?`
  ).all(from, to) as Row[];

  const grossSales     = orders.reduce((s, o) => s + ((o["subtotal"] as number) || 0), 0);
  const shippingTotal  = orders.reduce((s, o) => s + ((o["shipping"]  as number) || 0), 0);
  const taxTotal       = orders.reduce((s, o) => s + ((o["tax"]       as number) || 0), 0);
  const totalSales     = orders.reduce((s, o) => s + ((o["total"]     as number) || 0), 0);
  const orderCount     = orders.length;
  const ordersFulfilled = orders.filter(o => o["fulfillment_status"] === "fulfilled").length;

  // Returning customer rate (store-wide: customers with >1 total order)
  const returningCount = ((db.prepare(
    `SELECT COUNT(*) as n FROM (SELECT customer_id FROM orders WHERE is_draft=0 AND is_abandoned=0 AND customer_id IS NOT NULL GROUP BY customer_id HAVING COUNT(*)>1)`
  ).get() as Row)["n"] as number) || 0;
  const totalUnique = ((db.prepare(
    `SELECT COUNT(DISTINCT customer_id) as n FROM orders WHERE is_draft=0 AND is_abandoned=0 AND customer_id IS NOT NULL`
  ).get() as Row)["n"] as number) || 0;
  const returningRate = totalUnique > 0 ? +((returningCount / totalUnique) * 100).toFixed(1) : 0;

  // Daily breakdown for the range
  const fromMs = new Date(from).getTime();
  const toMs   = new Date(to  ).getTime();
  const days   = Math.max(1, Math.round((toMs - fromMs) / 86_400_000) + 1);
  const salesOverTime = Array.from({ length: days }, (_, i) => {
    const d = new Date(fromMs + i * 86_400_000);
    const ds = d.toISOString().substring(0, 10);
    const dayOrders = orders.filter(o => (o["created_at"] as string).startsWith(ds));
    return {
      date: ds,
      revenue: Math.round(dayOrders.reduce((s, o) => s + ((o["subtotal"] as number) || 0), 0)),
      orders:  dayOrders.length,
    };
  });

  // Hourly breakdown (only meaningful if from===to, i.e. single day)
  const pad = (n: number) => String(n).padStart(2, "0");
  const hourlyBreakdown = Array.from({ length: 24 }, (_, h) => {
    const label = h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
    const hStr  = `${from}T${pad(h)}:`;
    const dayOrders = orders.filter(o => (o["created_at"] as string).startsWith(hStr));
    return {
      time: label,
      revenue: Math.round(dayOrders.reduce((s, o) => s + ((o["subtotal"] as number) || 0), 0)),
    };
  });

  // Sales by product (parse line_items JSON)
  const productMap = new Map<string, { title: string; units: number; revenue: number }>();
  for (const order of orders) {
    try {
      const items = JSON.parse((order["line_items"] as string) || "[]") as Array<{title: string; quantity: number; price: number}>;
      for (const item of items) {
        const ex = productMap.get(item.title) || { title: item.title, units: 0, revenue: 0 };
        ex.units   += item.quantity || 0;
        ex.revenue += (item.price || 0) * (item.quantity || 0);
        productMap.set(item.title, ex);
      }
    } catch { /* skip */ }
  }
  const salesByProduct = [...productMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  // Products by sell-through rate (from products.sold_count)
  const allProds = db.prepare(`SELECT title, price, sold_count FROM products WHERE status='active' ORDER BY sold_count DESC LIMIT 10`).all() as Row[];
  const sellThrough = allProds.map(p => ({
    title:     p["title"] as string,
    soldCount: (p["sold_count"] as number) || 0,
    revenue:   Math.round(((p["price"] as number) || 0) * ((p["sold_count"] as number) || 0)),
  }));

  // Customer cohort retention (last 6 cohort months)
  const cohortRows = db.prepare(`
    SELECT substr(c.created_at,1,7) AS cohort,
           COUNT(DISTINCT c.id)            AS total,
           COUNT(DISTINCT o.customer_id)   AS returned
    FROM customers c
    LEFT JOIN orders o ON o.customer_id=c.id AND o.is_draft=0 AND o.is_abandoned=0
    GROUP BY cohort ORDER BY cohort DESC LIMIT 6
  `).all() as Row[];
  const cohort = cohortRows.map(r => ({
    month:    (r["cohort"]   as string) || "",
    total:    (r["total"]    as number) || 0,
    returned: (r["returned"] as number) || 0,
    rate:     (r["total"] as number) > 0
      ? +((((r["returned"] as number) || 0) / ((r["total"] as number) || 1)) * 100).toFixed(1)
      : 0,
  }));

  return {
    grossSales:              Math.round(grossSales),
    returningCustomerRate:   returningRate,
    ordersFulfilled,
    orders:                  orderCount,
    avgOrderValue:           orderCount > 0 ? Math.round(grossSales / orderCount) : 0,
    totalSalesBreakdown: {
      grossSales:    Math.round(grossSales),
      discounts:     0,
      returns:       0,
      netSales:      Math.round(grossSales),
      shippingCharges: Math.round(shippingTotal),
      returnFees:    0,
      taxes:         Math.round(taxTotal),
      totalSales:    Math.round(totalSales),
    },
    salesOverTime,
    hourlyBreakdown,
    salesByProduct,
    sellThrough,
    cohort,
  };
}

if (needsSeed) {
// ─── Seed: Story Rows & Items ─────────────────────────────────────────────────

const insertStoryRow = db.prepare(
  `INSERT INTO story_rows (id, title, sort_order, status, created_at) VALUES (?,?,?,?,?)`
);
const insertStoryItem = db.prepare(
  `INSERT INTO story_items (id, row_id, title, image_url, link_url, sort_order, status, created_at) VALUES (?,?,?,?,?,?,?,?)`
);

const storyNow = new Date().toISOString();

const seedRows = [
  { id: "srow1", title: "", sort_order: 0 },
  { id: "srow2", title: "", sort_order: 1 },
  { id: "srow3", title: "", sort_order: 2 },
];
for (const r of seedRows) {
  insertStoryRow.run(r.id, r.title, r.sort_order, "active", storyNow);
}

const seedItems = [
  // Row 1
  { id: "si001", row: "srow1", title: "Tops",       img: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200&h=200&fit=crop", link: "/products?category=women", order: 0 },
  { id: "si002", row: "srow1", title: "T-shirts",   img: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=200&h=200&fit=crop", link: "/products?category=men",   order: 1 },
  { id: "si003", row: "srow1", title: "Suits",      img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop", link: "/products?category=men",   order: 2 },
  { id: "si004", row: "srow1", title: "Bottoms",    img: "https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?w=200&h=200&fit=crop", link: "/products?category=women", order: 3 },
  { id: "si005", row: "srow1", title: "Hoodies",    img: "https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=200&h=200&fit=crop", link: "/products?category=men",   order: 4 },
  { id: "si006", row: "srow1", title: "Jackets",    img: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=200&h=200&fit=crop", link: "/products?category=women", order: 5 },
  // Row 2
  { id: "si007", row: "srow2", title: "Denim",      img: "https://images.unsplash.com/photo-1475178626620-a4d074967452?w=200&h=200&fit=crop", link: "/products?category=women", order: 0 },
  { id: "si008", row: "srow2", title: "Co-ords",    img: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200&h=200&fit=crop", link: "/products?category=women", order: 1 },
  { id: "si009", row: "srow2", title: "Shirts",     img: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=200&h=200&fit=crop", link: "/products?category=men",   order: 2 },
  { id: "si010", row: "srow2", title: "Outerwear",  img: "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=200&h=200&fit=crop", link: "/products?category=men",   order: 3 },
  { id: "si011", row: "srow2", title: "Swimwear",   img: "https://images.unsplash.com/photo-1570303345338-e1f0eddf4946?w=200&h=200&fit=crop", link: "/products?category=women", order: 4 },
  { id: "si012", row: "srow2", title: "Shorts",     img: "https://images.unsplash.com/photo-1591195853828-11db59a44f43?w=200&h=200&fit=crop", link: "/products?category=men",   order: 5 },
  // Row 3
  { id: "si013", row: "srow3", title: "Beauty",     img: "https://images.unsplash.com/photo-1596462502278-27bf85033e5a?w=200&h=200&fit=crop", link: "/products?category=beauty", order: 0 },
  { id: "si014", row: "srow3", title: "New In",     img: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=200&h=200&fit=crop", link: "/products?category=new_in", order: 1 },
  { id: "si015", row: "srow3", title: "Sale",       img: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=200&h=200&fit=crop", link: "/products?category=sale",   order: 2 },
  { id: "si016", row: "srow3", title: "Accessories",img: "https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?w=200&h=200&fit=crop", link: "/products",                 order: 3 },
  { id: "si017", row: "srow3", title: "Bags",       img: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=200&h=200&fit=crop", link: "/products",                 order: 4 },
  { id: "si018", row: "srow3", title: "Shoes",      img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop", link: "/products",                 order: 5 },
];

for (const item of seedItems) {
  insertStoryItem.run(item.id, item.row, item.title, item.img, item.link, item.order, "active", storyNow);
}

// ─── Seed: Content Sections ───────────────────────────────────────────────────

const insertContentSection = db.prepare(
  `INSERT INTO content_sections (id, key, title, items, sort_order, status, updated_at) VALUES (?,?,?,?,?,?,?)`
);

const csNow = new Date().toISOString();
[
  {
    id: "cs_warranty",
    key: "warranty",
    title: "WARRANTY",
    items: JSON.stringify([
      { id: "w0", text: "Mora warranty covers exchange & return — the item must be unused 💙" },
      { id: "w1", text: "Silver Warranty — 7 days\nExchange & return (5,000 IQD fee)" },
      { id: "w2", text: "Gold Warranty — 15 days\nFree exchange & return for Star Customers (total purchases ≥ 200,000 IQD ⭐)" },
      { id: "w3", text: "You can upgrade to Gold Warranty for your order for an extra 4,000 IQD" },
    ]),
    sort_order: 0,
  },
  {
    id: "cs_testimonials",
    key: "testimonials",
    title: "STAR CUSTOMERS ⭐",
    items: JSON.stringify([
      { id: "sc0", text: "Star tier for our premium customers — total purchases of 200,000 IQD or more ⭐" },
      { id: "sc1", text: "Star Perks:" },
      { id: "sc2", text: "• Free exchange & return (15-day Gold Warranty)" },
      { id: "sc3", text: "• Priority customer support" },
      { id: "sc4", text: "• Exclusive member discounts & early access" },
    ]),
    sort_order: 1,
  },
].forEach(({ id, key, title, items, sort_order }) => {
  insertContentSection.run(id, key, title, items, sort_order, "active", csNow);
});
} // ── end seed block 2 ─────────────────────────────────────────────────────────

// ─── Activity Log seed (idempotent — runs once when table is empty) ───────────

{
  const empty = ((db.prepare("SELECT COUNT(*) as n FROM activity_log").get() as Row)["n"] as number) === 0;
  if (empty) {
    const ins = db.prepare(`INSERT OR IGNORE INTO activity_log (id,action,category,entity_type,entity_id,entity_title,actor,metadata,created_at) VALUES (?,?,?,?,?,?,?,?,?)`);
    const seedActs = db.transaction(() => {
      // Orders
      for (const o of (db.prepare("SELECT * FROM orders WHERE is_draft=0").all() as Row[])) {
        const num = o["order_number"] as string;
        const cr  = o["created_at"]   as string;
        const tot = o["total"]        as number;
        ins.run(`s_oc_${o["id"]}`, "order.created",          "Orders", "order", o["id"], `Order ${num}`, "Admin",
          JSON.stringify({ orderNumber: num, email: o["email"], total: tot, status: o["status"] }), cr);
        if (o["financial_status"] === "paid" || o["status"] === "processing") {
          ins.run(`s_op_${o["id"]}`, "order.payment_received", "Orders", "order", o["id"], `Order ${num}`, "System",
            JSON.stringify({ orderNumber: num, amount: tot }), new Date(new Date(cr).getTime() + 900_000).toISOString());
        }
        if (o["fulfillment_status"] === "fulfilled") {
          ins.run(`s_of_${o["id"]}`, "order.fulfilled",        "Orders", "order", o["id"], `Order ${num}`, "Admin",
            JSON.stringify({ orderNumber: num, email: o["email"] }), new Date(new Date(cr).getTime() + 10_800_000).toISOString());
        }
        if ((o["status"] as string) === "cancelled") {
          ins.run(`s_ocan_${o["id"]}`, "order.cancelled",     "Orders", "order", o["id"], `Order ${num}`, "Admin",
            JSON.stringify({ orderNumber: num }), new Date(new Date(cr).getTime() + 21_600_000).toISOString());
        }
        if (o["financial_status"] === "refunded") {
          ins.run(`s_oref_${o["id"]}`, "order.refunded",      "Orders", "order", o["id"], `Order ${num}`, "Admin",
            JSON.stringify({ orderNumber: num, amount: tot }), new Date(new Date(cr).getTime() + 43_200_000).toISOString());
        }
      }
      // Products
      for (const p of (db.prepare("SELECT * FROM products").all() as Row[])) {
        const title = p["title"] as string;
        const cr    = p["created_at"] as string;
        ins.run(`s_pc_${p["id"]}`, "product.created",   "Products", "product", p["id"], title, "Admin",
          JSON.stringify({ title, price: p["price"], category: p["category"], status: p["status"] }), cr);
        if (p["status"] === "active") {
          ins.run(`s_pp_${p["id"]}`, "product.published", "Products", "product", p["id"], title, "Admin",
            JSON.stringify({ title, price: p["price"] }), new Date(new Date(cr).getTime() + 1_800_000).toISOString());
        }
      }
      // Customers
      for (const c of (db.prepare("SELECT * FROM customers").all() as Row[])) {
        const name = `${c["first_name"]} ${c["last_name"]}`;
        ins.run(`s_cuc_${c["id"]}`, "customer.registered", "Customers", "customer", c["id"], name, "System",
          JSON.stringify({ name, email: c["email"], phone: c["phone"] }), c["created_at"]);
      }
      // Discounts
      for (const d of (db.prepare("SELECT * FROM discounts").all() as Row[])) {
        const code = (d["code"] as string) || (d["title"] as string);
        ins.run(`s_dc_${d["id"]}`, "discount.created", "Discounts", "discount", d["id"], code, "Admin",
          JSON.stringify({ code, type: d["type"], value: d["value"], status: d["status"] }), d["created_at"]);
      }
      // Collections
      for (const c of (db.prepare("SELECT * FROM collections").all() as Row[])) {
        ins.run(`s_cc_${c["id"]}`, "collection.created", "Collections", "collection", c["id"], c["title"] as string, "Admin",
          JSON.stringify({ title: c["title"] }), c["created_at"]);
      }
      // Blog posts
      for (const b of (db.prepare("SELECT * FROM blog_posts").all() as Row[])) {
        const act = (b["status"] as string) === "published" ? "blog.published" : "blog.drafted";
        ins.run(`s_bc_${b["id"]}`, act, "Blog", "blog_post", b["id"], b["title"] as string, "Admin",
          JSON.stringify({ title: b["title"], status: b["status"] }), b["created_at"]);
      }
    });
    seedActs();
  }
}

// ─── Activity log helpers ─────────────────────────────────────────────────────

export function logActivity(
  action: string, category: string, entityType: string,
  entityId: string | null, entityTitle: string,
  actor = "Admin", metadata: Record<string, unknown> = {}
) {
  try {
    db.prepare(`INSERT INTO activity_log (id,action,category,entity_type,entity_id,entity_title,actor,metadata,created_at) VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(`act_${Date.now()}_${Math.random().toString(36).substring(2,8)}`,
        action, category, entityType, entityId, entityTitle, actor,
        JSON.stringify(metadata), new Date().toISOString());
  } catch { /* non-blocking */ }
}

export function getActivityLog(limit = 50, offset = 0, category?: string, search?: string) {
  const conds: string[] = [];
  const ps: (string | number)[] = [];
  if (category && category !== "all") { conds.push("category=?"); ps.push(category); }
  if (search) {
    conds.push("(entity_title LIKE ? OR action LIKE ? OR actor LIKE ?)");
    const s = `%${search}%`; ps.push(s, s, s);
  }
  const where = conds.length ? " WHERE " + conds.join(" AND ") : "";
  const rows  = db.prepare(`SELECT * FROM activity_log${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...ps, limit, offset) as Row[];
  const total = ((db.prepare(`SELECT COUNT(*) as n FROM activity_log${where}`).get(...ps) as Row)["n"]) as number;
  return {
    total,
    items: rows.map(r => ({
      id:          r["id"]           as string,
      action:      r["action"]       as string,
      category:    r["category"]     as string,
      entityType:  r["entity_type"]  as string,
      entityId:    r["entity_id"]    as string | null,
      entityTitle: r["entity_title"] as string,
      actor:       r["actor"]        as string,
      metadata:    (() => { try { return JSON.parse(r["metadata"] as string || "{}"); } catch { return {}; } })() as Record<string, unknown>,
      createdAt:   r["created_at"]   as string,
    })),
  };
}

// ─── Migrations: add columns to existing DBs without losing data ──────────────
// SQLite does not support IF NOT EXISTS in ALTER TABLE, so we catch errors.
const runMigration = (sql: string) => {
  try { db.exec(sql); } catch { /* column likely already exists */ }
};
runMigration(`ALTER TABLE orders ADD COLUMN live_activity_push_token TEXT`);
runMigration(`ALTER TABLE orders ADD COLUMN delivery_stage TEXT NOT NULL DEFAULT 'confirmed'`);
runMigration(`ALTER TABLE orders ADD COLUMN delivery_type TEXT NOT NULL DEFAULT 'standard'`);
runMigration(`ALTER TABLE orders ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'cod'`);
runMigration(`ALTER TABLE products ADD COLUMN gender TEXT NOT NULL DEFAULT 'all'`);
runMigration(`ALTER TABLE story_items ADD COLUMN gender TEXT NOT NULL DEFAULT 'all'`);
runMigration(`ALTER TABLE story_items ADD COLUMN collection_id TEXT`);
runMigration(`ALTER TABLE customers ADD COLUMN live_activity_pts_token TEXT`);
runMigration(`ALTER TABLE discounts ADD COLUMN min_subtotal REAL`);
runMigration(`ALTER TABLE discounts ADD COLUMN min_items INTEGER`);
runMigration(`ALTER TABLE discounts ADD COLUMN max_discount REAL`);
runMigration(`ALTER TABLE orders ADD COLUMN discount_code TEXT`);
runMigration(`ALTER TABLE orders ADD COLUMN discount_amount REAL NOT NULL DEFAULT 0`);
runMigration(`ALTER TABLE orders ADD COLUMN review_rating INTEGER`);
runMigration(`ALTER TABLE orders ADD COLUMN review_text TEXT`);

// ─── In-app notifications per customer ────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS customer_notifications (
    id          TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    title       TEXT NOT NULL DEFAULT '',
    body        TEXT NOT NULL DEFAULT '',
    image_url   TEXT NOT NULL DEFAULT '',
    url         TEXT NOT NULL DEFAULT '',
    read        INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_cn_customer ON customer_notifications(customer_id);
  CREATE INDEX IF NOT EXISTS idx_cn_created ON customer_notifications(created_at DESC);
`);

// Seed default menu_tabs content section if not yet created
{
  const existing = db.prepare(`SELECT id FROM content_sections WHERE key='menu_tabs'`).get();
  if (!existing) {
    const defaultTabs = JSON.stringify([
      { id: "tab_all",    label: "ALL",     filterType: "all" },
      { id: "tab_women",  label: "WOMEN",   filterType: "gender",   filterValue: "women" },
      { id: "tab_men",    label: "MEN",     filterType: "gender",   filterValue: "men" },
      { id: "tab_beauty", label: "BEAUTY",  filterType: "category", filterValue: "beauty" },
      { id: "tab_sale",   label: "SALE",    filterType: "sale" },
      { id: "tab_foryou", label: "FOR YOU", filterType: "foryou" },
    ]);
    db.prepare(`INSERT INTO content_sections (id,key,title,items,sort_order,status,updated_at) VALUES (?,?,?,?,?,?,?)`)
      .run("cs_menu_tabs", "menu_tabs", "Menu Tab Bar", defaultTabs, 0, "active", new Date().toISOString());
  }
}

// Seed default search_collections (the BROWSE grid on the search page)
{
  const existing = db.prepare(`SELECT id FROM content_sections WHERE key='search_collections'`).get();
  if (!existing) {
    const defaults = JSON.stringify([
      { id: "sc_women",  nameEn: "Women",  nameAr: "نساء",    icon: "user",         color: "#F5EBF5", linkType: "gender",   linkValue: "women" },
      { id: "sc_men",    nameEn: "Men",    nameAr: "رجال",    icon: "user",         color: "#EBF0F5", linkType: "gender",   linkValue: "men" },
      { id: "sc_beauty", nameEn: "Beauty", nameAr: "تجميل",   icon: "droplet",      color: "#F5F0EB", linkType: "category", linkValue: "beauty" },
      { id: "sc_shoes",  nameEn: "Shoes",  nameAr: "أحذية",   icon: "box",          color: "#EBF5F0", linkType: "category", linkValue: "shoes" },
      { id: "sc_bags",   nameEn: "Bags",   nameAr: "حقائب",   icon: "shopping-bag", color: "#F5EBEB", linkType: "category", linkValue: "bags" },
      { id: "sc_sale",   nameEn: "Sale",   nameAr: "تخفيضات", icon: "tag",          color: "#FFF3E0", linkType: "sale",     linkValue: "" },
    ]);
    db.prepare(`INSERT INTO content_sections (id,key,title,items,sort_order,status,updated_at) VALUES (?,?,?,?,?,?,?)`)
      .run("cs_search_collections", "search_collections", "Search Collections", defaults, 1, "active", new Date().toISOString());
  }
}

// Seed default trending keywords (search page chips)
{
  const existing = db.prepare(`SELECT id FROM content_sections WHERE key='trending'`).get();
  if (!existing) {
    const defaults = JSON.stringify(
      ["Blazer", "Linen", "Dress", "Sandals", "Jeans", "Silk"].map((label, i) => ({ id: `tr_${i}`, label }))
    );
    db.prepare(`INSERT INTO content_sections (id,key,title,items,sort_order,status,updated_at) VALUES (?,?,?,?,?,?,?)`)
      .run("cs_trending", "trending", "Trending Keywords", defaults, 2, "active", new Date().toISOString());
  }
}

// ─── Chat push notification links ────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS chat_conversation_links (
    conversation_id INTEGER PRIMARY KEY,
    customer_id     TEXT NOT NULL,
    created_at      TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_ccl_customer ON chat_conversation_links(customer_id);
`);

// ─── Shipping: per-governorate delivery pricing + free-delivery rules ──────────
db.exec(`
  CREATE TABLE IF NOT EXISTS shipping_zones (
    id             TEXT PRIMARY KEY,
    governorate    TEXT NOT NULL,
    governorate_ar TEXT NOT NULL DEFAULT '',
    price          REAL NOT NULL DEFAULT 0,
    sort_order     INTEGER NOT NULL DEFAULT 0,
    enabled        INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS shipping_rules (
    id         TEXT PRIMARY KEY,
    text_en    TEXT NOT NULL DEFAULT '',
    text_ar    TEXT NOT NULL DEFAULT '',
    threshold  REAL,
    enabled    INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
`);

// Seed the 18 Iraqi governorates once (independent of the product seed so an
// existing production DB also gets them on first deploy of this feature).
{
  const n = (db.prepare(`SELECT COUNT(*) AS n FROM shipping_zones`).get() as { n: number }).n;
  if (n === 0) {
    const govs: Array<[string, string, number]> = [
      ["Baghdad", "بغداد", 4000],
      ["Basra", "البصرة", 6000],
      ["Nineveh", "نينوى", 6000],
      ["Erbil", "أربيل", 6000],
      ["Kirkuk", "كركوك", 5000],
      ["Najaf", "النجف", 5000],
      ["Karbala", "كربلاء", 5000],
      ["Babil", "بابل", 5000],
      ["Diyala", "ديالى", 5000],
      ["Anbar", "الأنبار", 6000],
      ["Dhi Qar", "ذي قار", 6000],
      ["Maysan", "ميسان", 6000],
      ["Muthanna", "المثنى", 6000],
      ["Diwaniyah", "الديوانية", 5000],
      ["Wasit", "واسط", 5000],
      ["Saladin", "صلاح الدين", 5000],
      ["Dohuk", "دهوك", 7000],
      ["Sulaymaniyah", "السليمانية", 7000],
    ];
    const ins = db.prepare(
      `INSERT INTO shipping_zones (id,governorate,governorate_ar,price,sort_order,enabled) VALUES (?,?,?,?,?,1)`,
    );
    govs.forEach((g, i) => ins.run(`sz_${i + 1}`, g[0], g[1], g[2], i));
  }
}

// Seed one default free-delivery rule once.
{
  const n = (db.prepare(`SELECT COUNT(*) AS n FROM shipping_rules`).get() as { n: number }).n;
  if (n === 0) {
    db.prepare(
      `INSERT INTO shipping_rules (id,text_en,text_ar,threshold,enabled,sort_order,created_at) VALUES (?,?,?,?,?,?,?)`,
    ).run(
      "sr_1",
      "Free delivery on orders over 100,000 IQD",
      "توصيل مجاني للطلبات فوق 100,000 دينار",
      100000,
      1,
      0,
      new Date().toISOString(),
    );
  }
}

// ─── Sale Collections (home page promotional cards) ───────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS sale_collections (
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL DEFAULT '',
    title_ar        TEXT NOT NULL DEFAULT '',
    description     TEXT NOT NULL DEFAULT '',
    description_ar  TEXT NOT NULL DEFAULT '',
    image           TEXT NOT NULL DEFAULT '',
    sort_order      INTEGER NOT NULL DEFAULT 0,
    active          INTEGER NOT NULL DEFAULT 1,
    condition_type  TEXT NOT NULL DEFAULT 'manual',
    condition_value TEXT NOT NULL DEFAULT '',
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sale_collection_products (
    collection_id TEXT NOT NULL,
    product_id    TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sort_order    INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (collection_id, product_id)
  );
`);

export default db;
