import { type Request, type Response, type NextFunction } from "express";

const DEV_TOKEN = "dev-token-mora";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers["authorization"] ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token !== DEV_TOKEN) {
    res.status(401).json({ data: null, meta: {}, error: "Unauthorized" });
    return;
  }
  next();
}
