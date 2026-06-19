import express, { type Request, type Response } from "express";
import http from "node:http";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const app = express();

function health(_req: Request, res: Response) {
  res.status(200).json({ status: "ok", service: "api-server", ts: Date.now() });
}

// Replit probes /api immediately — respond before loading Clerk + all route modules.
app.get("/api", health);
app.get("/api/healthz", health);

const server = http.createServer(app);

server.listen(port, "0.0.0.0", () => {
  logger.info({ port }, "[api-server] port open (health probe ready)");

  import("./attach-routes.js")
    .then(({ attachRoutes }) => {
      attachRoutes(app);
      logger.info("[api-server] ready");
    })
    .catch((err: unknown) => {
      logger.error({ err }, "[api-server] failed to load routes");
      process.exit(1);
    });
});

server.on("error", (err) => {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
});
