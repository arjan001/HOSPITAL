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
