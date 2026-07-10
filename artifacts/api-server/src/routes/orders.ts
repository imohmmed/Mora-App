import { Router } from "express";
import db, { parseRows, parseOne, logActivity, getDeliveryOptions } from "../lib/db.js";
import { requireAdmin } from "../middlewares/auth.js";
import type { Row } from "../lib/types.js";
import { sendLiveActivityPush, sendLiveActivityStartPush } from "../lib/apns.js";
import { doSendNotification } from "./notifications.js";
import { validateDiscount, redeemDiscount } from "../lib/discounts.js";
import { getTemplate } from "../lib/templates.js";

// Build variable map for a given order (used in notification template replacement)
function buildVars(orderId: string, orderNum: string, customerId: string | null): Record<string, string> {
  const order = db.prepare("SELECT total, line_items FROM orders WHERE id = ?").get(orderId) as { total: number; line_items: string } | undefined;
  const total = order?.total ?? 0;
  let itemCount = 0;
  try {
    const items = JSON.parse(order?.line_items ?? "[]") as Array<{ quantity?: number }>;
    itemCount = items.reduce((n, it) => n + (Number(it?.quantity) || 0), 0);
  } catch { /* ignore parse error */ }
  let customerName = "";
  if (customerId) {
    const c = db.prepare("SELECT first_name, last_name FROM customers WHERE id = ?").get(customerId) as { first_name: string; last_name: string } | undefined;
    if (c) customerName = `${c.first_name} ${c.last_name}`.trim();
  }
  return {
    orderNum,
    price: formatIQD(total),
    itemCount: String(itemCount),
    customerName,
  };
}

// ── Unique order number generator: #XXXX (4 uppercase alphanumeric chars) ─────
// 36^4 = 1,679,616 combinations. Retries on the rare collision.
const ORDER_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
function generateOrderNumber(): string {
  while (true) {
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += ORDER_CHARS[Math.floor(Math.random() * ORDER_CHARS.length)];
    }
    const candidate = `#${code}`;
    const exists = db.prepare("SELECT id FROM orders WHERE order_number=?").get(candidate);
    if (!exists) return candidate;
  }
}

// Delivery stage keys mapped to template keys
const STAGE_TO_KEY: Record<string, string> = {
  confirmed: "stage:confirmed",
  preparing: "stage:preparing",
  shipping:  "stage:shipping",
  delivered: "stage:delivered",
  issue:     "stage:issue",
  cancelled: "stage:cancelled",
};

// Format an amount as Iraqi Dinar for the Live Activity, e.g. 75000 → "75,000 IQD".
function formatIQD(amount: number): string {
  return `${Math.round(amount).toLocaleString("en-US")} IQD`;
}

// Allowed delivery stages for Live Activity content-state.
const VALID_STAGES = ["confirmed", "preparing", "shipping", "delivered", "issue", "cancelled"];

// Allowed delivery types chosen at checkout.
const VALID_DELIVERY_TYPES = ["standard", "express", "pickup"];
function normalizeDeliveryType(v: unknown): string {
  return v === "express" || v === "pickup" ? v : "standard";
}

// Arabic delivery-duration line shown in the Live Activity / Dynamic Island.
// Returns "" for terminal/exception stages so the widget falls back to its
// own per-stage subtitle. Mirrors lib/deliveryMessage.ts in the mora app.
function deliveryMessage(deliveryType: string, stage: string): string {
  if (stage === "delivered" || stage === "issue" || stage === "cancelled") return "";
  if (deliveryType === "pickup") return "سيتم تجهيزه لك في المحل";
  if (stage === "shipping") return "مدة التوصيل من 1-2 يوم";
  if (deliveryType === "express") return "يتم التوصيل الطلب من 1-3 ايام";
  return "مدة التوصيل من 1-5 ايام";
}

// Template keys for order status / fulfillment / financial changes
const STATUS_KEYS: Record<string, string>   = { processing: "status:processing", completed: "status:completed", cancelled: "status:cancelled" };
const FULFILL_KEYS: Record<string, string>  = { fulfilled: "fulfill:fulfilled" };
const FINANCIAL_KEYS: Record<string, string> = { paid: "financial:paid", refunded: "financial:refunded" };

