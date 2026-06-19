/**
 * Attach full api-server middleware and routes to an Express app that is
 * already listening (early /api health routes are registered in index.ts).
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

export function attachRoutes(app: Express): void {
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
    if (!process.env.CLERK_PUBLISHABLE_KEY?.trim()) {
      process.env.CLERK_PUBLISHABLE_KEY = clerkPk;
    }
    app.use(clerkMiddleware());
  } else if (clerkPk) {
    app.use(clerkMiddleware({ publishableKey: clerkPk }));
  }

  app.use(
    UPLOAD_URL_PREFIX,
    express.static(UPLOAD_DISK_ROOT, { fallthrough: false, maxAge: "1h", index: false }),
  );

  app.use("/api", router);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : String(err);
    if (/Backend disabled/i.test(message)) {
      logger.warn({ message }, "Backend disabled — returning 503");
      return res.status(503).json({ error: "Backend not configured", data: [] });
    }
    logger.error({ err }, "Unhandled error");
    res.status(500).json({ error: "Internal server error" });
  });
}
