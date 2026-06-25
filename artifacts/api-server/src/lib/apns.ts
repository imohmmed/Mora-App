/**
 * apns.ts — Send APNs push to update iOS Live Activities directly.
 * Uses HTTP/2 with JWT auth (.p8 key).
 *
 * Required environment variables:
 *   APPLE_PUSH_KEY_ID   — 10-char Key ID from Apple Developer
 *   APPLE_PUSH_KEY      — Contents of the .p8 file (with or without headers)
 *   (Team ID and bundle ID are hardcoded to match app.json)
 */

import http2 from "node:http2";
import crypto from "node:crypto";

const TEAM_ID    = "PM27C7JC3M";
const BUNDLE_ID  = "app.mora1.com";
const APNS_HOST  = "api.push.apple.com";

export type LiveActivityStage =
  | "confirmed"
  | "preparing"
  | "shipping"
  | "delivered"
  | "issue"
  | "cancelled";

// ── JWT helpers ────────────────────────────────────────────────────────────────

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

let _jwtCache: { token: string; ts: number } | null = null;

function getJWT(): string {
  const keyId = process.env["APPLE_PUSH_KEY_ID"];
  const rawKey = process.env["APPLE_PUSH_KEY"];
  if (!keyId || !rawKey) throw new Error("APPLE_PUSH_KEY_ID and APPLE_PUSH_KEY env vars are required");

  const now = Math.floor(Date.now() / 1000);
  // Reuse cached JWT if < 45 minutes old
  if (_jwtCache && now - _jwtCache.ts < 45 * 60) return _jwtCache.token;

  // Normalise key (add PEM headers if missing)
  let pem = rawKey.trim();
  if (!pem.startsWith("-----")) {
    pem = `-----BEGIN PRIVATE KEY-----\n${pem}\n-----END PRIVATE KEY-----`;
  }

  const header  = base64url(Buffer.from(JSON.stringify({ alg: "ES256", kid: keyId })));
  const payload = base64url(Buffer.from(JSON.stringify({ iss: TEAM_ID, iat: now })));
  const msg     = `${header}.${payload}`;

  const sign = crypto.createSign("SHA256");
  sign.update(msg);
  const sig = base64url(sign.sign({ key: pem, dsaEncoding: "ieee-p1363" }));

  const token = `${msg}.${sig}`;
  _jwtCache = { token, ts: now };
  return token;
}

// ── Live Activity payload ──────────────────────────────────────────────────────

export interface LiveActivityPayload {
  stage: LiveActivityStage;
  message?: string;
  isPaid?: boolean;
  /** Dismiss after delivery (ISO string or seconds from now) */
  dismissAt?: Date;
}

export async function sendLiveActivityPush(
  deviceToken: string,
  payload: LiveActivityPayload
): Promise<{ ok: boolean; error?: string }> {
  const keyId = process.env["APPLE_PUSH_KEY_ID"];
  const rawKey = process.env["APPLE_PUSH_KEY"];
  if (!keyId || !rawKey) {
    return { ok: false, error: "APPLE_PUSH_KEY_ID / APPLE_PUSH_KEY not configured" };
  }

  // "delivered" and "cancelled" are terminal states that END the Live Activity.
  // "issue" stays an UPDATE (not ended) so the customer keeps the "Contact Us"
  // action available until the problem is resolved.
  // delivered lingers ~6h so the "rate us" CTA stays usable; cancelled ~1h so the
  // customer can still tap "Contact Us".
  const isEnd = payload.stage === "delivered" || payload.stage === "cancelled";
  const ts    = Math.floor(Date.now() / 1000);
  const dismissSecs = payload.stage === "delivered" ? 6 * 3600 : 3600;

  const apsPayload = {
    aps: {
      timestamp: ts,
      event: isEnd ? "end" : "update",
      "content-state": {
        stage:   payload.stage,
        message: payload.message ?? "",
        isPaid:  payload.isPaid ?? false,
      },
      ...(isEnd ? { "dismissal-date": ts + dismissSecs } : {}),
    },
  };

  return new Promise((resolve) => {
    let jwt: string;
    try { jwt = getJWT(); }
    catch (e: unknown) { resolve({ ok: false, error: String(e) }); return; }

    const client = http2.connect(`https://${APNS_HOST}`);
    client.on("error", (err) => {
      client.destroy();
      resolve({ ok: false, error: err.message });
    });

    const body   = Buffer.from(JSON.stringify(apsPayload));
    const topic  = `${BUNDLE_ID}.push-type.liveactivity`;

    const req = client.request({
      ":method":              "POST",
      ":path":                `/3/device/${deviceToken}`,
      ":scheme":              "https",
      ":authority":           APNS_HOST,
      "authorization":        `bearer ${jwt}`,
      "apns-push-type":       "liveactivity",
      "apns-topic":           topic,
      "apns-priority":        isEnd ? "10" : "5",
      "content-type":         "application/json",
      "content-length":       String(body.byteLength),
    });

    req.write(body);
    req.end();

    let respBody = "";
    req.on("data", (d: Buffer) => { respBody += d.toString(); });
    req.on("end", () => {
      client.destroy();
      if (respBody && respBody !== "") {
        try {
          const json = JSON.parse(respBody) as { reason?: string };
          if (json.reason) { resolve({ ok: false, error: json.reason }); return; }
        } catch { /* ignore parse errors */ }
      }
      resolve({ ok: true });
    });
  });
}