const router = Router();

// ─── Public: customer order lookup ────────────────────────────────────────────

router.get("/store/orders", (req, res) => {
  const { email } = req.query as Record<string, string>;
  // Require a non-empty email — never return all orders to anonymous callers
  if (!email || !email.trim()) {
    res.status(400).json({ data: null, meta: {}, error: "email query parameter is required" });
    return;
  }
  const rows = db.prepare(
    `SELECT * FROM orders WHERE is_draft=0 AND is_abandoned=0 AND lower(email)=lower(?) ORDER BY created_at DESC`
  ).all(email.trim()) as Row[];
  res.json({ data: parseRows(rows), meta: { total: rows.length }, error: null });
});

router.get("/store/orders/:id", (req, res) => {
  const { email } = req.query as Record<string, string>;
  // Require ownership verification via email
  if (!email || !email.trim()) {
    res.status(400).json({ data: null, meta: {}, error: "email query parameter is required for ownership verification" });
    return;
  }
  const order = parseOne(
    db.prepare(
      `SELECT * FROM orders WHERE id=? AND lower(email)=lower(?)`
    ).get(req.params["id"], email.trim()) as Row | undefined
  );
  if (!order) {
    res.status(404).json({ data: null, meta: {}, error: "Order not found" });
    return;
  }
  res.json({ data: order, meta: {}, error: null });
});

// ─── Store: submit order review ──────────────────────────────────────────────
router.post("/store/orders/:id/review", (req, res) => {
  const { id } = req.params;
  const { email } = req.query as Record<string, string>;
  const { rating, text } = req.body as { rating?: number; text?: string };

  if (!email?.trim()) {
    res.status(400).json({ data: null, error: "email required" });
    return;
  }
  const r = Math.round(Number(rating));
  if (!r || r < 1 || r > 5) {
    res.status(400).json({ data: null, error: "rating must be 1–5" });
    return;
  }
  const exists = db.prepare(
    `SELECT id FROM orders WHERE id=? AND lower(email)=lower(?)`
  ).get(id, email.trim());
  if (!exists) {
    res.status(404).json({ data: null, error: "Order not found" });
    return;
  }
  db.prepare(
    `UPDATE orders SET review_rating=?, review_text=?, updated_at=? WHERE id=?`
  ).run(r, ((text ?? "").trim()) || null, new Date().toISOString(), id);
  res.json({ data: { ok: true }, error: null });
});

// ─── Store: customer place order ─────────────────────────────────────────────

