import { Router } from "express";
import { db } from "../lib/db.js";
import { requireAdmin } from "../middlewares/auth.js";
import { TEMPLATE_DEFAULTS, getTemplate } from "../lib/templates.js";

const router = Router();

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function now() {
  return new Date().toISOString();
}

function getCustomerId(req: any): string | null {
  const auth = req.headers["authorization"] as string | undefined;
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const row = db
    .prepare("SELECT customer_id FROM sessions WHERE token = ?")
    .get(token) as { customer_id: string } | undefined;
  return row?.customer_id ?? null;
}

// ── Helper: save in-app notification(s) for specific customers ────────────────
function saveInAppNotifications(opts: {
  customerIds: string[];
  title: string;
  body: string;
  url?: string;
  imageUrl?: string;
}) {
  const stmt = db.prepare(`
    INSERT INTO customer_notifications (id, customer_id, title, body, image_url, url, read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?)
  `);
  for (const cid of opts.customerIds) {
    stmt.run(uid(), cid, opts.title, opts.body, opts.imageUrl ?? "", opts.url ?? "", now());
  }
}

// ── STORE: register push token ─────────────────────────────────────────────────
router.post("/store/notifications/token", (req, res) => {
  const customerId = getCustomerId(req);
  if (!customerId) return res.status(401).json({ data: null, error: "Unauthorized" });

  const { token, platform = "ios" } = req.body as { token?: string; platform?: string };
  if (!token) return res.status(400).json({ data: null, error: "token required" });

  db.prepare(`
    INSERT INTO push_tokens (id, customer_id, token, platform, created_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(token) DO UPDATE SET customer_id = excluded.customer_id, platform = excluded.platform
  `).run(uid(), customerId, token, platform, now());

  return res.json({ data: { ok: true }, error: null });
});

// ── STORE: register Live Activity push-to-start token (iOS 17.2+) ──────────────
// Captured by the app on launch. Lets the backend START a Live Activity on this
// customer's device remotely via APNs, independent of the on-device request path.
router.post("/store/notifications/live-activity-pts-token", (req, res) => {
  const customerId = getCustomerId(req);
  if (!customerId) return res.status(401).json({ data: null, error: "Unauthorized" });

  const { token } = req.body as { token?: string };
  if (!token) return res.status(400).json({ data: null, error: "token required" });

  db.prepare(`UPDATE customers SET live_activity_pts_token = ?, updated_at = ? WHERE id = ?`)
    .run(token, now(), customerId);

  return res.json({ data: { ok: true }, error: null });
});

// ── STORE: remove push token (logout) ─────────────────────────────────────────
// Also clears live_activity_pts_token so the logged-out device can't receive
// a new Live Activity start for the next user's orders.
router.delete("/store/notifications/token", (req, res) => {
  const customerId = getCustomerId(req);
  const { token } = req.body as { token?: string };
  if (token) db.prepare("DELETE FROM push_tokens WHERE token = ?").run(token);
  // Clear the push-to-start token on logout so it can't be reused for a different account
  if (customerId) {
    db.prepare("UPDATE customers SET live_activity_pts_token = NULL, updated_at = ? WHERE id = ?")
      .run(now(), customerId);
  }
  return res.json({ data: { ok: true }, error: null });
});

// ── STORE: list in-app notifications ──────────────────────────────────────────
router.get("/store/notifications", (req, res) => {
  const customerId = getCustomerId(req);
  if (!customerId) return res.status(401).json({ data: null, error: "Unauthorized" });

  const rows = db
    .prepare(`SELECT * FROM customer_notifications WHERE customer_id = ? ORDER BY created_at DESC LIMIT 60`)
    .all(customerId) as any[];

  return res.json({
    data: rows.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      imageUrl: r.image_url,
      url: r.url,
      read: r.read === 1,
      createdAt: r.created_at,
    })),
    error: null,
  });
});

