// In-memory SQLite database using better-sqlite3.
// All data lives in :memory: — resets on restart, loads seed data instantly.

import Database from "better-sqlite3";

export const db = new Database(":memory:");

// ─── Schema ───────────────────────────────────────────────────────────────────

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE products (
    id            TEXT PRIMARY KEY,
    title         TEXT NOT NULL,
    vendor        TEXT NOT NULL,
    category      TEXT NOT NULL,
    description   TEXT NOT NULL DEFAULT '',
    price         REAL NOT NULL,
    compare_price REAL,
    images        TEXT NOT NULL DEFAULT '[]',
    tags          TEXT NOT NULL DEFAULT '[]',
    status        TEXT NOT NULL DEFAULT 'active',
    sold_count    INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
  );

  CREATE TABLE special_collection_items (
    collection_slug TEXT NOT NULL,
    product_id      TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL,
    PRIMARY KEY (collection_slug, product_id)
  );

  CREATE TABLE variants (
    id            TEXT PRIMARY KEY,
    product_id    TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    sku           TEXT NOT NULL,
    price         REAL NOT NULL,
    compare_price REAL,
    inventory     INTEGER NOT NULL DEFAULT 0,
    option1       TEXT,
    option2       TEXT
  );

  CREATE TABLE collections (
    id             TEXT PRIMARY KEY,
    title          TEXT NOT NULL,
    description    TEXT NOT NULL DEFAULT '',
    image          TEXT NOT NULL DEFAULT '',
    products_count INTEGER NOT NULL DEFAULT 0,
    created_at     TEXT NOT NULL
  );

  CREATE TABLE customers (
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
    created_at        TEXT NOT NULL
  );

  CREATE TABLE sessions (
    token       TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    created_at  TEXT NOT NULL
  );

  CREATE TABLE banners (
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

  CREATE TABLE orders (
    id                 TEXT PRIMARY KEY,
    order_number       TEXT NOT NULL,
    customer_id        TEXT,
    email              TEXT NOT NULL DEFAULT '',
    status             TEXT NOT NULL DEFAULT 'pending',
    financial_status   TEXT NOT NULL DEFAULT 'pending',
    fulfillment_status TEXT NOT NULL DEFAULT 'unfulfilled',
    subtotal           REAL NOT NULL DEFAULT 0,
    shipping           REAL NOT NULL DEFAULT 5.99,
    tax                REAL NOT NULL DEFAULT 0,
    total              REAL NOT NULL DEFAULT 0,
    currency           TEXT NOT NULL DEFAULT 'USD',
    shipping_address   TEXT NOT NULL DEFAULT '{}',
    line_items         TEXT NOT NULL DEFAULT '[]',
    note               TEXT NOT NULL DEFAULT '',
    tags               TEXT NOT NULL DEFAULT '[]',
    is_draft           INTEGER NOT NULL DEFAULT 0,
    is_abandoned       INTEGER NOT NULL DEFAULT 0,
    created_at         TEXT NOT NULL,
    updated_at         TEXT NOT NULL
  );

  CREATE TABLE discounts (
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

  CREATE TABLE campaigns (
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

  CREATE TABLE blog_posts (
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

  CREATE TABLE menus (
    id     TEXT PRIMARY KEY,
    title  TEXT NOT NULL,
    handle TEXT NOT NULL UNIQUE,
    items  TEXT NOT NULL DEFAULT '[]'
  );

  CREATE TABLE markets (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    countries  TEXT NOT NULL DEFAULT '[]',
    currency   TEXT NOT NULL DEFAULT 'USD',
    status     TEXT NOT NULL DEFAULT 'inactive',
    created_at TEXT NOT NULL
  );

  CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE story_rows (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    status     TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL
  );

  CREATE TABLE story_items (
    id         TEXT PRIMARY KEY,
    row_id     TEXT NOT NULL REFERENCES story_rows(id) ON DELETE CASCADE,
    title      TEXT NOT NULL DEFAULT '',
    image_url  TEXT NOT NULL DEFAULT '',
    link_url   TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    status     TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL
  );

  CREATE TABLE content_sections (
    id         TEXT PRIMARY KEY,
    key        TEXT UNIQUE NOT NULL,
    title      TEXT NOT NULL DEFAULT '',
    items      TEXT NOT NULL DEFAULT '[]',
    sort_order INTEGER NOT NULL DEFAULT 0,
    status     TEXT NOT NULL DEFAULT 'active',
    updated_at TEXT NOT NULL
  );
`);

// ─── Seed helpers ─────────────────────────────────────────────────────────────

const iso = (daysAgo: number) =>
  new Date(Date.now() - daysAgo * 86_400_000).toISOString();

const j = (v: unknown) => JSON.stringify(v);

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
  INSERT INTO products (id,title,vendor,category,description,price,compare_price,images,tags,status,sold_count,created_at,updated_at)
  VALUES (@id,@title,@vendor,@category,@description,@price,@compare_price,@images,@tags,@status,@sold_count,@created_at,@updated_at)
`);
const insertVariant = db.prepare(`
  INSERT INTO variants (id,product_id,title,sku,price,compare_price,inventory,option1,option2)
  VALUES (@id,@product_id,@title,@sku,@price,@compare_price,@inventory,@option1,@option2)
`);

const SIZES = ["XS", "S", "M", "L", "XL"];

for (const p of seedProducts) {
  insertProduct.run({
    ...p,
    description: `Premium quality ${p.title.toLowerCase()} from ${p.vendor}. Crafted for comfort and style.`,
    images: j([`https://picsum.photos/seed/${p.id}/600/800`]),
    tags: j(p.tags),
    compare_price: p.compare_price ?? null,
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
].forEach(({ days, ...c }) =>
  insertCollection.run({ ...c, image: `https://picsum.photos/seed/${c.id}/800/400`, created_at: iso(days) })
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
};
insertSetting.run("store", j(DEFAULT_SETTINGS));

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
  const rows = db.prepare(`SELECT total, financial_status FROM orders WHERE is_draft=0 AND is_abandoned=0`).all() as Row[];
  const revenue = rows.reduce((s, r) => s + (r["total"] as number), 0);
  const orders = rows.length;
  return {
    revenue: +revenue.toFixed(2),
    orders,
    customers: (db.prepare(`SELECT COUNT(*) as n FROM customers`).get() as Row)["n"],
    avgOrderValue: orders ? +(revenue / orders).toFixed(2) : 0,
    conversion: 3.2,
    visitors: 4_820,
    pageViews: 18_340,
    returnRate: 22.4,
  };
}

export function getRevenueByDay(days = 14) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 86_400_000);
    return {
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      revenue: Math.floor(Math.random() * 600) + 100,
      orders: Math.floor(Math.random() * 12) + 2,
    };
  });
}

export function getTopProducts(limit = 5) {
  const rows = db.prepare(`SELECT id, title, price FROM products LIMIT ?`).all(limit) as Row[];
  return rows.map((p) => ({
    productId: p["id"],
    title: p["title"],
    sold: Math.floor(Math.random() * 80) + 10,
    revenue: +((Math.random() * 80 + 10) * (p["price"] as number)).toFixed(2),
  }));
}

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

export default db;