router.post("/store/orders", (req, res) => {
  const id = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const b = req.body as Record<string, unknown>;
  const orderNum = generateOrderNumber();

  const subtotal = Number(b["subtotal"]) || 0;

  const lineItems = (b["lineItems"] as Array<{ quantity?: number }> | undefined) ?? [];
  const itemCount = lineItems.reduce((n, it) => n + (Number(it?.quantity) || 0), 0);

  // ── Delivery type + shipping: compute server-authoritatively ────────────────
  // The client-sent `shipping` is never trusted. Standard delivery uses the
  // selected governorate's zone price; express uses the admin-configured flat
  // price regardless of governorate; pickup is always free (no zone required).
  const deliveryType = normalizeDeliveryType(b["deliveryType"]);
  const deliveryOptions = getDeliveryOptions();
  const governorate = ((b["governorate"] as string) ?? "").trim();

  let shipping = 0;
  if (deliveryType === "pickup") {
    shipping = 0;
  } else {
    if (!governorate) {
      res.status(400).json({ data: null, meta: {}, error: "governorate is required" });
      return;
    }
    const zone = db.prepare(
      `SELECT price FROM shipping_zones WHERE enabled=1 AND lower(governorate)=lower(?)`,
    ).get(governorate) as Row | undefined;
    if (!zone) {
      res.status(400).json({ data: null, meta: {}, error: "Invalid or unavailable governorate" });
      return;
    }
    shipping = deliveryType === "express" ? deliveryOptions.express.price : (Number(zone["price"]) || 0);
  }

  // ── Discount: re-validate server-side (never trust a client-sent amount) ──
  const discountCode = ((b["discountCode"] as string) ?? "").trim();
  let discountAmount = 0;
  let appliedCode: string | null = null;
  let freeShipping = false;
  if (discountCode) {
    const result = validateDiscount(discountCode, subtotal, itemCount);
    if (!result.ok) {
      res.status(400).json({ data: null, meta: {}, error: result.error ?? "Invalid discount code" });
      return;
    }
    discountAmount = result.discountAmount;
    if (result.freeShipping) freeShipping = true;
    appliedCode = (result.discount?.["code"] as string) ?? discountCode.toUpperCase();
  }

  // ── Free-delivery rule: any enabled rule whose threshold is met zeroes shipping ──
  // (pickup is already free and has no zone to waive)
  if (deliveryType !== "pickup") {
    if (!freeShipping) {
      const rule = db.prepare(
        `SELECT id FROM shipping_rules WHERE enabled=1 AND threshold IS NOT NULL AND threshold <= ? LIMIT 1`,
      ).get(subtotal) as Row | undefined;
      if (rule) freeShipping = true;
    }
    if (freeShipping) shipping = 0;
  }

  const total = Math.max(0, subtotal + shipping - discountAmount);

  // Resolve customer from Bearer token if present
  let customerId: string | null = null;
  let email = (b["email"] as string) || "";
  const authHeader = req.headers["authorization"];
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    try {
      const sess = db.prepare(`SELECT customer_id FROM sessions WHERE token=?`).get(authHeader.slice(7)) as Row | undefined;
      if (sess) {
        customerId = sess["customer_id"] as string;
        const cust = db.prepare(`SELECT email FROM customers WHERE id=?`).get(customerId) as Row | undefined;
        if (cust && !email) email = cust["email"] as string;
      }
    } catch { /* ignore */ }
  }

  const paymentMethod = (b["paymentMethod"] as string) ?? "cod";

  // ── Stock check + order insert + inventory decrement (atomic) ──────────────
  type OLI = { variantId?: string; quantity?: number; title?: string };
  let stockErrMsg: string | null = null;
  const insertOrder = db.transaction(() => {
    // 1. Verify sufficient inventory for every line item
    for (const item of lineItems as OLI[]) {
      if (!item.variantId || !(item.quantity ?? 0)) continue;
      const v = db.prepare("SELECT inventory FROM variants WHERE id=?")
        .get(item.variantId) as { inventory: number } | undefined;
      if (v !== undefined && v.inventory < (item.quantity ?? 1)) {
        stockErrMsg = `Not enough stock for "${item.title ?? item.variantId}" — only ${v.inventory} left`;
        throw new Error("STOCK_LOW");
      }
    }
    // 2. Insert order row
    db.prepare(
      `INSERT INTO orders (id,order_number,customer_id,email,status,financial_status,fulfillment_status,subtotal,shipping,tax,total,currency,discount_code,discount_amount,shipping_address,line_items,note,tags,is_draft,is_abandoned,delivery_stage,delivery_type,payment_method,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      id, orderNum, customerId, email,
      "pending", "pending", "unfulfilled",
      subtotal, shipping, 0, total, "IQD",
      appliedCode, discountAmount,
      JSON.stringify(b["shippingAddress"] ?? {}),
      JSON.stringify(b["lineItems"] ?? []),
      (b["note"] as string) ?? "", "[]",
      0, 0, "confirmed", deliveryType, paymentMethod, now, now
    );
    // 3. Decrement inventory for each variant
    for (const item of lineItems as OLI[]) {
      if (item.variantId && (item.quantity ?? 0) > 0) {
        db.prepare("UPDATE variants SET inventory = MAX(0, inventory - ?) WHERE id=?")
          .run(item.quantity, item.variantId);
      }
    }
  });

  try {
    insertOrder();
  } catch {
    if (stockErrMsg) {
      res.status(409).json({ data: null, meta: {}, error: stockErrMsg });
      return;
    }
    res.status(500).json({ data: null, meta: {}, error: "Order creation failed" });
    return;
  }

  // Count usage now for COD; online codes are redeemed when payment settles.
  if (appliedCode && paymentMethod !== "online") {
    redeemDiscount(appliedCode);
  }

  if (customerId) {
    const addr = (b["shippingAddress"] as Record<string, string> | undefined) ?? {};
    const customerAddress = JSON.stringify({
      city: addr["city"] || "",
      district: addr["district"] || "",
      street: addr["street"] || "",
    });
    db.prepare(`UPDATE customers SET
      orders_count = orders_count + 1,
      total_spent  = total_spent + ?,
      address      = ?,
      updated_at   = ?
    WHERE id = ?`).run(total, customerAddress, now, customerId);
  }

  logActivity("order.created", "Orders", "order", id, `Order ${orderNum}`, email || "Guest",
    { orderNumber: orderNum, email, total, currency: "IQD", paymentMethod: (b["paymentMethod"] as string) ?? "cod" });

  const order = parseOne(db.prepare(`SELECT * FROM orders WHERE id=?`).get(id) as Row | undefined);
  res.status(201).json({ data: order, meta: {}, error: null });
});

// ─── Store: sync Live Activity push token by orderNumber (for push-to-start) ──
// Called on app launch to register tokens for activities started remotely
// by the server (push-to-start), where no local Activity.request() was made.

router.post("/store/orders/sync-live-activity-token", (req, res) => {
  const { orderNumber, pushToken } = req.body as { orderNumber?: string; pushToken?: string };
  if (!orderNumber || !pushToken) {
    res.status(400).json({ data: null, error: "orderNumber and pushToken are required" });
    return;
  }

  // Optionally verify ownership via session token
  let where = `order_number=?`;
  const params: unknown[] = [orderNumber];
  const authHeader = req.headers["authorization"];
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    const sess = db.prepare(`SELECT customer_id FROM sessions WHERE token=?`).get(authHeader.slice(7)) as Row | undefined;
    if (sess) { where += ` AND customer_id=?`; params.push(sess["customer_id"]); }
  }

  const existing = db.prepare(`SELECT id FROM orders WHERE ${where}`).get(...params) as Row | undefined;
  if (!existing) { res.status(404).json({ data: null, error: "Order not found" }); return; }

  db.prepare(`UPDATE orders SET live_activity_push_token=?, updated_at=? WHERE id=?`)
    .run(pushToken, new Date().toISOString(), existing["id"]);

  res.json({ data: { ok: true }, error: null });
});

// ─── Store: save Live Activity push token ─────────────────────────────────────

router.post("/store/orders/:id/live-activity-token", (req, res) => {
  const id = req.params["id"];
  const { pushToken } = req.body as { pushToken?: string };
  if (!pushToken) { res.status(400).json({ data: null, error: "pushToken required" }); return; }

  // Verify the order exists (and belongs to the authenticated customer if token provided)
  let where = `id=?`;
  const params: unknown[] = [id];
  const authHeader = req.headers["authorization"];
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    const sess = db.prepare(`SELECT customer_id FROM sessions WHERE token=?`).get(authHeader.slice(7)) as Row | undefined;
    if (sess) { where += ` AND customer_id=?`; params.push(sess["customer_id"]); }
  }
  const existing = db.prepare(`SELECT id FROM orders WHERE ${where}`).get(...params) as Row | undefined;
  if (!existing) { res.status(404).json({ data: null, error: "Order not found" }); return; }

  db.prepare(`UPDATE orders SET live_activity_push_token=?, updated_at=? WHERE id=?`)
    .run(pushToken, new Date().toISOString(), id);

  res.json({ data: { ok: true }, error: null });
});

// ─── Admin endpoints ──────────────────────────────────────────────────────────

router.use("/admin/orders", requireAdmin);

router.get("/admin/orders", (req, res) => {
  const { status, type } = req.query as Record<string, string>;
  let sql = `SELECT * FROM orders WHERE 1=1`;
  const params: unknown[] = [];
  if (type === "drafts") { sql += ` AND is_draft=1`; }
  else if (type === "abandoned") { sql += ` AND is_abandoned=1`; }
  else { sql += ` AND is_draft=0 AND is_abandoned=0`; }
  if (status) { sql += ` AND status=?`; params.push(status); }
  sql += ` ORDER BY created_at DESC`;
  const rows = db.prepare(sql).all(...params) as Row[];
  res.json({ data: parseRows(rows), meta: { total: rows.length }, error: null });
});

router.get("/admin/orders/:id", (req, res) => {
  const order = parseOne(db.prepare(`SELECT * FROM orders WHERE id=?`).get(req.params["id"]) as Row | undefined);
  if (!order) { res.status(404).json({ data: null, meta: {}, error: "Order not found" }); return; }
  res.json({ data: order, meta: {}, error: null });
});

router.post("/admin/orders", (req, res) => {
  const id = `ord_${Date.now()}`;
  const now = new Date().toISOString();
  const b = req.body as Record<string, unknown>;
  const orderNum = generateOrderNumber();
  db.prepare(`INSERT INTO orders (id,order_number,customer_id,email,status,financial_status,fulfillment_status,subtotal,shipping,tax,total,currency,shipping_address,line_items,note,tags,is_draft,is_abandoned,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, orderNum, null, b["email"] ?? "", "pending", "pending", "unfulfilled", 0, 5.99, 0, 0, "USD", JSON.stringify(b["shippingAddress"] ?? {}), JSON.stringify(b["lineItems"] ?? []), b["note"] ?? "", "[]", 1, 0, now, now);
  logActivity("order.created", "Orders", "order", id, `Order ${orderNum}`, "Admin",
    { orderNumber: orderNum, email: b["email"] ?? "", status: "pending" });
  const order = parseOne(db.prepare(`SELECT * FROM orders WHERE id=?`).get(id) as Row | undefined);
  res.status(201).json({ data: order, meta: {}, error: null });
});

router.put("/admin/orders/:id", async (req, res) => {
  const id = req.params["id"];
  const existing = db.prepare(`SELECT order_number, customer_id, status, financial_status, fulfillment_status, delivery_stage, delivery_type, live_activity_push_token FROM orders WHERE id=?`).get(id) as Row | undefined;
  if (!existing) { res.status(404).json({ data: null, meta: {}, error: "Order not found" }); return; }
  const b = req.body as Record<string, unknown>;
  const now = new Date().toISOString();
  const prevStatus    = existing["status"]              as string;
  const prevFulfill   = existing["fulfillment_status"]  as string;
  const prevFinancial = existing["financial_status"]    as string;
  const orderNum      = existing["order_number"]        as string;
  const customerId    = existing["customer_id"]         as string | null;
  db.prepare(`UPDATE orders SET status=COALESCE(?,status), financial_status=COALESCE(?,financial_status), fulfillment_status=COALESCE(?,fulfillment_status), note=COALESCE(?,note), updated_at=? WHERE id=?`)
    .run(b["status"] ?? null, b["financialStatus"] ?? null, b["fulfillmentStatus"] ?? null, b["note"] ?? null, now, id);
  // Log meaningful status changes
  const newStatus    = (b["status"]            as string | undefined) ?? prevStatus;
  const newFulfill   = (b["fulfillmentStatus"] as string | undefined) ?? prevFulfill;
  const newFinancial = (b["financialStatus"]   as string | undefined) ?? prevFinancial;
  if (newStatus !== prevStatus) {
    const actionMap: Record<string, string> = { cancelled: "order.cancelled", processing: "order.processing", completed: "order.completed" };
    logActivity(actionMap[newStatus] ?? "order.updated", "Orders", "order", id, `Order ${orderNum}`, "Admin",
      { orderNumber: orderNum, from: prevStatus, to: newStatus });
  }
  if (newFulfill !== prevFulfill && newFulfill === "fulfilled") {
    logActivity("order.fulfilled", "Orders", "order", id, `Order ${orderNum}`, "Admin",
      { orderNumber: orderNum });
  }
  if (b["financialStatus"] === "refunded") {
    logActivity("order.refunded", "Orders", "order", id, `Order ${orderNum}`, "Admin",
      { orderNumber: orderNum });
  }

  // ── Notify the order owner on ANY meaningful change ──────────────────────────
  // Priority: order status → fulfillment → financial (one push per request to
  // avoid spamming when several fields change together). cancelled deep-links to
  // the in-app chat so the customer can reach support.
  const statusChanged    = newStatus    !== prevStatus;
  const fulfillChanged   = newFulfill   !== prevFulfill;
  const financialChanged = newFinancial !== prevFinancial;
  let notifKey: string | null = null;
  let notifUrl = "";
  if (statusChanged && STATUS_KEYS[newStatus]) {
    notifKey = STATUS_KEYS[newStatus]!;
    if (newStatus === "cancelled") notifUrl = "/(tabs)/chat";
  } else if (fulfillChanged && FULFILL_KEYS[newFulfill]) {
    notifKey = FULFILL_KEYS[newFulfill]!;
  } else if (financialChanged && FINANCIAL_KEYS[newFinancial]) {
    notifKey = FINANCIAL_KEYS[newFinancial]!;
  }
  const vars = buildVars(id, orderNum, customerId);
  const notif = notifKey
    ? getTemplate(notifKey, vars)
    : (statusChanged || fulfillChanged || financialChanged)
      ? { title: "تحديث على طلبك", body: `تم تحديث حالة طلبك ${orderNum}` }
      : null;
  if (customerId && notif) {
    try {
      await doSendNotification({
        title: notif.title,
        body: notif.body,
        url: notifUrl,
        targetAll: false,
        customerIds: [customerId],
      });
    } catch { /* non-fatal: notification failure must not block the update */ }
  }

  // ── If payment just confirmed → update Live Activity isPaid flag via APNs ───
  if (financialChanged && newFinancial === "paid") {
    const laToken      = existing["live_activity_push_token"] as string | null;
    const currentStage = (existing["delivery_stage"] as string | null) ?? "confirmed";
    const payDeliveryType = normalizeDeliveryType(existing["delivery_type"]);
    if (VALID_STAGES.includes(currentStage)) {
      const GONE_PAY = new Set(["BadDeviceToken", "Gone", "Unregistered", "ExpiredToken"]);
      let payLaGone = !laToken;
      if (laToken) {
        try {
          const r = await sendLiveActivityPush(laToken, { stage: currentStage as any, message: deliveryMessage(payDeliveryType, currentStage), isPaid: true, deliveryType: payDeliveryType });
          if (!r.ok && GONE_PAY.has(r.error ?? "")) {
            payLaGone = true;
            db.prepare(`UPDATE orders SET live_activity_push_token=NULL, updated_at=? WHERE id=?`).run(now, id);
          }
        } catch { /* non-fatal */ }
      }
      // Push-to-start fallback if the activity is gone
      if (payLaGone && customerId) {
        try {
          const custRow = db.prepare(`SELECT first_name, last_name, live_activity_pts_token FROM customers WHERE id=?`).get(customerId) as Row | undefined;
          const pts = custRow?.["live_activity_pts_token"] as string | null;
          if (pts) {
            const oRow = db.prepare(`SELECT total FROM orders WHERE id=?`).get(id) as Row | undefined;
            const cName = `${custRow?.["first_name"] ?? ""} ${custRow?.["last_name"] ?? ""}`.trim();
            await sendLiveActivityStartPush(pts, {
              orderNumber:  orderNum,
              customerName: cName,
              stage:        currentStage as any,
              message:      deliveryMessage(payDeliveryType, currentStage),
              priceText:    formatIQD(Number(oRow?.["total"] ?? 0)),
              isPaid:       true,
              deliveryType: payDeliveryType,
            });
          }
        } catch { /* non-fatal */ }
      }
    }
  }

  const order = parseOne(db.prepare(`SELECT * FROM orders WHERE id=?`).get(id) as Row | undefined);
  res.json({ data: order, meta: {}, error: null });
});

// ─── Admin: update delivery stage + push Live Activity via APNs ───────────────

router.post("/admin/orders/:id/delivery-stage", async (req, res) => {
  const id = req.params["id"];
  const { stage, message } = req.body as { stage: string; message?: string };
  if (!stage) { res.status(400).json({ data: null, error: "stage required" }); return; }
  if (!VALID_STAGES.includes(stage)) { res.status(400).json({ data: null, error: "invalid stage" }); return; }

  const existing = db.prepare(`
    SELECT o.order_number, o.customer_id, o.live_activity_push_token, o.financial_status, o.total, o.delivery_type,
           c.first_name, c.last_name, c.live_activity_pts_token
    FROM orders o LEFT JOIN customers c ON c.id = o.customer_id
    WHERE o.id = ?
  `).get(id) as Row | undefined;
  if (!existing) { res.status(404).json({ data: null, meta: {}, error: "Order not found" }); return; }

  const deliveryType = normalizeDeliveryType(existing["delivery_type"]);
  // Pickup orders skip the shipping stage entirely.
  if (deliveryType === "pickup" && stage === "shipping") {
    res.status(400).json({ data: null, error: "shipping stage not allowed for pickup orders" }); return;
  }

  const now = new Date().toISOString();
  db.prepare(`UPDATE orders SET delivery_stage=?, updated_at=? WHERE id=?`).run(stage, now, id);

  const orderNum = existing["order_number"] as string;
  logActivity("order.stage_updated", "Orders", "order", id, `Order ${orderNum}`, "Admin",
    { orderNumber: orderNum, stage, message });

  // Explicit message wins; otherwise derive the delivery-duration line from type + stage.
  const laMessage = message && message.trim() ? message : deliveryMessage(deliveryType, stage);
  const toChat = stage === "delivered" || stage === "issue" || stage === "cancelled";
  const vars = buildVars(id, orderNum, existing["customer_id"] as string | null);
  const copy = getTemplate(STAGE_TO_KEY[stage] ?? `stage:${stage}`, vars);

  // 1) Update the iOS Live Activity directly via APNs
  const laPushToken    = existing["live_activity_push_token"] as string | null;
  const ptsToken       = existing["live_activity_pts_token"]  as string | null;
  const financialStatus = existing["financial_status"] as string | null;
  const isPaid         = financialStatus === "paid";
  const customerName   = `${existing["first_name"] ?? ""} ${existing["last_name"] ?? ""}`.trim();
  const priceText      = formatIQD(Number(existing["total"] ?? 0));

  // APNs errors that mean the Live Activity was dismissed/ended on the device
  const GONE_ERRORS = new Set(["BadDeviceToken", "Gone", "Unregistered", "ExpiredToken"]);
  let apnsResult: { ok: boolean; error?: string } = { ok: true };
  let activityWasGone = !laPushToken;

  if (laPushToken) {
    try {
      apnsResult = await sendLiveActivityPush(laPushToken, { stage: stage as any, message: laMessage, isPaid, deliveryType });
    } catch (e: unknown) {
      apnsResult = { ok: false, error: String(e) };
    }
    // Token is stale (activity was dismissed by the user) — clear it
    if (!apnsResult.ok && GONE_ERRORS.has(apnsResult.error ?? "")) {
      activityWasGone = true;
      db.prepare(`UPDATE orders SET live_activity_push_token=NULL, updated_at=? WHERE id=?`).run(now, id);
    }
  }

  // Push-to-start fallback: if no active LA (never started or dismissed) → start a new one
  if (activityWasGone && ptsToken) {
    try {
      const startResult = await sendLiveActivityStartPush(ptsToken, {
        orderNumber:  orderNum,
        customerName,
        stage:        stage as any,
        message:      laMessage,
        priceText,
        isPaid,
        deliveryType,
        alertTitle:   copy?.title ?? "Mora",
        alertBody:    copy?.body ?? "",
      });
      if (startResult.ok) apnsResult = startResult;
    } catch { /* non-fatal */ }
  }

  // 2) Regular push + in-app notification
  const customerId = existing["customer_id"] as string | null;
  if (customerId && copy) {
    try {
      await doSendNotification({
        title: copy.title,
        body: copy.body,
        url: toChat ? "/(tabs)/chat" : "/orders",
        targetAll: false,
        customerIds: [customerId],
      });
    } catch { /* non-fatal */ }
  }

  const order = parseOne(db.prepare(`SELECT * FROM orders WHERE id=?`).get(id) as Row | undefined);
  res.json({ data: { order, apns: apnsResult, hasPushToken: !!laPushToken, ptsUsed: activityWasGone && !!ptsToken }, error: null });
});

router.delete("/admin/orders/:id", (req, res) => {
  const id = req.params["id"];
  const existing = db.prepare(`SELECT order_number FROM orders WHERE id=?`).get(id) as Row | undefined;
  if (!existing) { res.status(404).json({ data: null, meta: {}, error: "Order not found" }); return; }
  logActivity("order.deleted", "Orders", "order", id, `Order ${existing["order_number"] as string}`, "Admin", {});
  db.prepare(`DELETE FROM orders WHERE id=?`).run(id);
  res.json({ data: { deleted: true }, meta: {}, error: null });
});

// ─── Admin: START a Live Activity on the customer's device via push-to-start ───
// Requires the customer to have a stored push-to-start token (captured by the app
// on iOS 17.2+ after launching the updated build). This is the robust, server-
// driven way to make the Dynamic Island / Lock Screen activity appear, and lets
// us start one on a specific device on demand for testing.
router.post("/admin/orders/:id/start-live-activity", async (req, res) => {
  const id = req.params["id"];
  const { stage, message } = req.body as { stage?: string; message?: string };

  const order = db.prepare(`SELECT order_number, customer_id, total, payment_method, financial_status, delivery_type FROM orders WHERE id=?`).get(id) as Row | undefined;
  if (!order) { res.status(404).json({ data: null, error: "Order not found" }); return; }

  const customerId = order["customer_id"] as string | null;
  if (!customerId) { res.status(400).json({ data: null, error: "Order has no customer" }); return; }

  const cust = db.prepare(`SELECT first_name, last_name, live_activity_pts_token FROM customers WHERE id=?`)
    .get(customerId) as Row | undefined;
  const ptsToken = cust?.["live_activity_pts_token"] as string | null | undefined;
  if (!ptsToken) {
    res.status(400).json({ data: null, error: "No push-to-start token for this customer. The customer must open the updated app (iOS 17.2+) at least once while logged in." });
    return;
  }

  const useStage   = (stage && stage.trim()) ? stage : "confirmed";
  if (!VALID_STAGES.includes(useStage)) { res.status(400).json({ data: null, error: "invalid stage" }); return; }
  const orderNum   = order["order_number"] as string;
  const customerName = `${cust?.["first_name"] ?? ""} ${cust?.["last_name"] ?? ""}`.trim() || "Customer";
  const copy       = getTemplate(STAGE_TO_KEY[useStage] ?? `stage:${useStage}`, buildVars(id, orderNum, customerId));
  const defaultBody = copy?.body ?? "";
  // Derive the delivery-duration line from the order's delivery type + stage.
  const laMessage  = message && message.trim() ? message : deliveryMessage(normalizeDeliveryType(order["delivery_type"]), useStage);
  const priceText  = formatIQD(Number(order["total"] ?? 0));
  const isPaid     = order["payment_method"] === "online" && order["financial_status"] === "paid";

  const result = await sendLiveActivityStartPush(ptsToken, {
    orderNumber:  orderNum,
    customerName,
    stage:        useStage as any,
    message:      laMessage,
    priceText,
    isPaid,
    deliveryType: normalizeDeliveryType(order["delivery_type"]),
    alertTitle:   copy?.title ?? "Mora",
    alertBody:    defaultBody,
  });

  // Record the stage we started at so subsequent per-activity updates stay consistent.
  if (result.ok) {
    db.prepare(`UPDATE orders SET delivery_stage=?, updated_at=? WHERE id=?`)
      .run(useStage, new Date().toISOString(), id);
  }

  res.status(result.ok ? 200 : 502)
    .json({ data: { ok: result.ok, apns: result }, error: result.ok ? null : result.error });
});

export default router;