// ── STORE: unread count ────────────────────────────────────────────────────────
router.get("/store/notifications/unread-count", (req, res) => {
  const customerId = getCustomerId(req);
  if (!customerId) return res.json({ data: { count: 0 }, error: null });

  const row = db
    .prepare(`SELECT COUNT(*) as n FROM customer_notifications WHERE customer_id = ? AND read = 0`)
    .get(customerId) as { n: number };

  return res.json({ data: { count: row.n }, error: null });
});

// ── STORE: mark all notifications as read ──────────────────────────────────────
router.post("/store/notifications/read-all", (req, res) => {
  const customerId = getCustomerId(req);
  if (!customerId) return res.status(401).json({ data: null, error: "Unauthorized" });

  db.prepare(`UPDATE customer_notifications SET read = 1 WHERE customer_id = ?`).run(customerId);
  return res.json({ data: { ok: true }, error: null });
});

// ── STORE: request a restock notification ("Notify me") ───────────────────────
router.post("/store/restock-requests", (req, res) => {
  const customerId = getCustomerId(req);
  if (!customerId) return res.status(401).json({ data: null, error: "Unauthorized" });

  const { productId, variantId } = req.body as { productId?: string; variantId?: string };
  if (!productId || !variantId) {
    return res.status(400).json({ data: null, error: "productId and variantId required" });
  }

  // Validate the variant exists and actually belongs to the given product, so a
  // bad row can't poison the deep-link/content for other waiters on that variant.
  const variant = db
    .prepare("SELECT product_id FROM variants WHERE id = ?")
    .get(variantId) as { product_id: string } | undefined;
  if (!variant || variant.product_id !== productId) {
    return res.status(400).json({ data: null, error: "Invalid product or variant" });
  }

  const customer = db.prepare("SELECT email FROM customers WHERE id = ?").get(customerId) as
    | { email: string }
    | undefined;
  // Snapshot the customer's current push token (send-time still reads push_tokens
  // for the freshest token; this is a record of what we had at request time).
  const tokenRow = db
    .prepare("SELECT token FROM push_tokens WHERE customer_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(customerId) as { token: string } | undefined;

  db.prepare(`
    INSERT INTO restock_requests (id, customer_id, product_id, variant_id, email, push_token, notified, created_at, notified_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?, NULL)
    ON CONFLICT(customer_id, variant_id)
      DO UPDATE SET notified = 0, notified_at = NULL, product_id = excluded.product_id,
                    email = excluded.email, push_token = excluded.push_token
  `).run(uid(), customerId, productId, variantId, customer?.email ?? "", tokenRow?.token ?? "", now());

  return res.json({ data: { ok: true }, error: null });
});

// ── STORE: list the variants this customer is waiting on (pending only) ────────
router.get("/store/restock-requests", (req, res) => {
  const customerId = getCustomerId(req);
  if (!customerId) return res.json({ data: { variantIds: [] }, error: null });

  const rows = db
    .prepare("SELECT variant_id FROM restock_requests WHERE customer_id = ? AND notified = 0")
    .all(customerId) as { variant_id: string }[];

  return res.json({ data: { variantIds: rows.map((r) => r.variant_id) }, error: null });
});

// ── Send restock alerts for a variant that just came back in stock ────────────
// Called from the admin inventory/variant routes when inventory goes 0 → >0.
export async function notifyRestock(variantId: string): Promise<void> {
  const pending = db
    .prepare("SELECT id, customer_id, product_id FROM restock_requests WHERE variant_id = ? AND notified = 0")
    .all(variantId) as { id: string; customer_id: string; product_id: string }[];
  if (pending.length === 0) return;

  const productId = pending[0]!.product_id;
  const product = db.prepare("SELECT title FROM products WHERE id = ?").get(productId) as
    | { title: string }
    | undefined;
  const productName = product?.title ?? "المنتج";

  const tmpl = getTemplate("restock:available", { productName });
  const title = tmpl?.title ?? `${productName} رجع متوفر 🎉`;
  const body = tmpl?.body ?? `المنتج "${productName}" صار متوفر، اطلبه قبل ما يخلص`;

  const customerIds = [...new Set(pending.map((p) => p.customer_id))];

  await doSendNotification({
    title,
    body,
    url: `/product/${productId}`,
    targetAll: false,
    customerIds,
  });

  const mark = db.prepare("UPDATE restock_requests SET notified = 1, notified_at = ? WHERE id = ?");
  const ts = now();
  for (const p of pending) mark.run(ts, p.id);
}

// ── ADMIN: list tokens & stats ─────────────────────────────────────────────────
router.get("/admin/notifications/stats", requireAdmin, (_req, res) => {
  const tokens = (db.prepare("SELECT COUNT(*) as n FROM push_tokens").get() as any).n as number;
  const customers = (db.prepare("SELECT COUNT(DISTINCT customer_id) as n FROM push_tokens").get() as any).n as number;
  const totalSent = (db.prepare("SELECT COALESCE(SUM(tokens_sent),0) as n FROM notification_log").get() as any).n as number;
  const totalSuccess = (db.prepare("SELECT COALESCE(SUM(success),0) as n FROM notification_log").get() as any).n as number;
  const ios = (db.prepare("SELECT COUNT(*) as n FROM push_tokens WHERE platform='ios'").get() as any).n as number;
  const android = (db.prepare("SELECT COUNT(*) as n FROM push_tokens WHERE platform='android'").get() as any).n as number;
  return res.json({ data: { tokens, customers, totalSent, totalSuccess, ios, android }, error: null });
});

// ── ADMIN: wanted products (restock requests aggregated by product) ─────────────
router.get("/admin/restock-requests", requireAdmin, (_req, res) => {
  const rows = db.prepare(`
    SELECT
      r.product_id                              AS productId,
      p.title                                   AS title,
      p.images                                  AS images,
      p.price                                   AS price,
      p.status                                  AS status,
      COUNT(*)                                  AS totalRequests,
      SUM(CASE WHEN r.notified = 0 THEN 1 ELSE 0 END) AS pendingRequests,
      COUNT(DISTINCT r.customer_id)             AS distinctCustomers,
      MAX(r.created_at)                         AS lastRequestedAt
    FROM restock_requests r
    LEFT JOIN products p ON p.id = r.product_id
    GROUP BY r.product_id
    ORDER BY pendingRequests DESC, totalRequests DESC, lastRequestedAt DESC
  `).all() as any[];

  const data = rows.map((row) => {
    let image = "";
    try {
      const imgs = JSON.parse(row.images ?? "[]");
      if (Array.isArray(imgs) && imgs.length > 0) image = imgs[0];
    } catch {
      // images column malformed → leave blank
    }
    return {
      productId: row.productId,
      title: row.title ?? null,
      image,
      price: row.price ?? null,
      status: row.status ?? null,
      totalRequests: Number(row.totalRequests) || 0,
      pendingRequests: Number(row.pendingRequests) || 0,
      distinctCustomers: Number(row.distinctCustomers) || 0,
      lastRequestedAt: row.lastRequestedAt ?? null,
    };
  });

  return res.json({ data, error: null });
});

// ── ADMIN: notification history ────────────────────────────────────────────────
router.get("/admin/notifications", requireAdmin, (req, res) => {
  const limit = Math.min(Number((req.query as any).limit) || 50, 200);
  const rows = db.prepare(
    "SELECT * FROM notification_log ORDER BY created_at DESC LIMIT ?"
  ).all(limit) as any[];
  return res.json({ data: rows, error: null });
});

// ── ADMIN: shared send logic ───────────────────────────────────────────────────
export async function doSendNotification(opts: {
  title: string;
  body: string;
  url?: string;
  imageUrl?: string;
  sound?: string;
  badge?: number;
  targetAll?: boolean;
  customerIds?: string[];
}): Promise<{ sent: number; success: number; failed: number; logId: string }> {
  const { title, body, url = "", imageUrl = "", sound = "default", badge, targetAll = true, customerIds } = opts;

  let targetCustomerIds: string[] = [];
  let tokens: string[] = [];

  if (targetAll) {
    tokens = (db.prepare("SELECT token FROM push_tokens").all() as { token: string }[]).map((r) => r.token);
    targetCustomerIds = (db.prepare("SELECT id FROM customers").all() as { id: string }[]).map((r) => r.id);
  } else if (customerIds?.length) {
    const placeholders = customerIds.map(() => "?").join(",");
    tokens = (
      db
        .prepare(`SELECT token FROM push_tokens WHERE customer_id IN (${placeholders})`)
        .all(...customerIds) as { token: string }[]
    ).map((r) => r.token);
    targetCustomerIds = customerIds;
  }

  // Save in-app notification for each target customer
  if (targetCustomerIds.length > 0) {
    saveInAppNotifications({ customerIds: targetCustomerIds, title, body, url, imageUrl });
  }

  if (tokens.length === 0) {
    const logId = uid();
    db.prepare(
      "INSERT INTO notification_log (id, type, title, body, payload, tokens_sent, success, failed, created_at) VALUES (?,?,?,?,?,0,0,0,?)"
    ).run(logId, "push", title, body, JSON.stringify({ url }), now());
    return { sent: 0, success: 0, failed: 0, logId };
  }

  const CHUNK = 100;
  let success = 0;
  let failed = 0;

  for (let i = 0; i < tokens.length; i += CHUNK) {
    const chunk = tokens.slice(i, i + CHUNK).map((to) => ({
      to,
      title,
      body,
      data: { url },
      sound,
      ...(badge !== undefined ? { badge } : {}),
    }));

    try {
      const resp = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "accept-encoding": "gzip, deflate",
        },
        body: JSON.stringify(chunk),
      });

      if (resp.ok) {
        const json = (await resp.json()) as { data: Array<{ status: string }> };
        for (const ticket of json.data ?? []) {
          if (ticket.status === "ok") success++;
          else failed++;
        }
      } else {
        failed += chunk.length;
      }
    } catch {
      failed += chunk.length;
    }
  }

  const logId = uid();
  db.prepare(
    "INSERT INTO notification_log (id, type, title, body, payload, tokens_sent, success, failed, created_at) VALUES (?,?,?,?,?,?,?,?,?)"
  ).run(logId, "push", title, body, JSON.stringify({ url }), tokens.length, success, failed, now());

  return { sent: tokens.length, success, failed, logId };
}

