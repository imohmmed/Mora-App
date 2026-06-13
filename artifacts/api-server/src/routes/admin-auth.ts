import { Router } from "express";
import type { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import db from "../lib/db.js";
import { requireAdmin, JWT_SECRET, type AdminUserRow } from "../middlewares/auth.js";

const router = Router();
const OWNER_EMAIL = "aaaa35059@gmail.com";

function googleClient() {
  return new OAuth2Client(process.env.GOOGLE_ADMIN_CLIENT_ID);
}

// POST /admin/auth/google — verify Google ID token → issue JWT
router.post("/admin/auth/google", async (req: Request, res: Response) => {
  const { idToken } = req.body as { idToken?: string };
  if (!idToken) {
    res.status(400).json({ data: null, error: "idToken required" });
    return;
  }

  try {
    const ticket = await googleClient().verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_ADMIN_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) throw new Error("No email in token");

    const { email, name: googleName, picture } = payload;

    // Block non-admins
    if (email !== OWNER_EMAIL) {
      const admin = db
        .prepare("SELECT * FROM admin_users WHERE email=? AND is_active=1")
        .get(email) as AdminUserRow | undefined;
      if (!admin) {
        res.status(403).json({
          data: null,
          error: "Access denied. Ask the store owner to add your email as an admin.",
        });
        return;
      }
    }

    // Update last_login
    db.prepare(
      `UPDATE admin_users SET last_login=datetime('now') WHERE email=?`
    ).run(email);

    const row = db.prepare("SELECT * FROM admin_users WHERE email=?").get(email) as AdminUserRow | undefined;
    const name = row?.name || googleName || email.split("@")[0];
    const role = row?.role || "owner";
    const permissions = row ? JSON.parse(row.permissions || "{}") : {
      orders: true, products: true, customers: true,
      analytics: true, marketing: true, content: true, settings: true,
    };

    const token = jwt.sign(
      { email, name, role, permissions, picture: picture || null },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      data: { token, user: { email, name, role, permissions, picture: picture || null } },
      error: null,
    });
  } catch (err: unknown) {
    const msg = (err as Error).message || "Authentication failed";
    res.status(401).json({ data: null, error: msg });
  }
});

// GET /admin/auth/me
router.get("/admin/auth/me", requireAdmin, (req: Request, res: Response) => {
  const u = req.adminUser!;
  res.json({
    data: { ...u, permissions: typeof u.permissions === "string" ? JSON.parse(u.permissions) : u.permissions },
    error: null,
  });
});

// GET /admin/users — list all admins (owner only)
router.get("/admin/users", requireAdmin, (req: Request, res: Response) => {
  if (req.adminUser!.email !== OWNER_EMAIL) {
    res.status(403).json({ data: null, error: "Owner access required" });
    return;
  }
  const rows = db
    .prepare("SELECT id,email,name,role,permissions,is_active,created_at,last_login FROM admin_users ORDER BY id")
    .all() as AdminUserRow[];
  res.json({ data: rows.map((r) => ({ ...r, permissions: JSON.parse(r.permissions || "{}") })), error: null });
});

// POST /admin/users — create admin (owner only)
router.post("/admin/users", requireAdmin, (req: Request, res: Response) => {
  if (req.adminUser!.email !== OWNER_EMAIL) {
    res.status(403).json({ data: null, error: "Owner access required" });
    return;
  }
  const { email, name, permissions = {} } = req.body as {
    email?: string;
    name?: string;
    permissions?: Record<string, boolean>;
  };
  if (!email || !name) {
    res.status(400).json({ data: null, error: "email and name are required" });
    return;
  }

  try {
    db.prepare(
      `INSERT INTO admin_users (email, name, role, permissions, is_active, created_at)
       VALUES (?, ?, 'admin', ?, 1, datetime('now'))`
    ).run(email.toLowerCase().trim(), name.trim(), JSON.stringify(permissions));

    const row = db.prepare("SELECT * FROM admin_users WHERE email=?").get(email.toLowerCase().trim()) as AdminUserRow;
    res.json({ data: { ...row, permissions }, error: null });
  } catch (err: unknown) {
    const msg = (err as Error).message || "";
    if (msg.includes("UNIQUE")) {
      res.status(400).json({ data: null, error: "An admin with this email already exists" });
    } else {
      res.status(500).json({ data: null, error: msg });
    }
  }
});

// PUT /admin/users/:id — update permissions / name / active status (owner only)
router.put("/admin/users/:id", requireAdmin, (req: Request, res: Response) => {
  if (req.adminUser!.email !== OWNER_EMAIL) {
    res.status(403).json({ data: null, error: "Owner access required" });
    return;
  }
  const { id } = req.params;
  const { name, permissions, is_active } = req.body as {
    name?: string;
    permissions?: Record<string, boolean>;
    is_active?: boolean;
  };

  const row = db.prepare("SELECT * FROM admin_users WHERE id=?").get(id) as AdminUserRow | undefined;
  if (!row) { res.status(404).json({ data: null, error: "Admin not found" }); return; }
  if (row.email === OWNER_EMAIL) { res.status(400).json({ data: null, error: "Cannot modify owner" }); return; }

  db.prepare(`
    UPDATE admin_users SET
      name        = COALESCE(?, name),
      permissions = COALESCE(?, permissions),
      is_active   = COALESCE(?, is_active)
    WHERE id = ?
  `).run(
    name ?? null,
    permissions ? JSON.stringify(permissions) : null,
    is_active !== undefined ? (is_active ? 1 : 0) : null,
    id,
  );

  const updated = db.prepare("SELECT * FROM admin_users WHERE id=?").get(id) as AdminUserRow;
  res.json({ data: { ...updated, permissions: JSON.parse(updated.permissions || "{}") }, error: null });
});

// DELETE /admin/users/:id — remove admin (owner only)
router.delete("/admin/users/:id", requireAdmin, (req: Request, res: Response) => {
  if (req.adminUser!.email !== OWNER_EMAIL) {
    res.status(403).json({ data: null, error: "Owner access required" });
    return;
  }
  const { id } = req.params;
  const row = db.prepare("SELECT * FROM admin_users WHERE id=?").get(id) as AdminUserRow | undefined;
  if (!row) { res.status(404).json({ data: null, error: "Admin not found" }); return; }
  if (row.email === OWNER_EMAIL) { res.status(400).json({ data: null, error: "Cannot delete owner" }); return; }

  db.prepare("DELETE FROM admin_users WHERE id=?").run(id);
  res.json({ data: { ok: true }, error: null });
});

export default router;
