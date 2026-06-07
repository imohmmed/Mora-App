// In-memory data store — seeded at startup, resets on restart.
// Replaces SQLite to avoid native-module compilation requirements.

export type Product = {
  id: string;
  title: string;
  vendor: string;
  category: "women" | "men" | "beauty" | "new_in" | "sale";
  description: string;
  price: number;
  compareAtPrice: number | null;
  images: string[];
  tags: string[];
  status: "active" | "draft" | "archived";
  createdAt: string;
  updatedAt: string;
};

export type Variant = {
  id: string;
  productId: string;
  title: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  inventory: number;
  option1: string | null; // size
  option2: string | null; // color
};

export type Collection = {
  id: string;
  title: string;
  description: string;
  image: string;
  productsCount: number;
  createdAt: string;
};

export type Order = {
  id: string;
  orderNumber: string;
  customerId: string | null;
  email: string;
  status: "pending" | "processing" | "fulfilled" | "cancelled" | "refunded";
  financialStatus: "pending" | "paid" | "partially_paid" | "refunded";
  fulfillmentStatus: "unfulfilled" | "fulfilled" | "partially_fulfilled";
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  currency: string;
  shippingAddress: Record<string, string>;
  lineItems: OrderItem[];
  note: string;
  tags: string[];
  isDraft: boolean;
  isAbandoned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OrderItem = {
  id: string;
  productId: string;
  variantId: string;
  title: string;
  variantTitle: string;
  quantity: number;
  price: number;
  image: string;
};

export type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  ordersCount: number;
  totalSpent: number;
  tags: string[];
  segment: string | null;
  company: string | null;
  address: Record<string, string>;
  acceptsMarketing: boolean;
  createdAt: string;
};

export type Discount = {
  id: string;
  code: string;
  type: "percentage" | "fixed_amount" | "free_shipping";
  value: number;
  usageCount: number;
  usageLimit: number | null;
  startsAt: string;
  endsAt: string | null;
  status: "active" | "scheduled" | "expired";
};

export type Campaign = {
  id: string;
  title: string;
  type: string;
  status: "active" | "paused" | "ended";
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  createdAt: string;
};

export type BlogPost = {
  id: string;
  title: string;
  handle: string;
  author: string;
  body: string;
  excerpt: string;
  tags: string[];
  status: "published" | "draft";
  publishedAt: string | null;
  createdAt: string;
};

export type Menu = {
  id: string;
  title: string;
  handle: string;
  items: MenuItem[];
};

export type MenuItem = {
  id: string;
  title: string;
  url: string;
  children: MenuItem[];
};

export type Market = {
  id: string;
  name: string;
  countries: string[];
  currency: string;
  status: "active" | "inactive";
  createdAt: string;
};

export type StoreSettings = {
  name: string;
  email: string;
  phone: string;
  currency: string;
  timezone: string;
  weightUnit: string;
  address: Record<string, string>;
  checkoutDomain: string;
};

// ─── Seed helpers ────────────────────────────────────────────────────────────

const iso = (daysAgo: number) =>
  new Date(Date.now() - daysAgo * 86_400_000).toISOString();

const uid = (prefix: string, n: number) => `${prefix}_${String(n).padStart(4, "0")}`;

// ─── Products ────────────────────────────────────────────────────────────────

