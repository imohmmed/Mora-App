import { Router, type Request } from "express";
import db, { logActivity } from "../lib/db.js";
import { requireAdmin } from "../middlewares/auth.js";
import type { Row } from "../lib/types.js";
import { sendLiveActivityStartPush } from "../lib/apns.js";
import { doSendNotification } from "./notifications.js";
import { getTemplate } from "../lib/templates.js";

const router = Router();

function uid(): string {
  return `xr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function now(): string {
  return new Date().toISOString();
}
function formatIQD(amount: number): string {
  return `${Math.round(amount).toLocaleString("en-US")} IQD`;
}

// Resolve the logged-in customer from the Bearer session token.
function resolveCustomer(req: Request): { customerId: string; email: string } | null {
  const authHeader = req.headers["authorization"];
  if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) return null;
  try {
    const sess = db.prepare(`SELECT customer_id FROM sessions WHERE token=?`).get(authHeader.slice(7)) as Row | undefined;
    if (!sess) return null;
    const customerId = sess["customer_id"] as string;
    const cust = db.prepare(`SELECT email FROM customers WHERE id=?`).get(customerId) as Row | undefined;
    return { customerId, email: (cust?.["email"] as string) ?? "" };
  } catch {
    return null;
  }
}

type XrItem = {
  variantId?: string;
  productId?: string;
  title?: string;
  variantTitle?: string;
  image?: string;
  price?: number;
  quantity?: number;
};

function sanitizeItems(raw: unknown): XrItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((it) => it && typeof it === "object")
    .map((it: Record<string, unknown>) => ({
      variantId:    typeof it["variantId"] === "string" ? it["variantId"] : "",
      productId:    typeof it["productId"] === "string" ? it["productId"] : "",
      title:        typeof it["title"] === "string" ? it["title"] : "",
      variantTitle: typeof it["variantTitle"] === "string" ? it["variantTitle"] : "",
      image:        typeof it["image"] === "string" ? it["image"] : "",
      price:        Number(it["price"]) || 0,
      quantity:     Math.max(1, Math.round(Number(it["quantity"]) || 1)),
    }))
    .filter((it) => it.title || it.variantId);
}

function parseRequest(row: Row | undefined | null): Record<string, unknown> | null {
  if (!row) return null;
  const parse = (v: unknown) => {
    try { return JSON.parse((v as string) || "[]"); } catch { return []; }
  };
  return {
    id:             row["id"],
    orderId:        row["order_id"],
    orderNumber:    row["order_number"],
    customerId:     row["customer_id"],
    email:          row["email"],
    type:           row["type"],
    status:         row["status"],
    description:    row["description"],
    images:         parse(row["images"]),
    returnItems:    parse(row["return_items"]),
    newItems:       parse(row["new_items"]),
    adminPrice:     row["admin_price"],
    newOrderId:     row["new_order_id"],
    newOrderNumber: row["new_order_number"],
    rejectReason:   row["reject_reason"],
    createdAt:      row["created_at"],
    updatedAt:      row["updated_at"],
  };
}

// ─── Store: create an exchange / refund request ───────────────────────────────

router.post("/store/exchange-requests", async (req, res) => {
  const cust = resolveCustomer(req);
  if (!cust) { res.status(401).json({ data: null, meta: {}, error: "Login required" }); return; }

  const b = req.body as Record<string, unknown>;
  const orderId = ((b["orderId"] as string) ?? "").trim();
  const type = b["type"] === "exchange" ? "exchange" : b["type"] === "refund" ? "refund" : null;
  const description = ((b["description"] as string) ?? "").trim();
  const images = Array.isArray(b["images"]) ? (b["images"] as unknown[]).filter((u) => typeof u === "string" && u).slice(0, 6) as string[] : [];
  const items = sanitizeItems(b["items"]);

  if (!orderId || !type) { res.status(400).json({ data: null, meta: {}, error: "orderId and type are required" }); return; }
  if (!description) { res.status(400).json({ data: null, meta: {}, error: "description is required" }); return; }
  if (images.length === 0) { res.status(400).json({ data: null, meta: {}, error: "at least one image is required" }); return; }
  if (items.length === 0) { res.status(400).json({ data: null, meta: {}, error: "at least one item is required" }); return; }

  const order = db.prepare(`SELECT id, order_number, customer_id, email, delivery_stage FROM orders WHERE id=?`).get(orderId) as Row | undefined;
  if (!order) { res.status(404).json({ data: null, meta: {}, error: "Order not found" }); return; }

  const ownsOrder =
    (order["customer_id"] && order["customer_id"] === cust.customerId) ||
    (cust.email && String(order["email"] ?? "").toLowerCase() === cust.email.toLowerCase());
  if (!ownsOrder) { res.status(403).json({ data: null, meta: {}, error: "Not your order" }); return; }

  const stage = (order["delivery_stage"] as string) ?? "";
  if (stage !== "delivered" && stage !== "partial_return") {
    res.status(400).json({ data: null, meta: {}, error: "Order must be delivered first" }); return;
  }

  // One active request per order
  const active = db.prepare(
    `SELECT id FROM exchange_requests WHERE order_id=? AND status IN ('awaiting_items','pending','approved')`
  ).get(orderId);
  if (active) { res.status(409).json({ data: null, meta: {}, error: "An active request already exists for this order" }); return; }

  const id = uid();
  const ts = now();
  const status = type === "exchange" ? "awaiting_items" : "pending";
  try {
    db.prepare(
      `INSERT INTO exchange_requests (id, order_id, order_number, customer_id, email, type, status, description, images, return_items, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      id, orderId, (order["order_number"] as string) ?? "", cust.customerId, cust.email,
      type, status, description, JSON.stringify(images), JSON.stringify(items), ts, ts
    );
  } catch (e) {
    // Partial unique index guards one active request per order (race-safe).
    if ((e as { code?: string }).code?.startsWith("SQLITE_CONSTRAINT")) {
      res.status(409).json({ data: null, meta: {}, error: "An active request already exists for this order" }); return;
    }
    throw e;
  }

  logActivity(
    "exchange.requested", "Orders", "exchange_request", id,
    `${type === "exchange" ? "Exchange" : "Refund"} request for ${order["order_number"]}`,
    cust.email || "Customer",
    { orderNumber: order["order_number"], type }
  );

  // Refunds are submitted in one shot → confirm receipt right away.
  // Exchanges wait for the new items (push sent from the /items endpoint).
  if (type === "refund" && cust.customerId) {
    const copy = getTemplate("refund:received", { orderNum: (order["order_number"] as string) ?? "" });
    if (copy) {
      try {
        await doSendNotification({
          title: copy.title,
          body: copy.body,
          url: "/orders",
          targetAll: false,
          customerIds: [cust.customerId],
        });
      } catch { /* non-fatal */ }
    }
  }

  const row = db.prepare(`SELECT * FROM exchange_requests WHERE id=?`).get(id) as Row;
  res.status(201).json({ data: parseRequest(row), meta: {}, error: null });
});

