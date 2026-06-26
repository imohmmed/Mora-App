import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import router from "./routes";
import { logger } from "./lib/logger";
import { uploadsDir } from "./routes/uploads.js";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
const ALLOWED_ORIGINS = [
  // Production domains
  /^https?:\/\/(www\.)?moramoda\.tech$/,
  /^https?:\/\/app\.moramoda\.tech$/,
  /^https?:\/\/admin\.moramoda\.tech$/,
  // Replit preview domains (admin + storefront paths on same domain)
  /^https?:\/\/.*\.replit\.dev$/,
  /^https?:\/\/.*\.replit\.app$/,
  /^https?:\/\/.*\.sisko\.replit\.dev$/,
  /^https?:\/\/.*\.expo\.dev$/,
  // Local development
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return cb(null, true);
      const allowed = ALLOWED_ORIGINS.some((r) => r.test(origin));
      cb(allowed ? null : new Error(`CORS blocked: ${origin}`), allowed);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
// Capture raw body buffer for webhook HMAC verification before JSON parsing.
app.use(
  express.json({
    verify: (req: express.Request & { rawBody?: Buffer }, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// Serve uploaded product images — cached aggressively (hashed filenames)
app.use("/uploads", express.static(uploadsDir, { maxAge: "365d", immutable: true }));

app.use("/api", router);

export default app;
