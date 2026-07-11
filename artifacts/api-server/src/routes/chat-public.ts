import { Router, type Request } from "express";
import crypto from "crypto";
import { db } from "../lib/db.js";
import { doSendNotification } from "./notifications.js";
import { getTemplate } from "../lib/templates.js";

const router = Router();

const CHATWOOT_URL = (process.env.CHATWOOT_URL || "").replace(/\/$/, "");
const CHATWOOT_ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID || "";
const CHATWOOT_API_TOKEN = process.env.CHATWOOT_API_TOKEN || "";

const configured = () =>
  Boolean(CHATWOOT_URL && CHATWOOT_ACCOUNT_ID && CHATWOOT_API_TOKEN);

async function cw(
  path: string,
  init?: { method?: string; body?: unknown }
): Promise<{ status: number; body: unknown }> {
  const url = `${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}${path}`;
  const res = await fetch(url, {
    method: init?.method || "GET",
    headers: {
      "Content-Type": "application/json",
      api_access_token: CHATWOOT_API_TOKEN,
    },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }
  return { status: res.status, body };
}

// GET /api/chat/inbox — public, returns greeting_message from Chatwoot inbox (agent API)
router.get("/inbox", async (_req, res) => {
  if (!configured()) {
    res.json({ data: { greeting_enabled: false, greeting_message: null } });
    return;
  }
  try {
    // inbox_id=2 is the "Mora App" API channel inbox
    const INBOX_ID = process.env.CHATWOOT_INBOX_ID || "2";
    const r = await cw(`/inboxes/${INBOX_ID}`);
    const d = (r.body || {}) as Record<string, unknown>;
    res.json({
      data: {
        greeting_enabled: Boolean(d.greeting_enabled),
        greeting_message: typeof d.greeting_message === "string" ? d.greeting_message : null,
        name: typeof d.name === "string" ? d.name : "Support",
      },
    });
  } catch {
    res.json({ data: { greeting_enabled: false, greeting_message: null } });
  }
});

// GET /api/chat/canned — public, no auth needed
// Returns canned responses for display as quick-reply chips in the customer chat.
router.get("/canned", async (_req, res) => {
  if (!configured()) {
    res.json({ data: [] });
    return;
  }
  try {
    const r = await cw("/canned_responses");
    const items = Array.isArray(r.body) ? r.body : [];
    const mapped = (items as Array<{ id: number; short_code: string; content: string }>).map(
      (i) => ({ id: i.id, short_code: i.short_code, content: i.content })
    );
    res.json({ data: mapped });
  } catch {
    res.json({ data: [] });
  }
});

// POST /api/chat/resolve
// Body: { conversationId: number }
// Toggles conversation between resolved ↔ open.
router.post("/resolve", async (req, res) => {
  if (!configured()) {
    res.status(503).json({ error: "Chat not configured" });
    return;
  }
  const { conversationId } = req.body as { conversationId: number };
  if (!conversationId) {
    res.status(400).json({ error: "conversationId required" });
    return;
  }
  try {
    const info = await cw(`/conversations/${conversationId}`);
    const currentStatus = (info.body as Record<string, unknown>)?.status as string;
    const newStatus = currentStatus === "resolved" ? "open" : "resolved";
    const r = await cw(`/conversations/${conversationId}/toggle_status`, {
      method: "POST",
      body: { status: newStatus },
    });
    res.json({ data: { status: (r.body as Record<string, unknown>)?.current_status } });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// POST /api/chat/rating
// Body: { conversationId: number, rating: number (1-5), comment?: string }
// Submits a CSAT rating as a private note on the conversation.
router.post("/rating", async (req, res) => {
  if (!configured()) {
    res.status(503).json({ error: "Chat not configured" });
    return;
  }
  const { conversationId, rating, comment } = req.body as {
    conversationId: number;
    rating: number;
    comment?: string;
  };
  if (!conversationId || !rating) {
    res.status(400).json({ error: "conversationId and rating required" });
    return;
  }
  const stars = "⭐".repeat(Math.min(5, Math.max(1, rating)));
  const note = comment
    ? `${stars} (${rating}/5)\n${comment}`
    : `${stars} (${rating}/5)`;
  try {
    await cw(`/conversations/${conversationId}/messages`, {
      method: "POST",
      body: {
        content: `📋 تقييم العميل: ${note}`,
        private: true,
      },
    });
    res.json({ data: { success: true } });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// POST /api/chat/session-link — link a Chatwoot conversationId to a customer_id
// Called by the app immediately after creating a chat session, using the customer's
// auth token. Enables the webhook handler to find the push token for this customer.
router.post("/session-link", (req, res) => {
  const auth = (req.headers["authorization"] as string | undefined) ?? "";
  if (!auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = auth.slice(7);
  const row = db
    .prepare("SELECT customer_id FROM sessions WHERE token = ?")
    .get(token) as { customer_id: string } | undefined;
  if (!row) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { conversationId } = req.body as { conversationId?: number };
  if (!conversationId) {
    res.status(400).json({ error: "conversationId required" });
    return;
  }
  db.prepare(
    `INSERT OR REPLACE INTO chat_conversation_links (conversation_id, customer_id, created_at)
     VALUES (?, ?, ?)`
  ).run(conversationId, row.customer_id, new Date().toISOString());
  res.json({ ok: true });
});

// POST /api/chat/webhook — Chatwoot outgoing webhook receiver
// Chatwoot calls this when it sends a message. We verify the HMAC signature, then
// send a push + in-app notification to the customer if this is an agent reply.
router.post("/webhook", async (req: Request & { rawBody?: Buffer }, res) => {
  const secret = process.env.CHATWOOT_WEBHOOK_SECRET || "";
  const sig = req.headers["x-chatwoot-signature"] as string | undefined;

  // Verify HMAC-SHA256 signature if the secret is configured.
  if (secret && sig && req.rawBody) {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(req.rawBody)
      .digest("hex");
    if (sig !== expected) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }
  }

  // Always return 200 immediately so Chatwoot doesn't retry.
  res.status(200).json({ received: true });

  try {
    const body = req.body as Record<string, unknown>;
    const event = body?.event as string | undefined;
    const msgType = body?.message_type;
    const isPrivate = Boolean(body?.private);
    const content = body?.content as string | undefined;

    // Only push for outgoing (agent) public messages with text content.
    // message_type = 1 (number) or "outgoing" (string) depending on Chatwoot version.
    const isAgentMsg = msgType === 1 || msgType === "outgoing";

    if (event === "message_created" && isAgentMsg && !isPrivate && content?.trim()) {
      const conv = body?.conversation as Record<string, unknown> | undefined;
      const convId = conv?.id as number | undefined;

      if (convId) {
        const link = db
          .prepare(
            "SELECT customer_id FROM chat_conversation_links WHERE conversation_id = ?"
          )
          .get(convId) as { customer_id: string } | undefined;

        if (link?.customer_id) {
          console.log(`[chatwoot-webhook] push → customer=${link.customer_id} conv=${convId}`);
          const copy = getTemplate("chat:reply", { message: content.trim() });
          await doSendNotification({
            title: copy?.title ?? "دعم مورا",
            body: copy?.body ?? content.trim(),
            targetAll: false,
            customerIds: [link.customer_id],
          });
        }
      }
    }
  } catch (e) {
    console.error("[chatwoot-webhook] push error:", e);
  }
});

export default router;
