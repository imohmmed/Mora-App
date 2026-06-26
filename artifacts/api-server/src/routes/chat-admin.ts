import { Router } from "express";
import { requireAdmin } from "../middlewares/auth.js";

const router = Router();

const CHATWOOT_URL = (process.env.CHATWOOT_URL || "").replace(/\/$/, "");
const CHATWOOT_ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID || "";
const CHATWOOT_API_TOKEN = process.env.CHATWOOT_API_TOKEN || "";

const configured = () =>
  Boolean(CHATWOOT_URL && CHATWOOT_ACCOUNT_ID && CHATWOOT_API_TOKEN);

async function chatwoot(
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
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: res.status, body };
}

// Gate every chat-admin endpoint behind admin auth.
router.use("/admin/chat", requireAdmin, (req, res, next) => {
  if (!configured()) {
    res.status(503).json({
      data: null,
      meta: {},
      error: "Chat service is not configured (missing CHATWOOT_URL / CHATWOOT_API_TOKEN).",
    });
    return;
  }
  next();
});

function send(res: import("express").Response, status: number, body: unknown) {
  if (status >= 200 && status < 300) {
    res.json({ data: body, meta: {}, error: null });
  } else {
    res.status(status).json({ data: null, meta: {}, error: pickError(body, status) });
  }
}

function pickError(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    if (typeof b.error === "string") return b.error;
    if (Array.isArray(b.errors)) return b.errors.join(", ");
    if (b.message && typeof b.message === "string") return b.message;
  }
  if (typeof body === "string" && body) return body;
  return `Upstream error (${status})`;
}

const wrap =
  (fn: (req: import("express").Request) => Promise<{ status: number; body: unknown }>) =>
  async (req: import("express").Request, res: import("express").Response) => {
    try {
      const { status, body } = await fn(req);
      send(res, status, body);
    } catch (err) {
      res.status(502).json({
        data: null,
        meta: {},
        error: err instanceof Error ? err.message : "Chat service unreachable",
      });
    }
  };

// ─── Canned Responses ─────────────────────────────────────────────────────
router.get(
  "/admin/chat/canned_responses",
  wrap((req) => {
    const search = typeof req.query.search === "string" ? req.query.search : "";
    const qs = search ? `?search=${encodeURIComponent(search)}` : "";
    return chatwoot(`/canned_responses${qs}`);
  })
);

router.post(
  "/admin/chat/canned_responses",
  wrap((req) => {
    const { short_code, content } = req.body as { short_code?: string; content?: string };
    return chatwoot(`/canned_responses`, {
      method: "POST",
      body: { canned_response: { short_code, content } },
    });
  })
);

router.put(
  "/admin/chat/canned_responses/:id",
  wrap((req) => {
    const { short_code, content } = req.body as { short_code?: string; content?: string };
    return chatwoot(`/canned_responses/${req.params.id}`, {
      method: "PUT",
      body: { canned_response: { short_code, content } },
    });
  })
);

router.delete(
  "/admin/chat/canned_responses/:id",
  wrap((req) => chatwoot(`/canned_responses/${req.params.id}`, { method: "DELETE" }))
);

// ─── Automation Rules ─────────────────────────────────────────────────────
router.get(
  "/admin/chat/automation_rules",
  wrap(() => chatwoot(`/automation_rules`))
);

router.get(
  "/admin/chat/automation_rules/:id",
  wrap((req) => chatwoot(`/automation_rules/${req.params.id}`))
);

router.post(
  "/admin/chat/automation_rules",
  wrap((req) => chatwoot(`/automation_rules`, { method: "POST", body: req.body }))
);

router.put(
  "/admin/chat/automation_rules/:id",
  wrap((req) => chatwoot(`/automation_rules/${req.params.id}`, { method: "PUT", body: req.body }))
);

router.delete(
  "/admin/chat/automation_rules/:id",
  wrap((req) => chatwoot(`/automation_rules/${req.params.id}`, { method: "DELETE" }))
);

router.post(
  "/admin/chat/automation_rules/:id/clone",
  wrap((req) => chatwoot(`/automation_rules/${req.params.id}/clone`, { method: "POST" }))
);

// ─── Reference data for condition / action value pickers ──────────────────
router.get(
  "/admin/chat/agents",
  wrap(() => chatwoot(`/agents`))
);

router.get(
  "/admin/chat/teams",
  wrap(() => chatwoot(`/teams`))
);

router.get(
  "/admin/chat/labels",
  wrap(() => chatwoot(`/labels`))
);

router.get(
  "/admin/chat/inboxes",
  wrap(() => chatwoot(`/inboxes`))
);

export default router;