// ── ADMIN: bulk push (legacy + updated with in-app saving) ────────────────────
router.post("/admin/notifications/push", requireAdmin, async (req, res) => {
  const {
    title, body, url, imageUrl, sound, badge, targetAll = true, customerIds,
  } = req.body as {
    title: string; body: string; url?: string; imageUrl?: string;
    sound?: string; badge?: number; targetAll?: boolean; customerIds?: string[];
  };

  if (!title || !body) {
    return res.status(400).json({ data: null, error: "title and body are required" });
  }

  const result = await doSendNotification({ title, body, url, imageUrl, sound, badge, targetAll, customerIds });
  return res.json({ data: result, error: null });
});

// ── ADMIN: send (new endpoint with deep link) ─────────────────────────────────
router.post("/admin/notifications/send", requireAdmin, async (req, res) => {
  const { title, body, url, imageUrl, targetAll = false, customerIds } = req.body as {
    title: string; body: string; url?: string; imageUrl?: string;
    targetAll?: boolean; customerIds?: string[];
  };

  if (!title || !body) {
    return res.status(400).json({ data: null, error: "title and body are required" });
  }
  if (!targetAll && (!customerIds || customerIds.length === 0)) {
    return res.status(400).json({ data: null, error: "specify customerIds or set targetAll=true" });
  }

  const result = await doSendNotification({ title, body, url, imageUrl, targetAll, customerIds });
  return res.json({ data: result, error: null });
});

