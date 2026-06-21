import { Router, type Request, type Response } from "express";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { requireAdmin } from "../middlewares/auth.js";

const uploadsDir = process.env.UPLOADS_DIR ?? path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are accepted"));
    }
  },
});

const router = Router();

router.post(
  "/admin/uploads",
  requireAdmin,
  upload.single("image"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ data: null, meta: {}, error: "No image file provided" });
      return;
    }
    try {
      const id = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
      const filename = `${id}.webp`;
      const dest = path.join(uploadsDir, filename);

      await sharp(req.file.buffer)
        .resize(1200, 1200, { fit: "cover", position: "centre" })
        .webp({ quality: 82 })
        .toFile(dest);

      const proto =
        (req.headers["x-forwarded-proto"] as string)?.split(",")[0]?.trim() ??
        req.protocol;
      const host =
        (req.headers["x-forwarded-host"] as string)?.split(",")[0]?.trim() ??
        req.get("host")!;
      const baseUrl = process.env.API_BASE_URL ?? `${proto}://${host}`;
      const url = `${baseUrl}/uploads/${filename}`;

      res.json({ data: { url }, meta: {}, error: null });
    } catch {
      res.status(500).json({ data: null, meta: {}, error: "Image processing failed" });
    }
  }
);

export { uploadsDir };
export default router;
