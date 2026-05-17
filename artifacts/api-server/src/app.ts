import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";
import { UPLOAD_DISK_ROOT, UPLOAD_URL_PREFIX } from "./lib/storage";

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
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

// Serve uploaded files from the local-disk Storage backend. When we swap
// `lib/storage.ts` over to S3, this static mount can be removed — S3 URLs
// are absolute and don't proxy through here.
app.use(
  UPLOAD_URL_PREFIX,
  express.static(UPLOAD_DISK_ROOT, { fallthrough: false, maxAge: "1h", index: false }),
);

app.use("/api", router);

// Global error handler. Catches the legacy "Backend disabled" sentinel emitted by
// vars are not configured: instead of crashing with a 500, we degrade to a
// 503 with an empty payload shape so the frontend can render gracefully.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : String(err)
  if (/Backend disabled/i.test(message)) {
    logger.warn({ message }, "Backend disabled — returning 503");
    return res.status(503).json({ error: "Backend not configured", data: [] });
  }
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
});

export default app;