// ── ADMIN: Live Activity update ────────────────────────────────────────────────
router.post("/admin/notifications/live-activity", requireAdmin, async (req, res) => {
  const { orderId, stage, message, customerIds } = req.body as {
    orderId?: string; stage: string; message?: string; customerIds?: string[];
  };

  const stageLabels: Record<string, string> = {
    confirmed: "تم تثبيت طلبك بنجاح",
    preparing: "تم تجهيز طلبك",
    shipping: "طلبك في الطريق إليك",
    delivered: "تم توصيل طلبك",
    issue: message ?? "طلبك يحتاج مراجعة",
  };

  const title = orderId ? `طلب #${orderId}` : "تحديث الطلب";
  const body = stageLabels[stage] ?? stage;

  let tokens: string[] = [];
  if (customerIds?.length) {
    const placeholders = customerIds.map(() => "?").join(",");
    tokens = (
      db
        .prepare(`SELECT token FROM push_tokens WHERE customer_id IN (${placeholders})`)
        .all(...customerIds) as { token: string }[]
    ).map((r) => r.token);
  }

  const payload = { type: "live_activity", stage, orderId, message };
  let success = 0;
  let failed = 0;

  if (tokens.length > 0) {
    try {
      const messages = tokens.map((to) => ({
        to, title, body, data: payload, sound: "default",
      }));
      const resp = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(messages),
      });
      if (resp.ok) {
        const json = (await resp.json()) as { data: Array<{ status: string }> };
        for (const ticket of json.data ?? []) {
          if (ticket.status === "ok") success++;
          else failed++;
        }
      } else {
        failed += tokens.length;
      }
    } catch {
      failed += tokens.length;
    }
  }

  const logId = uid();
  db.prepare(
    "INSERT INTO notification_log (id, type, title, body, payload, tokens_sent, success, failed, created_at) VALUES (?,?,?,?,?,?,?,?,?)"
  ).run(logId, "live_activity", title, body, JSON.stringify(payload), tokens.length, success, failed, now());

  return res.json({ data: { sent: tokens.length, success, failed, logId }, error: null });
});

