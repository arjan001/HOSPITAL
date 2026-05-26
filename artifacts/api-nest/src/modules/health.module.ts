/**
 * Health module — liveness probe.
 *
 * GET /api/v2/healthz
 *   Returns { ok: true, service: "api-nest", ts: <epoch-ms> }.
 *   Used by the Replit workflow health-check and any upstream load balancer.
 *   Deliberately minimal — no database ping, no external calls — so it is
 *   fast and cannot cascade-fail when dependencies are down.
 *
 * Add a deeper /readyz endpoint here when we have a Postgres connection to
 * verify (e.g. `db.execute(sql\`SELECT 1\`)`).
 */
import { Controller, Get, Module } from "@nestjs/common"

@Controller()
class HealthController {
  @Get("healthz")
  healthz() {
    return { ok: true, service: "api-nest", ts: Date.now() }
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
