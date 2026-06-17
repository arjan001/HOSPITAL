/**
 * api-server — Express application factory.
 *
 * This is the **legacy** Express backend that backs the storefront catalogue,
 * admin routes and Clerk proxy. It runs on port 8080 and
 * is mounted at `/api` by the Replit reverse proxy.
 *
 * Middleware stack (in order):
 *   1. pino-http       — structured request/response logging
 *   2. clerkProxyMiddleware (optional) — only when CLERK_PROXY_URL is set
 *                         for satellite / custom-domain Clerk setups
 *   3. cors            — allows credentials from the Vite SPA origin
 *   4. express.json / urlencoded — request body parsing
 *   5. clerkMiddleware — attaches Clerk auth context to every request so
 *                         downstream route guards can call getAuth(req)
 *   6. express.static  — serves uploaded files from local disk; removable
 *                         once we swap Storage to S3
 *   7. /api router     — all feature routes (see routes/index.ts)
 *   8. Global error handler — degrades "Backend disabled" 500s to 503s so
 *                         the storefront can render an empty-state gracefully
 *
 * Migration note:
 *   New feature modules go to api-nest (/api/v2), not here. This server will
 *   shrink route by route as the NestJS Strangler migration lands.
 */
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
} from "./middlewares/clerkProxyMiddleware";
import { clerkConfigured, clerkProxyUrl, clerkPublishableKey } from "./lib/clerk-env";
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
if (clerkProxyUrl()) {
  app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
}

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const clerkPk = clerkPublishableKey();
if (clerkConfigured() && clerkPk) {
  // Standard Clerk: keys from env (Clerk Dashboard). No Replit host lookup.
  if (!process.env.CLERK_PUBLISHABLE_KEY?.trim()) {
    process.env.CLERK_PUBLISHABLE_KEY = clerkPk;
  }
  app.use(clerkMiddleware());
} else if (clerkPk) {
  app.use(clerkMiddleware({ publishableKey: clerkPk }));
}

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
