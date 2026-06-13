import { Router } from "express";
import { db } from "../lib/db.js";

const router = Router();

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function now() {
  return new Date().toISOString();
}

// ── Chatwoot webhook ───────────────────────────────────────────────────────────
// Fires when any message is created in a Chatwoot conversation.
// We only act on outgoing agent messages (message_type === 1) so the customer
// gets a push notification on their phone.
router.post("/webhooks/chatwoot", async (req, res) => {
  // Respond immediately — Chatwoot will retry on non-2xx
  res.json({ ok: true });

  try {
    const payload = req.body as Record<string, any>;

    // message_type: 0 = incoming (customer), 1 = outgoing (agent), 2 = activity
    if (
      payload.event !== "message_created" ||
      payload.message_type !== 1 ||
      payload.private === true
    ) {
      return;
    }

    const content: string = (payload.content ?? "").trim();
    if (!content) return;

    // Customer identity lives in conversation.meta.sender
    const senderMeta = payload.conversation?.meta?.sender as Record<string, any> | undefined;
    const email: string | undefined = senderMeta?.email;
    if (!email) return;

    // Resolve customer_id from email
    const customer = db
      .prepare("SELECT id FROM customers WHERE email = ?")
      .get(email) as { id: string } | undefined;
    if (!customer) return;

    // Get all push tokens for this customer
    const tokens = (
      db
        .prepare("SELECT token FROM push_tokens WHERE customer_id = ?")
        .all(customer.id) as { token: string }[]
    ).map((r) => r.token);

    if (!tokens.length) return;

    const title = "رسالة جديدة من Mora 💬";
    const body = content.length > 150 ? content.slice(0, 147) + "…" : content;
    const data = {
      type: "chat_message",
      conversationId: payload.conversation?.id ?? null,
    };

    let success = 0;
    let failed = 0;
    const CHUNK = 100;

    for (let i = 0; i < tokens.length; i += CHUNK) {
      const messages = tokens.slice(i, i + CHUNK).map((to) => ({
        to,
        title,
        body,
        data,
        sound: "default",
      }));

      try {
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
          failed += messages.length;
        }
      } catch {
        failed += messages.length;
      }
    }

    db.prepare(
      "INSERT INTO notification_log (id, type, title, body, payload, tokens_sent, success, failed, created_at) VALUES (?,?,?,?,?,?,?,?,?)"
    ).run(
      uid(),
      "chat",
      title,
      body,
      JSON.stringify({ conversationId: payload.conversation?.id, email }),
      tokens.length,
      success,
      failed,
      now()
    );

    console.log(`[chatwoot] push sent to ${success}/${tokens.length} tokens for ${email}`);
  } catch (err) {
    console.error("[chatwoot webhook]", err);
  }
});

export default router;