export const products: Map<string, Product> = new Map(
  [
    { id: "p001", title: "Oversized Blazer", vendor: "Mora Studio", category: "women", price: 89.99, compareAtPrice: null, tags: ["blazer", "office"] },
    { id: "p002", title: "Slim Fit Trousers", vendor: "Mora Essentials", category: "women", price: 55.0, compareAtPrice: 75.0, tags: ["trousers", "sale"] },
    { id: "p003", title: "Ribbed Knit Dress", vendor: "Mora Studio", category: "women", price: 72.0, compareAtPrice: null, tags: ["dress", "knit"] },
    { id: "p004", title: "Linen Shirt", vendor: "Mora Essentials", category: "women", price: 44.99, compareAtPrice: null, tags: ["shirt", "linen"] },
    { id: "p005", title: "High Waist Jeans", vendor: "Mora Denim", category: "women", price: 68.0, compareAtPrice: null, tags: ["jeans", "denim"] },
    { id: "p006", title: "Satin Midi Skirt", vendor: "Mora Studio", category: "women", price: 59.99, compareAtPrice: 85.0, tags: ["skirt", "satin", "sale"] },
    { id: "p007", title: "Cropped Leather Jacket", vendor: "Mora Studio", category: "women", price: 149.0, compareAtPrice: null, tags: ["jacket", "leather"] },
    { id: "p008", title: "Cashmere Sweater", vendor: "Mora Essentials", category: "women", price: 95.0, compareAtPrice: null, tags: ["sweater", "cashmere"] },
    { id: "p009", title: "Slim Fit Chinos", vendor: "Mora Mens", category: "men", price: 52.0, compareAtPrice: null, tags: ["chinos", "slim"] },
    { id: "p010", title: "Oxford Shirt", vendor: "Mora Mens", category: "men", price: 48.0, compareAtPrice: null, tags: ["shirt", "oxford"] },
    { id: "p011", title: "Wool Coat", vendor: "Mora Mens", category: "men", price: 189.0, compareAtPrice: 250.0, tags: ["coat", "wool", "sale"] },
    { id: "p012", title: "Track Jacket", vendor: "Mora Sport", category: "men", price: 65.0, compareAtPrice: null, tags: ["jacket", "sport"] },
    { id: "p013", title: "Relaxed Denim", vendor: "Mora Denim", category: "men", price: 72.0, compareAtPrice: null, tags: ["jeans", "denim"] },
    { id: "p014", title: "Piqué Polo Shirt", vendor: "Mora Mens", category: "men", price: 38.0, compareAtPrice: null, tags: ["polo", "piqué"] },
    { id: "p015", title: "Luminous Vitamin C Serum", vendor: "Mora Beauty", category: "beauty", price: 34.99, compareAtPrice: null, tags: ["serum", "skincare"] },
    { id: "p016", title: "Hydra-Glow Moisturiser", vendor: "Mora Beauty", category: "beauty", price: 28.0, compareAtPrice: null, tags: ["moisturiser", "skincare"] },
    { id: "p017", title: "Volumising Mascara", vendor: "Mora Beauty", category: "beauty", price: 18.50, compareAtPrice: null, tags: ["mascara", "makeup"] },
    { id: "p018", title: "Matte Lip Set", vendor: "Mora Beauty", category: "beauty", price: 22.0, compareAtPrice: 30.0, tags: ["lipstick", "makeup", "sale"] },
    { id: "p019", title: "Silk Slip Dress", vendor: "Mora Studio", category: "new_in", price: 99.0, compareAtPrice: null, tags: ["dress", "silk", "new"] },
    { id: "p020", title: "Tailored Waistcoat", vendor: "Mora Studio", category: "new_in", price: 79.0, compareAtPrice: null, tags: ["waistcoat", "tailored", "new"] },
    { id: "p021", title: "Cargo Trousers", vendor: "Mora Mens", category: "sale", price: 35.0, compareAtPrice: 65.0, tags: ["cargo", "sale"] },
    { id: "p022", title: "Wrap Midi Dress", vendor: "Mora Studio", category: "sale", price: 39.99, compareAtPrice: 75.0, tags: ["dress", "wrap", "sale"] },
  ].map((p) => [
    p.id,
    {
      ...p,
      description: `Premium quality ${p.title.toLowerCase()} from ${p.vendor}. Crafted for comfort and style.`,
      images: [`https://picsum.photos/seed/${p.id}/600/800`],
      status: "active" as const,
      createdAt: iso(Math.floor(Math.random() * 90)),
      updatedAt: iso(Math.floor(Math.random() * 7)),
    } as Product,
  ])
);

