import { Router } from "express";
import db, { parseRows, parseOne, logActivity } from "../lib/db.js";
import { requireAdmin } from "../middlewares/auth.js";
import type { Row } from "../lib/types.js";
import { sendLiveActivityPush, sendLiveActivityStartPush } from "../lib/apns.js";
import { doSendNotification } from "./notifications.js";
import { validateDiscount, redeemDiscount } from "../lib/discounts.js";

// Arabic push + in-app notification copy per delivery stage.
// {n} is replaced with the order number.
const STAGE_NOTIF: Record<string, { title: string; body: string }> = {
  confirmed: { title: "تم تثبيت طلبك ✅", body: "طلبك {n} قيد المعالجة الآن" },
  preparing: { title: "يتم تجهيز طلبك 📦", body: "نقوم بتحضير طلبك {n} للشحن" },
  shipping:  { title: "طلبك في الطريق 🚚", body: "طلبك {n} خرج للتوصيل إليك" },
  delivered: { title: "تم توصيل طلبك 🎉", body: "نتمنى أن ينال طلبك {n} إعجابك" },
  issue:     { title: "هناك مشكلة في طلبك ⚠️", body: "يرجى التواصل معنا بخصوص طلبك {n}" },
  cancelled: { title: "تم إلغاء طلبك ❌", body: "تم إلغاء طلبك {n}. تواصل معنا للمساعدة" },
};

// Allowed delivery stages for Live Activity content-state.
const VALID_STAGES = ["confirmed", "preparing", "shipping", "delivered", "issue", "cancelled"];

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

// ─── Store: customer place order ─────────────────────────────────────────────

