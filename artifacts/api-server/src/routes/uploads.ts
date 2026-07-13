import { Router, type Request, type Response } from "express";
import multer from "multer";
import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { requireAdmin } from "../middlewares/auth.js";
import db from "../lib/db.js";

function dbGetSession(token: string): unknown {
  try {
    return db.prepare(`SELECT customer_id FROM sessions WHERE token=?`).get(token);
  } catch {
    return undefined;
  }
}

const uploadsDir = process.env.UPLOADS_DIR ?? path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

// ─── Multer: images (memory) ──────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are accepted"));
  },
});

// ─── Multer: videos (disk — raw temp file) ────────────────────────────────────
const uploadVideo = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || ".mp4";
      cb(null, `raw-${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
    },
  }),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (file.mimetype.startsWith("video/")) cb(null, true);
    else cb(new Error("Only video files are accepted"));
  },
});

// ─── Helper: compress a video file with FFmpeg ────────────────────────────────
// Targets H.264 + AAC, max 1080p, ~50-70% smaller than original phone videos.
function compressVideo(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec("libx264")
      .audioCodec("aac")
      .audioBitrate("128k")
      .outputOptions([
        "-crf 28",
        "-preset fast",
        "-movflags +faststart",
        "-vf scale='min(1920,iw)':min'(1080,ih)':force_original_aspect_ratio=decrease",
        "-pix_fmt yuv420p",
      ])
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .save(outputPath);
  });
}

// ─── Helper: build base URL from request ─────────────────────────────────────
function getBaseUrl(req: Request): string {
  const proto =
    (req.headers["x-forwarded-proto"] as string)?.split(",")[0]?.trim() ?? req.protocol;
  const host =
    (req.headers["x-forwarded-host"] as string)?.split(",")[0]?.trim() ?? req.get("host")!;
  return process.env.API_BASE_URL ?? `${proto}://${host}`;
}

const router = Router();

// ─── Admin: image upload ──────────────────────────────────────────────────────
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
        .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82, effort: 4 })
        .toFile(dest);

      const url = `${getBaseUrl(req)}/uploads/${filename}`;
      res.json({ data: { url }, meta: {}, error: null });
    } catch {
      res.status(500).json({ data: null, meta: {}, error: "Image processing failed" });
    }
  }
);

// ─── Store: customer image upload (return/exchange photos) ────────────────────
router.post(
  "/store/uploads",
  (req, res, next) => {
    const authHeader = req.headers["authorization"];
    if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ data: null, meta: {}, error: "Login required" });
      return;
    }
    const sess = dbGetSession(authHeader.slice(7));
    if (!sess) {
      res.status(401).json({ data: null, meta: {}, error: "Login required" });
      return;
    }
    next();
  },
  upload.single("image"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ data: null, meta: {}, error: "No image file provided" });
      return;
    }
    try {
      const id = `xr-${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
      const filename = `${id}.webp`;
      const dest = path.join(uploadsDir, filename);

      await sharp(req.file.buffer)
        .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80, effort: 4 })
        .toFile(dest);

      const url = `${getBaseUrl(req)}/uploads/${filename}`;
      res.json({ data: { url }, meta: {}, error: null });
    } catch {
      res.status(500).json({ data: null, meta: {}, error: "Image processing failed" });
    }
  }
);

// ─── Admin: video upload with FFmpeg compression ──────────────────────────────
router.post(
  "/admin/uploads/video",
  requireAdmin,
  uploadVideo.single("video"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ data: null, meta: {}, error: "No video file provided" });
      return;
    }
    const rawPath = req.file.path;
    const id = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
    const outFilename = `${id}.mp4`;
    const outPath = path.join(uploadsDir, outFilename);

    try {
      await compressVideo(rawPath, outPath);
      fs.unlink(rawPath, () => {});

      const url = `${getBaseUrl(req)}/uploads/${outFilename}`;
      res.json({ data: { url }, meta: {}, error: null });
    } catch (err) {
      fs.unlink(rawPath, () => {});
      fs.unlink(outPath, () => {});
      res.status(500).json({ data: null, meta: {}, error: "Video processing failed" });
    }
  }
);

export { uploadsDir };
export default router;