// ─── Variants ─────────────────────────────────────────────────────────────────

export const variants: Map<string, Variant> = new Map();
const SIZES = ["XS", "S", "M", "L", "XL"];
products.forEach((product) => {
  SIZES.forEach((size, si) => {
    const id = `v_${product.id}_${si}`;
    variants.set(id, {
      id,
      productId: product.id,
      title: size,
      sku: `${product.id.toUpperCase()}-${size}`,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      inventory: Math.floor(Math.random() * 40) + 5,
      option1: size,
      option2: null,
    });
  });
});

// ─── Collections ──────────────────────────────────────────────────────────────

export const collections: Map<string, Collection> = new Map([
  ["col1", { id: "col1", title: "New Season Arrivals", description: "Fresh styles for the new season.", image: "https://picsum.photos/seed/col1/800/400", productsCount: 8, createdAt: iso(30) }],
  ["col2", { id: "col2", title: "Women's Edit", description: "Curated looks for every occasion.", image: "https://picsum.photos/seed/col2/800/400", productsCount: 10, createdAt: iso(45) }],
  ["col3", { id: "col3", title: "Men's Essentials", description: "Wardrobe staples for modern men.", image: "https://picsum.photos/seed/col3/800/400", productsCount: 6, createdAt: iso(60) }],
  ["col4", { id: "col4", title: "Beauty Favourites", description: "Top-rated skincare and makeup.", image: "https://picsum.photos/seed/col4/800/400", productsCount: 4, createdAt: iso(20) }],
  ["col5", { id: "col5", title: "Sale Picks", description: "Up to 50% off selected styles.", image: "https://picsum.photos/seed/col5/800/400", productsCount: 6, createdAt: iso(10) }],
]);

// ─── Customers ────────────────────────────────────────────────────────────────

const FIRST = ["Sara", "Lena", "Nour", "Maya", "Hana", "Omar", "Ali", "Zaid", "Yara", "Reem"];
const LAST = ["Al-Hassan", "Ibrahim", "Mohammed", "Ahmed", "Khalid", "Saeed", "Nasser", "Hamad", "Jaber", "Yousef"];

export const customers: Map<string, Customer> = new Map(
  FIRST.map((fn, i) => {
    const id = uid("cust", i + 1);
    const ln = LAST[i]!;
    return [
      id,
      {
        id,
        firstName: fn,
        lastName: ln,
        email: `${fn.toLowerCase()}.${ln.toLowerCase().replace("-", "")}@example.com`,
        phone: `+9647${String(700_000_000 + i * 13_777_777).slice(0, 9)}`,
        ordersCount: Math.floor(Math.random() * 8) + 1,
        totalSpent: Math.floor(Math.random() * 800) + 50,
        tags: i % 3 === 0 ? ["vip"] : [],
        segment: i % 4 === 0 ? "vip" : null,
        company: i % 5 === 0 ? "Mora Corp" : null,
        address: { city: "Baghdad", country: "Iraq", zip: "10001" },
        acceptsMarketing: i % 2 === 0,
        createdAt: iso(30 + i * 10),
      } as Customer,
    ];
  })
);

// ─── Orders ───────────────────────────────────────────────────────────────────

const ORDER_STATUSES: Order["status"][] = ["pending", "processing", "fulfilled", "cancelled", "refunded"];
const custList = [...customers.values()];

