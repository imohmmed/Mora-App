import { Router } from "express";
import { db } from "../lib/db.js";
import { requireAdmin } from "../middlewares/auth.js";

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

// ── STORE: remove push token (logout) ─────────────────────────────────────────
router.delete("/store/notifications/token", (req, res) => {
  const { token } = req.body as { token?: string };
  if (token) db.prepare("DELETE FROM push_tokens WHERE token = ?").run(token);
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
    preparing: "يتم تجهيز طلبك",
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

export default router;
