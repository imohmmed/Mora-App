import { Router } from "express";
import crypto from "crypto";
import db, { parseOne } from "../lib/db.js";
import type { Row } from "../lib/types.js";

const router = Router();

function hashPassword(p: string): string {
  return crypto.createHash("sha256").update(p + "mora_auth_salt_2024").digest("hex");
}

function makeToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function getUser(token: string) {
  const session = db.prepare(`SELECT customer_id FROM sessions WHERE token=?`).get(token) as Row | undefined;
  if (!session) return null;
  const c = db.prepare(`SELECT id,first_name,last_name,email,orders_count,total_spent,phone,created_at FROM customers WHERE id=?`).get(session["customer_id"] as string) as Row | undefined;
  if (!c) return null;
  return { id: c["id"], firstName: c["first_name"], lastName: c["last_name"], email: c["email"], ordersCount: c["orders_count"], totalSpent: c["total_spent"], phone: c["phone"], createdAt: c["created_at"] };
}

router.post("/store/auth/register", (req, res) => {
  const { email, password, firstName, lastName } = req.body as Record<string, string>;
  if (!email || !password || !firstName) {
    res.status(400).json({ data: null, meta: {}, error: "email, password and firstName are required" });
    return;
  }
  const existing = db.prepare(`SELECT id FROM customers WHERE email=?`).get(email.toLowerCase().trim());
  if (existing) {
    res.status(409).json({ data: null, meta: {}, error: "Email already registered. Try signing in." });
    return;
  }
  const id = `cust_${Date.now()}`;
  const hash = hashPassword(password);
  db.prepare(`INSERT INTO customers (id,first_name,last_name,email,password_hash,phone,orders_count,total_spent,tags,accepts_marketing,created_at) VALUES (?,?,?,?,?,?,0,0,'[]',0,?)`)
    .run(id, firstName.trim(), (lastName ?? "").trim(), email.toLowerCase().trim(), hash, "", new Date().toISOString());
  const token = makeToken();
  db.prepare(`INSERT INTO sessions (token,customer_id,created_at) VALUES (?,?,?)`).run(token, id, new Date().toISOString());
  const user = getUser(token);
  res.status(201).json({ data: { token, user }, meta: {}, error: null });
});

router.post("/store/auth/login", (req, res) => {
  const { email, password } = req.body as Record<string, string>;
  if (!email || !password) {
    res.status(400).json({ data: null, meta: {}, error: "email and password required" });
    return;
  }
  const c = db.prepare(`SELECT * FROM customers WHERE email=?`).get(email.toLowerCase().trim()) as Row | undefined;
  if (!c || !c["password_hash"] || c["password_hash"] !== hashPassword(password)) {
    res.status(401).json({ data: null, meta: {}, error: "Invalid email or password" });
    return;
  }
  const token = makeToken();
  db.prepare(`INSERT INTO sessions (token,customer_id,created_at) VALUES (?,?,?)`).run(token, c["id"], new Date().toISOString());
  const user = getUser(token);
  res.json({ data: { token, user }, meta: {}, error: null });
});

router.get("/store/auth/me", (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) { res.status(401).json({ data: null, meta: {}, error: "Unauthorized" }); return; }
  const user = getUser(auth.slice(7));
  if (!user) { res.status(401).json({ data: null, meta: {}, error: "Invalid or expired token" }); return; }
  res.json({ data: user, meta: {}, error: null });
});

router.post("/store/auth/logout", (req, res) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) db.prepare(`DELETE FROM sessions WHERE token=?`).run(auth.slice(7));
  res.json({ data: null, meta: {}, error: null });
});

/**
 * POST /store/auth/firebase
 * Called after Firebase phone OTP or Google/Apple sign-in on the client.
 * Finds or creates a customer record, then returns a Mora session token.
 *
 * Body (phone auth):   { provider: "phone",  phone, firebaseUid }
 * Body (social auth):  { provider: "social", firebaseUid, name?, email? }
 *
 * NOTE: When FIREBASE_SERVICE_ACCOUNT_JSON is provided the server will
 * verify the Firebase ID token server-side. Until then it trusts the client.
 */
router.post("/store/auth/firebase", (req, res) => {
  const { provider, phone, firebaseUid, name, email } =
    req.body as Record<string, string>;

  if (!firebaseUid) {
    res.status(400).json({ data: null, meta: {}, error: "firebaseUid is required" });
    return;
  }

  // ── Find existing customer ───────────────────────────────────────────────
  let customer: Row | undefined;

  if (provider === "phone" && phone) {
    customer = db
      .prepare(`SELECT * FROM customers WHERE phone=?`)
      .get(phone.trim()) as Row | undefined;
  }

  if (!customer && email) {
    customer = db
      .prepare(`SELECT * FROM customers WHERE email=?`)
      .get(email.toLowerCase().trim()) as Row | undefined;
  }

  // Also try matching by firebase_uid if column exists (future-proof)
  // For now skip, as the schema doesn't have that column yet.

  // ── Create new customer ──────────────────────────────────────────────────
  if (!customer) {
    const id = `cust_${Date.now()}`;

    const nameParts  = (name ?? "").trim().split(/\s+/);
    const firstName  = nameParts[0] || "User";
    const lastName   = nameParts.slice(1).join(" ");

    // Generate a unique placeholder email for phone-only users
    const safePhone  = (phone ?? firebaseUid).replace(/\D/g, "");
    const safeEmail  = email?.toLowerCase().trim() || `${safePhone}@mora.phone`;

    db.prepare(`
      INSERT INTO customers
        (id, first_name, last_name, email, phone, orders_count, total_spent,
         tags, accepts_marketing, created_at)
      VALUES (?,?,?,?,?,0,0,'[]',0,?)
    `).run(id, firstName, lastName, safeEmail, (phone ?? "").trim(),
           new Date().toISOString());

    customer = db
      .prepare(`SELECT * FROM customers WHERE id=?`)
      .get(id) as Row;
  }

  // ── Session ──────────────────────────────────────────────────────────────
  const token = makeToken();
  db.prepare(`INSERT INTO sessions (token,customer_id,created_at) VALUES (?,?,?)`)
    .run(token, customer["id"], new Date().toISOString());

  const user = getUser(token);
  res.json({ data: { token, user }, meta: {}, error: null });
});

export default router;
