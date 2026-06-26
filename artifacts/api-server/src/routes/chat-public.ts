import { Router } from "express";

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
        message_type: "outgoing",
        private: true,
      },
    });
    res.json({ data: { success: true } });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
