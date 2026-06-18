/**
 * Request-scoped ALS wrapper so AuditInterceptor dedupe shares state with
 * explicit AuditService.record() in the same HTTP request.
 */
import { Inject, Injectable, NestMiddleware } from "@nestjs/common"
import type { Request, Response, NextFunction } from "express"
import { AuditService } from "../modules/audit.module"

@Injectable()
export class AuditRequestScopeMiddleware implements NestMiddleware {
  constructor(@Inject(AuditService) private readonly audit: AuditService) {}

  use(_req: Request, _res: Response, next: NextFunction) {
    this.audit.runInRequestScope(() => next())
  }
}
