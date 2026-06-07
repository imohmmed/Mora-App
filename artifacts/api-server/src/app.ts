import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

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
  /^https?:\/\/(www\.)?moramodaa\.tech$/,
  /^https?:\/\/app\.moramodaa\.tech$/,
  /^https?:\/\/admin\.moramodaa\.tech$/,
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
