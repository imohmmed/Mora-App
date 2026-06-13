import { Router } from "express";
import type { Request, Response } from "express";
import db from "../lib/db.js";
import type { Row } from "../lib/types.js";

const router = Router();
const WAYL_BASE = "https://api.thewayl.com/api/v1";

async function waylFetch(method: string, path: string, body?: object) {
  const key = process.env.WAYL_API_KEY;
  if (!key) throw new Error("WAYL_API_KEY is not configured");
  const res = await fetch(`${WAYL_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new Error((json["message"] as string) || `Wayl API ${res.status}`);
  return json;
}

router.post("/store/wayl/create-link", async (req: Request, res: Response) => {
  const { orderNumber, total, redirectionUrl } = req.body as {
    orderNumber?: string;
    total?: number;
    redirectionUrl?: string;
  };

  if (!orderNumber || !total) {
    res.status(400).json({ data: null, error: "orderNumber and total are required" });
    return;
  }

  try {
    const env = (process.env.WAYL_ENV as "live" | "test") ?? "live";
    const data = await waylFetch("POST", "/links", {
      env,
      referenceId: orderNumber,
      total: Number(total),
      currency: "IQD",
      ...(redirectionUrl ? { redirectionUrl } : {}),
    });

    const link = data["data"] as Record<string, string>;
    res.json({ data: { url: link["url"], referenceId: link["referenceId"] }, error: null });
  } catch (err: unknown) {
    res.status(500).json({ data: null, error: (err as Error).message });
  }
});

router.get("/store/wayl/status/:referenceId", async (req: Request, res: Response) => {
  const { referenceId } = req.params;
  try {
    const data = await waylFetch("GET", `/links/${referenceId}`);
    const link = data["data"] as Record<string, string>;
    const status = (link["status"] || "").toLowerCase();

    if (status === "completed") {
      db.prepare(
        `UPDATE orders SET financial_status='paid', updated_at=datetime('now') WHERE order_number=?`
      ).run(referenceId);
    }

    res.json({
      data: {
        status,
        paymentMethod: link["paymentMethod"] ?? null,
        referenceId,
        paid: status === "completed",
      },
      error: null,
    });
  } catch (err: unknown) {
    res.status(500).json({ data: null, error: (err as Error).message });
  }
});

router.post("/store/wayl/webhook", (req: Request, res: Response) => {
  const body = req.body as Record<string, string>;
  const referenceId = body["referenceId"];
  const status = (body["status"] || "").toLowerCase();

  if (referenceId && status === "completed") {
    db.prepare(
      `UPDATE orders SET financial_status='paid', updated_at=datetime('now') WHERE order_number=?`
    ).run(referenceId);
  }

  res.json({ ok: true });
});

export default router;