// ─── Store: attach the new cart items to an exchange request ─────────────────

router.post("/store/exchange-requests/:id/items", async (req, res) => {
  const cust = resolveCustomer(req);
  if (!cust) { res.status(401).json({ data: null, meta: {}, error: "Login required" }); return; }

  const row = db.prepare(`SELECT * FROM exchange_requests WHERE id=?`).get(req.params["id"]) as Row | undefined;
  if (!row) { res.status(404).json({ data: null, meta: {}, error: "Request not found" }); return; }
  if (row["customer_id"] !== cust.customerId) { res.status(403).json({ data: null, meta: {}, error: "Not your request" }); return; }
  if (row["type"] !== "exchange") { res.status(400).json({ data: null, meta: {}, error: "Not an exchange request" }); return; }
  if (row["status"] !== "awaiting_items") { res.status(409).json({ data: null, meta: {}, error: "Request already submitted" }); return; }

  const items = sanitizeItems((req.body as Record<string, unknown>)["items"]);
  if (items.length === 0) { res.status(400).json({ data: null, meta: {}, error: "at least one item is required" }); return; }

  db.prepare(`UPDATE exchange_requests SET new_items=?, status='pending', updated_at=? WHERE id=?`)
    .run(JSON.stringify(items), now(), row["id"]);

  // Exchange request is now fully submitted → confirm receipt.
  const copy = getTemplate("exchange:received", { orderNum: (row["order_number"] as string) ?? "" });
  if (copy) {
    try {
      await doSendNotification({
        title: copy.title,
        body: copy.body,
        url: "/orders",
        targetAll: false,
        customerIds: [cust.customerId],
      });
    } catch { /* non-fatal */ }
  }

  const updated = db.prepare(`SELECT * FROM exchange_requests WHERE id=?`).get(row["id"]) as Row;
  res.json({ data: parseRequest(updated), meta: {}, error: null });
});