// ── Push-to-start: START a Live Activity remotely (iOS 17.2+) ───────────────────
// Sends an `event: "start"` ActivityKit push to the customer's push-to-start token.
// `attributes-type` MUST match the ActivityAttributes struct name in the app
// (MoraOrderActivityAttributes), and `attributes` MUST match its stored fields.

export interface LiveActivityStartPayload {
  orderNumber: string;
  customerName: string;
  stage: LiveActivityStage;
  message?: string;
  priceText?: string;
  isPaid?: boolean;
  alertTitle?: string;
  alertBody?: string;
}

export async function sendLiveActivityStartPush(
  pushToStartToken: string,
  payload: LiveActivityStartPayload
): Promise<{ ok: boolean; error?: string }> {
  const keyId = process.env["APPLE_PUSH_KEY_ID"];
  const rawKey = process.env["APPLE_PUSH_KEY"];
  if (!keyId || !rawKey) {
    return { ok: false, error: "APPLE_PUSH_KEY_ID / APPLE_PUSH_KEY not configured" };
  }

  const ts = Math.floor(Date.now() / 1000);
  const apsPayload = {
    aps: {
      timestamp: ts,
      event: "start",
      "content-state": {
        stage:   payload.stage,
        message: payload.message ?? "",
        isPaid:  payload.isPaid ?? false,
      },
      "attributes-type": "MoraOrderActivityAttributes",
      attributes: {
        orderNumber:  payload.orderNumber,
        customerName: payload.customerName,
        priceText:    payload.priceText ?? "",
      },
      alert: {
        title: payload.alertTitle ?? "Mora",
        body:  payload.alertBody ?? payload.message ?? "",
      },
    },
  };

  return new Promise((resolve) => {
    let jwt: string;
    try { jwt = getJWT(); }
    catch (e: unknown) { resolve({ ok: false, error: String(e) }); return; }

    const client = http2.connect(`https://${APNS_HOST}`);
    client.on("error", (err) => {
      client.destroy();
      resolve({ ok: false, error: err.message });
    });

    const body  = Buffer.from(JSON.stringify(apsPayload));
    const topic = `${BUNDLE_ID}.push-type.liveactivity`;

    const req = client.request({
      ":method":        "POST",
      ":path":          `/3/device/${pushToStartToken}`,
      ":scheme":        "https",
      ":authority":     APNS_HOST,
      "authorization":  `bearer ${jwt}`,
      "apns-push-type": "liveactivity",
      "apns-topic":     topic,
      "apns-priority":  "10",
      "content-type":   "application/json",
      "content-length": String(body.byteLength),
    });

    req.write(body);
    req.end();

    let respBody = "";
    req.on("data", (d: Buffer) => { respBody += d.toString(); });
    req.on("end", () => {
      client.destroy();
      if (respBody && respBody !== "") {
        try {
          const json = JSON.parse(respBody) as { reason?: string };
          if (json.reason) { resolve({ ok: false, error: json.reason }); return; }
        } catch { /* ignore parse errors */ }
      }
      resolve({ ok: true });
    });
  });
}