export const orders: Map<string, Order> = new Map(
  Array.from({ length: 18 }, (_, i) => {
    const id = uid("ord", i + 1);
    const cust = custList[i % custList.length]!;
    const status = ORDER_STATUSES[i % ORDER_STATUSES.length]!;
    const isDraft = i >= 16;
    const isAbandoned = i === 15;
    const qty = Math.floor(Math.random() * 3) + 1;
    const prodArr = [...products.values()];
    const prod = prodArr[i % prodArr.length]!;
    const varArr = [...variants.values()].filter((v) => v.productId === prod.id);
    const variant = varArr[0]!;
    const lineItems: OrderItem[] = [
      {
        id: `li_${id}_1`,
        productId: prod.id,
        variantId: variant.id,
        title: prod.title,
        variantTitle: variant.title,
        quantity: qty,
        price: prod.price,
        image: prod.images[0]!,
      },
    ];
    const subtotal = lineItems.reduce((s, li) => s + li.price * li.quantity, 0);
    const shipping = 5.99;
    const tax = +(subtotal * 0.1).toFixed(2);
    return [
      id,
      {
        id,
        orderNumber: `#${1000 + i}`,
        customerId: cust.id,
        email: cust.email,
        status,
        financialStatus: status === "fulfilled" ? "paid" : status === "cancelled" ? "refunded" : "pending",
        fulfillmentStatus: status === "fulfilled" ? "fulfilled" : "unfulfilled",
        subtotal: +subtotal.toFixed(2),
        shipping,
        tax,
        total: +(subtotal + shipping + tax).toFixed(2),
        currency: "USD",
        shippingAddress: { ...cust.address, firstName: cust.firstName, lastName: cust.lastName },
        lineItems,
        note: "",
        tags: [],
        isDraft,
        isAbandoned,
        createdAt: iso(i * 2),
        updatedAt: iso(i),
      } as Order,
    ];
  })
);

// ─── Discounts ────────────────────────────────────────────────────────────────

export const discounts: Map<string, Discount> = new Map([
  ["disc1", { id: "disc1", code: "MORA20", type: "percentage", value: 20, usageCount: 34, usageLimit: 100, startsAt: iso(30), endsAt: null, status: "active" }],
  ["disc2", { id: "disc2", code: "WELCOME10", type: "fixed_amount", value: 10, usageCount: 12, usageLimit: 50, startsAt: iso(60), endsAt: iso(-30), status: "active" }],
  ["disc3", { id: "disc3", code: "FREESHIP", type: "free_shipping", value: 0, usageCount: 8, usageLimit: null, startsAt: iso(10), endsAt: iso(-7), status: "active" }],
]);

// ─── Campaigns ────────────────────────────────────────────────────────────────

export const campaigns: Map<string, Campaign> = new Map([
  ["camp1", { id: "camp1", title: "Summer Collection Launch", type: "email", status: "active", budget: 500, spent: 312, impressions: 45_000, clicks: 2_300, conversions: 87, createdAt: iso(20) }],
  ["camp2", { id: "camp2", title: "Instagram Sale Promo", type: "social", status: "active", budget: 300, spent: 180, impressions: 28_000, clicks: 1_200, conversions: 45, createdAt: iso(15) }],
  ["camp3", { id: "camp3", title: "New In Email Blast", type: "email", status: "paused", budget: 200, spent: 200, impressions: 18_000, clicks: 980, conversions: 32, createdAt: iso(40) }],
]);

// ─── Blog posts ───────────────────────────────────────────────────────────────

export const blogPosts: Map<string, BlogPost> = new Map([
  ["post1", { id: "post1", title: "How to Style an Oversized Blazer", handle: "style-oversized-blazer", author: "Mora Team", body: "The oversized blazer is one of the most versatile pieces in your wardrobe...", excerpt: "Five ways to style the season's most wanted piece.", tags: ["style", "tips"], status: "published", publishedAt: iso(5), createdAt: iso(7) }],
  ["post2", { id: "post2", title: "Top Skincare Ingredients to Look For", handle: "skincare-ingredients", author: "Mora Beauty", body: "When it comes to skincare, ingredients matter more than branding...", excerpt: "A guide to reading your skincare labels.", tags: ["beauty", "skincare"], status: "published", publishedAt: iso(12), createdAt: iso(14) }],
  ["post3", { id: "post3", title: "Men's Style Essentials 2026", handle: "mens-style-essentials-2026", author: "Mora Team", body: "Building a wardrobe that works for every occasion doesn't have to be complicated...", excerpt: "The 10 pieces every man needs this year.", tags: ["men", "style"], status: "draft", publishedAt: null, createdAt: iso(2) }],
]);

