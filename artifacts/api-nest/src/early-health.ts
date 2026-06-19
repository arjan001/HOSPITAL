/**
 * Bind the API port immediately with lightweight health responses so Replit's
 * deploy probe sees port 8090 open while NestJS modules are still loading.
 */
import type { Express, Request, Response, NextFunction } from "express"
import http from "node:http"

const HEALTH_PATHS = new Set(["/api/v2", "/api/v2/", "/api/v2/healthz"])

export function mountEarlyHealth(expressApp: Express): { setReady: () => void } {
  let ready = false

  expressApp.use((req: Request, res: Response, next: NextFunction) => {
    if (ready) return next()

    const path = (req.url ?? "").split("?")[0] ?? ""
    if (req.method === "GET" && HEALTH_PATHS.has(path)) {
      res.json({ ok: true, service: "api-nest", ts: Date.now(), booting: true })
      return
    }

    if (req.method === "GET" || req.method === "HEAD") {
      res.status(503).json({ ok: false, service: "api-nest", booting: true })
      return
    }

    next()
  })

  return {
    setReady() {
      ready = true
    },
  }
}

export function listenEarly(
  expressApp: Express,
  port: number,
): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(expressApp)
    server.once("error", reject)
    server.listen(port, "0.0.0.0", () => {
      console.log(`[api-nest] port :${port} open (health probe ready)`)
      resolve(server)
    })
  })
}