// ─── Store: cancel a request (before admin decision) ─────────────────────────

router.post("/store/exchange-requests/:id/cancel", (req, res) => {
  const cust = resolveCustomer(req);
  if (!cust) { res.status(401).json({ data: null, meta: {}, error: "Login required" }); return; }

  const row = db.prepare(`SELECT * FROM exchange_requests WHERE id=?`).get(req.params["id"]) as Row | undefined;
  if (!row) { res.status(404).json({ data: null, meta: {}, error: "Request not found" }); return; }
  if (row["customer_id"] !== cust.customerId) { res.status(403).json({ data: null, meta: {}, error: "Not your request" }); return; }
  if (row["status"] !== "awaiting_items" && row["status"] !== "pending") {
    res.status(409).json({ data: null, meta: {}, error: "Request can no longer be cancelled" }); return;
  }

  db.prepare(`UPDATE exchange_requests SET status='cancelled', updated_at=? WHERE id=?`).run(now(), row["id"]);
  res.json({ data: { ok: true }, meta: {}, error: null });
});

// ─── Store: list my requests ──────────────────────────────────────────────────

router.get("/store/exchange-requests", (req, res) => {
  const cust = resolveCustomer(req);
  if (!cust) { res.status(401).json({ data: null, meta: {}, error: "Login required" }); return; }

  const rows = db.prepare(
    `SELECT * FROM exchange_requests WHERE customer_id=? ORDER BY created_at DESC`
  ).all(cust.customerId) as Row[];
  res.json({ data: rows.map((r) => parseRequest(r)), meta: { total: rows.length }, error: null });
});

// ─── Admin: list / detail ─────────────────────────────────────────────────────

router.get("/admin/exchange-requests", requireAdmin, (req, res) => {
  const { status } = req.query as Record<string, string>;
  let sql = `
    SELECT xr.*, c.first_name, c.last_name, c.phone AS customer_phone
    FROM exchange_requests xr LEFT JOIN customers c ON c.id = xr.customer_id
  `;
  const params: string[] = [];
  if (status && status !== "all") { sql += ` WHERE xr.status=?`; params.push(status); }
  sql += ` ORDER BY xr.created_at DESC`;
  const rows = db.prepare(sql).all(...params) as Row[];
  const data = rows.map((r) => ({
    ...parseRequest(r),
    customerName: `${r["first_name"] ?? ""} ${r["last_name"] ?? ""}`.trim(),
    customerPhone: r["customer_phone"] ?? "",
  }));
  res.json({ data, meta: { total: rows.length }, error: null });
});

router.get("/admin/exchange-requests/:id", requireAdmin, (req, res) => {
  const row = db.prepare(`
    SELECT xr.*, c.first_name, c.last_name, c.phone AS customer_phone, c.email AS customer_email
    FROM exchange_requests xr LEFT JOIN customers c ON c.id = xr.customer_id
    WHERE xr.id=?
  `).get(req.params["id"]) as Row | undefined;
  if (!row) { res.status(404).json({ data: null, meta: {}, error: "Request not found" }); return; }
  const order = db.prepare(`SELECT shipping_address FROM orders WHERE id=?`).get(row["order_id"] as string) as Row | undefined;
  let shippingAddress: unknown = {};
  try { shippingAddress = JSON.parse((order?.["shipping_address"] as string) || "{}"); } catch { /* ignore */ }
  res.json({
    data: {
      ...parseRequest(row),
      customerName: `${row["first_name"] ?? ""} ${row["last_name"] ?? ""}`.trim(),
      customerPhone: row["customer_phone"] ?? "",
      customerEmail: row["customer_email"] ?? row["email"] ?? "",
      shippingAddress,
    },
    meta: {}, error: null,
  });
});

// ─── Admin: approve ───────────────────────────────────────────────────────────
// Exchange → creates a new order "#XXXX(E)" from the customer's new cart with
// the admin-entered price as total, and decrements inventory for the new items.
// Refund → creates a record order "#XXXX(R)" of the returned items with the
// admin-entered refund amount as total (no inventory change).