// ─── Menus ────────────────────────────────────────────────────────────────────

export const menus: Map<string, Menu> = new Map([
  ["menu1", {
    id: "menu1",
    title: "Main Navigation",
    handle: "main-menu",
    items: [
      { id: "mi1", title: "New In", url: "/collections/new-in", children: [] },
      { id: "mi2", title: "Women", url: "/collections/women", children: [
        { id: "mi2a", title: "Clothing", url: "/collections/women-clothing", children: [] },
        { id: "mi2b", title: "Accessories", url: "/collections/women-accessories", children: [] },
      ]},
      { id: "mi3", title: "Men", url: "/collections/men", children: [] },
      { id: "mi4", title: "Beauty", url: "/collections/beauty", children: [] },
      { id: "mi5", title: "Sale", url: "/collections/sale", children: [] },
    ],
  }],
  ["menu2", {
    id: "menu2",
    title: "Footer",
    handle: "footer-menu",
    items: [
      { id: "fi1", title: "About Us", url: "/pages/about", children: [] },
      { id: "fi2", title: "Contact", url: "/pages/contact", children: [] },
      { id: "fi3", title: "Returns", url: "/pages/returns", children: [] },
    ],
  }],
]);

// ─── Markets ──────────────────────────────────────────────────────────────────

export const markets: Map<string, Market> = new Map([
  ["mkt1", { id: "mkt1", name: "United Kingdom", countries: ["GB"], currency: "GBP", status: "active", createdAt: iso(90) }],
  ["mkt2", { id: "mkt2", name: "Middle East", countries: ["IQ", "SA", "AE", "KW"], currency: "USD", status: "active", createdAt: iso(60) }],
  ["mkt3", { id: "mkt3", name: "Europe", countries: ["DE", "FR", "IT", "ES"], currency: "EUR", status: "inactive", createdAt: iso(45) }],
]);

// ─── Store Settings ───────────────────────────────────────────────────────────

export const storeSettings: StoreSettings = {
  name: "Mora Store",
  email: "hello@mora.store",
  phone: "+44 20 1234 5678",
  currency: "GBP",
  timezone: "Europe/London",
  weightUnit: "kg",
  address: { line1: "123 Fashion Street", city: "London", country: "United Kingdom", zip: "E1 6QA" },
  checkoutDomain: "checkout.mora.store",
};

// ─── Analytics helpers ────────────────────────────────────────────────────────

export function getAnalyticsSummary() {
  const orderList = [...orders.values()].filter((o) => !o.isDraft && !o.isAbandoned);
  const revenue = orderList.reduce((s, o) => s + o.total, 0);
  const avgOrder = orderList.length ? revenue / orderList.length : 0;
  return {
    revenue: +revenue.toFixed(2),
    orders: orderList.length,
    customers: customers.size,
    avgOrderValue: +avgOrder.toFixed(2),
    conversion: 3.2,
    visitors: 4_820,
    pageViews: 18_340,
    returnRate: 22.4,
  };
}

export function getRevenueByDay(days = 14) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 86_400_000);
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    const revenue = Math.floor(Math.random() * 600) + 100;
    const orderCount = Math.floor(Math.random() * 12) + 2;
    return { date: label, revenue, orders: orderCount };
  });
}

export function getTopProducts(limit = 5) {
  return [...products.values()].slice(0, limit).map((p) => ({
    productId: p.id,
    title: p.title,
    sold: Math.floor(Math.random() * 80) + 10,
    revenue: +((Math.random() * 80 + 10) * p.price).toFixed(2),
  }));
}
