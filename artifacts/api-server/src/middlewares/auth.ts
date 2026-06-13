import jwt from "jsonwebtoken";
import db from "../lib/db.js";
import type { Request, Response, NextFunction } from "express";

export type AdminUserRow = {
  id: number;
  email: string;
  name: string;
  role: string;
  permissions: string;
  is_active: number;
  last_login: string | null;
};

declare global {
  namespace Express {
    interface Request {
      adminUser?: AdminUserRow;
    }
  }
}

const OWNER_EMAIL = "aaaa35059@gmail.com";
export const JWT_SECRET = process.env.ADMIN_JWT_SECRET || "mora-admin-dev-fallback-secret";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers["authorization"] ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!token) {
    res.status(401).json({ data: null, meta: {}, error: "Unauthorized" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { email: string };

    // Owner always gets through — re-check DB for up-to-date info
    if (decoded.email === OWNER_EMAIL) {
      const ownerRow = db.prepare("SELECT * FROM admin_users WHERE email=?").get(OWNER_EMAIL) as AdminUserRow | undefined;
      req.adminUser = ownerRow ?? {
        id: 0, email: OWNER_EMAIL, name: "Owner", role: "owner",
        permissions: JSON.stringify({ orders: true, products: true, customers: true, analytics: true, marketing: true, content: true, settings: true }),
        is_active: 1, last_login: null,
      };
      next();
      return;
    }

    // All other admins: must be active in DB (enables instant revocation)
    const user = db
      .prepare("SELECT * FROM admin_users WHERE email=? AND is_active=1")
      .get(decoded.email) as AdminUserRow | undefined;

    if (!user) {
      res.status(401).json({ data: null, meta: {}, error: "Unauthorized" });
      return;
    }

    req.adminUser = user;
    next();
  } catch {
    res.status(401).json({ data: null, meta: {}, error: "Unauthorized" });
  }
}