router.post("/admin/exchange-requests/:id/approve", requireAdmin, async (req, res) => {
  const row = db.prepare(`SELECT * FROM exchange_requests WHERE id=?`).get(req.params["id"]) as Row | undefined;
  if (!row) { res.status(404).json({ data: null, meta: {}, error: "Request not found" }); return; }
  if (row["status"] !== "pending") { res.status(409).json({ data: null, meta: {}, error: "Request is not pending" }); return; }

  const price = Number((req.body as Record<string, unknown>)["price"]);
  if (!Number.isFinite(price) || price < 0) {
    res.status(400).json({ data: null, meta: {}, error: "price is required" }); return;
  }

  const type = row["type"] as string;
  const isExchange = type === "exchange";
  const oldOrder = db.prepare(`SELECT * FROM orders WHERE id=?`).get(row["order_id"] as string) as Row | undefined;
  if (!oldOrder) { res.status(404).json({ data: null, meta: {}, error: "Original order not found" }); return; }

  const lineItems = (() => {
    try {
      return JSON.parse((isExchange ? row["new_items"] : row["return_items"]) as string || "[]") as XrItem[];
    } catch { return [] as XrItem[]; }
  })();
  if (lineItems.length === 0) { res.status(400).json({ data: null, meta: {}, error: "Request has no items" }); return; }

  // New order number: base + (E)/(R), with a numeric suffix on the rare repeat.
  const suffix = isExchange ? "(E)" : "(R)";
  const baseNum = (row["order_number"] as string) || "#XXXX";
  let newNumber = `${baseNum}${suffix}`;
  let n = 2;
  while (db.prepare(`SELECT id FROM orders WHERE order_number=?`).get(newNumber)) {
    newNumber = `${baseNum}${suffix}${n++}`;
  }

  const newOrderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const ts = now();
  let stockErrMsg: string | null = null;

  // Aggregate quantities per variant so duplicate lines can't slip past the
  // stock check, and so decrements are applied once per variant.
  const variantQty = new Map<string, { qty: number; title: string }>();
  if (isExchange) {
    for (const item of lineItems) {
      const qty = Number(item.quantity ?? 0);
      if (!item.variantId || qty <= 0) {
        res.status(400).json({ data: null, meta: {}, error: "Exchange items must have a variant and quantity" }); return;
      }
      const prev = variantQty.get(item.variantId);
      variantQty.set(item.variantId, {
        qty: (prev?.qty ?? 0) + qty,
        title: item.title ?? prev?.title ?? item.variantId,
      });
    }
  }

  const approve = db.transaction(() => {
    if (isExchange) {
      // Verify every variant exists and has enough stock for the combined qty.
      for (const [variantId, { qty, title }] of variantQty) {
        const v = db.prepare(`SELECT inventory FROM variants WHERE id=?`).get(variantId) as { inventory: number } | undefined;
        if (v === undefined) {
          stockErrMsg = `Variant not found for "${title}" — it may have been removed`;
          throw new Error("VARIANT_MISSING");
        }
        if (v.inventory < qty) {
          stockErrMsg = `Not enough stock for "${title}" — only ${v.inventory} left`;
          throw new Error("STOCK_LOW");
        }
      }
    }

    db.prepare(
      `INSERT INTO orders (id,order_number,customer_id,email,status,financial_status,fulfillment_status,subtotal,shipping,tax,total,currency,discount_code,discount_amount,shipping_address,line_items,note,tags,is_draft,is_abandoned,delivery_stage,delivery_type,payment_method,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      newOrderId, newNumber,
      (row["customer_id"] as string) ?? null, (row["email"] as string) ?? "",
      "pending", "pending", "unfulfilled",
      price, 0, 0, price, "IQD",
      null, 0,
      (oldOrder["shipping_address"] as string) ?? "{}",
      JSON.stringify(lineItems),
      isExchange
        ? `طلب استبدال للطلب ${baseNum}`
        : `طلب استرجاع فلوس للطلب ${baseNum}`,
      JSON.stringify([isExchange ? "exchange" : "refund"]),
      0, 0, "confirmed",
      (oldOrder["delivery_type"] as string) ?? "standard",
      (oldOrder["payment_method"] as string) ?? "cod",
      ts, ts
    );

    if (isExchange) {
      for (const [variantId, { qty }] of variantQty) {
        db.prepare(`UPDATE variants SET inventory = MAX(0, inventory - ?) WHERE id=?`)
          .run(qty, variantId);
      }
    }

    db.prepare(
      `UPDATE exchange_requests SET status='approved', admin_price=?, new_order_id=?, new_order_number=?, updated_at=? WHERE id=?`
    ).run(price, newOrderId, newNumber, ts, row["id"]);
  });

  try {
    approve();
  } catch {
    if (stockErrMsg) { res.status(409).json({ data: null, meta: {}, error: stockErrMsg }); return; }
    res.status(500).json({ data: null, meta: {}, error: "Approval failed" }); return;
  }

  logActivity(
    "exchange.approved", "Orders", "exchange_request", row["id"] as string,
    `${isExchange ? "Exchange" : "Refund"} approved → ${newNumber}`, "Admin",
    { orderNumber: newNumber, price, type }
  );

  // ── Notify the customer: push + in-app + Dynamic Island (push-to-start) ────
  const customerId = row["customer_id"] as string | null;
  if (customerId) {
    const c = db.prepare(`SELECT first_name, last_name, live_activity_pts_token FROM customers WHERE id=?`).get(customerId) as Row | undefined;
    const customerName = `${c?.["first_name"] ?? ""} ${c?.["last_name"] ?? ""}`.trim();
    const copy = getTemplate(`${type}:approved`, {
      orderNum: newNumber,
      customerName,
      price: formatIQD(price),
      itemCount: String(lineItems.reduce((s, it) => s + (it.quantity ?? 0), 0)),
    });

    if (copy) {
      try {
        await doSendNotification({
          title: copy.title,
          body: copy.body,
          url: "/(tabs)/chat",
          targetAll: false,
          customerIds: [customerId],
        });
      } catch { /* non-fatal */ }
    }

    const ptsToken = c?.["live_activity_pts_token"] as string | null | undefined;
    if (ptsToken) {
      try {
        await sendLiveActivityStartPush(ptsToken, {
          orderNumber: newNumber,
          customerName,
          stage: "confirmed" as never,
          message: "سيتم التواصل معك خلال يومين كحد أقصى",
          priceText: formatIQD(price),
          isPaid: false,
          deliveryType: (oldOrder["delivery_type"] as string) ?? "standard",
          alertTitle: copy?.title ?? "Mora",
          alertBody: copy?.body ?? "",
        });
      } catch { /* non-fatal */ }
    }
  }

  const updated = db.prepare(`SELECT * FROM exchange_requests WHERE id=?`).get(row["id"]) as Row;
  res.json({ data: parseRequest(updated), meta: {}, error: null });
});

// ─── Admin: reject ────────────────────────────────────────────────────────────

router.post("/admin/exchange-requests/:id/reject", requireAdmin, async (req, res) => {
  const row = db.prepare(`SELECT * FROM exchange_requests WHERE id=?`).get(req.params["id"]) as Row | undefined;
  if (!row) { res.status(404).json({ data: null, meta: {}, error: "Request not found" }); return; }
  if (row["status"] !== "pending" && row["status"] !== "awaiting_items") {
    res.status(409).json({ data: null, meta: {}, error: "Request is not pending" }); return;
  }

  const reason = (((req.body as Record<string, unknown>)["reason"] as string) ?? "").trim();
  db.prepare(`UPDATE exchange_requests SET status='rejected', reject_reason=?, updated_at=? WHERE id=?`)
    .run(reason, now(), row["id"]);

  const type = row["type"] as string;
  logActivity(
    "exchange.rejected", "Orders", "exchange_request", row["id"] as string,
    `${type === "exchange" ? "Exchange" : "Refund"} rejected for ${row["order_number"]}`, "Admin",
    { orderNumber: row["order_number"], type, reason }
  );

  const customerId = row["customer_id"] as string | null;
  if (customerId) {
    const c = db.prepare(`SELECT first_name, last_name FROM customers WHERE id=?`).get(customerId) as Row | undefined;
    const copy = getTemplate(`${type}:rejected`, {
      orderNum: (row["order_number"] as string) ?? "",
      customerName: `${c?.["first_name"] ?? ""} ${c?.["last_name"] ?? ""}`.trim(),
    });
    if (copy) {
      try {
        await doSendNotification({
          title: copy.title,
          body: copy.body,
          url: "/(tabs)/chat",
          targetAll: false,
          customerIds: [customerId],
        });
      } catch { /* non-fatal */ }
    }
  }

  const updated = db.prepare(`SELECT * FROM exchange_requests WHERE id=?`).get(row["id"]) as Row;
  res.json({ data: parseRequest(updated), meta: {}, error: null });
});

export default router;