// ─── Admin: notification template CRUD ───────────────────────────────────────

router.get("/admin/notification-templates", requireAdmin, (req, res) => {
  const rows = db.prepare("SELECT key, title, body, updated_at FROM notification_templates").all() as Array<{
    key: string; title: string; body: string; updated_at: string;
  }>;
  const rowMap = Object.fromEntries(rows.map((r) => [r.key, r]));

  const result = TEMPLATE_DEFAULTS.map((def) => ({
    key:          def.key,
    label:        def.label,
    vars:         def.vars,
    defaultTitle: def.title,
    defaultBody:  def.body,
    title:        rowMap[def.key]?.title      ?? def.title,
    body:         rowMap[def.key]?.body       ?? def.body,
    isCustomized: !!rowMap[def.key],
    updated_at:   rowMap[def.key]?.updated_at ?? null,
  }));

  return res.json({ data: result, error: null });
});

router.put("/admin/notification-templates/:key", requireAdmin, (req, res) => {
  const key = req.params["key"];
  const { title, body } = req.body as { title?: string; body?: string };

  if (!TEMPLATE_DEFAULTS.find((d) => d.key === key)) {
    return res.status(400).json({ data: null, error: "مفتاح قالب غير صحيح" });
  }
  if (!title?.trim() || !body?.trim()) {
    return res.status(400).json({ data: null, error: "العنوان والمحتوى مطلوبان" });
  }

  db.prepare(`
    INSERT INTO notification_templates (key, title, body, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET title = excluded.title, body = excluded.body, updated_at = excluded.updated_at
  `).run(key, title.trim(), body.trim(), now());

  return res.json({ data: { ok: true }, error: null });
});

router.delete("/admin/notification-templates/:key", requireAdmin, (req, res) => {
  const key = req.params["key"];
  const def = TEMPLATE_DEFAULTS.find((d) => d.key === key);
  if (!def) return res.status(400).json({ data: null, error: "مفتاح قالب غير صحيح" });

  db.prepare("DELETE FROM notification_templates WHERE key = ?").run(key);
  return res.json({ data: { ok: true, title: def.title, body: def.body }, error: null });
});

export default router;