router.post("/store/orders", (req, res) => {
  const id = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const b = req.body as Record<string, unknown>;
  const count = (db.prepare(`SELECT COUNT(*) AS n FROM orders`).get() as Row)["n"] as number;
  const orderNum = `#${1000 + count + 1}`;

  const subtotal = Number(b["subtotal"]) || 0;

  const lineItems = (b["lineItems"] as Array<{ quantity?: number }> | undefined) ?? [];
  const itemCount = lineItems.reduce((n, it) => n + (Number(it?.quantity) || 0), 0);

  // ── Shipping: compute from the selected governorate (server-authoritative) ──
  // The client-sent `shipping` is never trusted; price is derived only from the
  // selected enabled zone. A valid governorate is required.
  const governorate = ((b["governorate"] as string) ?? "").trim();
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
  let shipping = Number(zone["price"]) || 0;

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
  if (!freeShipping) {
    const rule = db.prepare(
      `SELECT id FROM shipping_rules WHERE enabled=1 AND threshold IS NOT NULL AND threshold <= ? LIMIT 1`,
    ).get(subtotal) as Row | undefined;
    if (rule) freeShipping = true;
  }
  if (freeShipping) shipping = 0;

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

  db.prepare(
    `INSERT INTO orders (id,order_number,customer_id,email,status,financial_status,fulfillment_status,subtotal,shipping,tax,total,currency,discount_code,discount_amount,shipping_address,line_items,note,tags,is_draft,is_abandoned,delivery_stage,payment_method,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    id, orderNum, customerId, email,
    "pending", "pending", "unfulfilled",
    subtotal, shipping, 0, total, "IQD",
    appliedCode, discountAmount,
    JSON.stringify(b["shippingAddress"] ?? {}),
    JSON.stringify(b["lineItems"] ?? []),
    (b["note"] as string) ?? "", "[]",
    0, 0, "confirmed", paymentMethod, now, now
  );

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
  const count = (db.prepare(`SELECT COUNT(*) AS n FROM orders`).get() as Row)["n"] as number;
  const b = req.body as Record<string, unknown>;
  const orderNum = `#${1000 + count}`;
  db.prepare(`INSERT INTO orders (id,order_number,customer_id,email,status,financial_status,fulfillment_status,subtotal,shipping,tax,total,currency,shipping_address,line_items,note,tags,is_draft,is_abandoned,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, orderNum, null, b["email"] ?? "", "pending", "pending", "unfulfilled", 0, 5.99, 0, 0, "USD", JSON.stringify(b["shippingAddress"] ?? {}), JSON.stringify(b["lineItems"] ?? []), b["note"] ?? "", "[]", 1, 0, now, now);
  logActivity("order.created", "Orders", "order", id, `Order ${orderNum}`, "Admin",
    { orderNumber: orderNum, email: b["email"] ?? "", status: "pending" });
  const order = parseOne(db.prepare(`SELECT * FROM orders WHERE id=?`).get(id) as Row | undefined);
  res.status(201).json({ data: order, meta: {}, error: null });
});

router.put("/admin/orders/:id", (req, res) => {
  const id = req.params["id"];
  const existing = db.prepare(`SELECT order_number, status, fulfillment_status FROM orders WHERE id=?`).get(id) as Row | undefined;
  if (!existing) { res.status(404).json({ data: null, meta: {}, error: "Order not found" }); return; }
  const b = req.body as Record<string, unknown>;
  const now = new Date().toISOString();
  const prevStatus  = existing["status"]              as string;
  const prevFulfill = existing["fulfillment_status"]  as string;
  const orderNum    = existing["order_number"]        as string;
  db.prepare(`UPDATE orders SET status=COALESCE(?,status), financial_status=COALESCE(?,financial_status), fulfillment_status=COALESCE(?,fulfillment_status), note=COALESCE(?,note), updated_at=? WHERE id=?`)
    .run(b["status"] ?? null, b["financialStatus"] ?? null, b["fulfillmentStatus"] ?? null, b["note"] ?? null, now, id);
  // Log meaningful status changes
  const newStatus  = (b["status"]              as string | undefined) ?? prevStatus;
  const newFulfill = (b["fulfillmentStatus"]   as string | undefined) ?? prevFulfill;
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
  const order = parseOne(db.prepare(`SELECT * FROM orders WHERE id=?`).get(id) as Row | undefined);
  res.json({ data: order, meta: {}, error: null });
});

// ─── Admin: update delivery stage + push Live Activity via APNs ───────────────

router.post("/admin/orders/:id/delivery-stage", async (req, res) => {
  const id = req.params["id"];
  const { stage, message } = req.body as { stage: string; message?: string };
  if (!stage) { res.status(400).json({ data: null, error: "stage required" }); return; }
  if (!VALID_STAGES.includes(stage)) { res.status(400).json({ data: null, error: "invalid stage" }); return; }

  const existing = db.prepare(`SELECT order_number, customer_id, live_activity_push_token FROM orders WHERE id=?`).get(id) as Row | undefined;
  if (!existing) { res.status(404).json({ data: null, meta: {}, error: "Order not found" }); return; }

  const now = new Date().toISOString();
  db.prepare(`UPDATE orders SET delivery_stage=?, updated_at=? WHERE id=?`).run(stage, now, id);

  const orderNum = existing["order_number"] as string;
  logActivity("order.stage_updated", "Orders", "order", id, `Order ${orderNum}`, "Admin",
    { orderNumber: orderNum, stage, message });

  // Default Arabic copy for this stage (admin-supplied message overrides the body)
  const copy = STAGE_NOTIF[stage];
  const defaultBody = copy ? copy.body.replace("{n}", orderNum) : "";
  const laMessage = message && message.trim() ? message : defaultBody;
  const isContact = stage === "issue" || stage === "cancelled";

  // 1) Update the iOS Live Activity directly via APNs (if a token is registered)
  const laPushToken = existing["live_activity_push_token"] as string | null;
  let apnsResult: { ok: boolean; error?: string } = { ok: true };
  if (laPushToken) {
    try {
      apnsResult = await sendLiveActivityPush(laPushToken, {
        stage: stage as any,
        message: laMessage,
      });
    } catch (e: unknown) {
      apnsResult = { ok: false, error: String(e) };
    }
  }

  // 2) Send a regular push + save an in-app notification for the customer
  //    (covers the mobile app and the web store notification center).
  //    issue/cancelled deep-link to the in-app chat ("Contact Us").
  const customerId = existing["customer_id"] as string | null;
  if (customerId && copy) {
    try {
      await doSendNotification({
        title: copy.title,
        body: defaultBody,
        url: isContact ? "/(tabs)/chat" : "",
        targetAll: false,
        customerIds: [customerId],
      });
    } catch { /* non-fatal */ }
  }

  const order = parseOne(db.prepare(`SELECT * FROM orders WHERE id=?`).get(id) as Row | undefined);
  res.json({ data: { order, apns: apnsResult, hasPushToken: !!laPushToken }, error: null });
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

  const order = db.prepare(`SELECT order_number, customer_id FROM orders WHERE id=?`).get(id) as Row | undefined;
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
  const copy       = STAGE_NOTIF[useStage];
  const defaultBody = copy ? copy.body.replace("{n}", orderNum) : "";
  const laMessage  = message && message.trim() ? message : defaultBody;

  const result = await sendLiveActivityStartPush(ptsToken, {
    orderNumber:  orderNum,
    customerName,
    stage:        useStage as any,
    message:      laMessage,
    alertTitle:   copy?.title ?? "Mora",
    alertBody:    laMessage,
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
