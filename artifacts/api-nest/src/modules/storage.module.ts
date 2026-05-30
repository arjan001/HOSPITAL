/**
 * Storage module — admin control surface for the pluggable upload backend.
 *
 * The actual backends live in `common/storage.ts` (local disk / S3-compatible /
 * Cloudinary). This module:
 *   1. Registers a resolver so `getStorage()` reads the admin-selected provider
 *      from the cms `storage` doc ({ provider }) at call time.
 *   2. Exposes admin-only routes to inspect readiness and run a round-trip test.
 *
 * Secrets (credentials) live ONLY in env — never in cmsStore. The cms doc only
 * carries the non-secret provider *selection*.
 *
 * Routes (admin-only):
 *   GET  /api/v2/admin/storage/status — selected vs active provider + readiness
 *   POST /api/v2/admin/storage/test   — round-trip put/read/delete a tiny object
 */
import {
  Controller,
  Get,
  Inject,
  Injectable,
  Module,
  OnModuleInit,
  Post,
  UseGuards,
} from "@nestjs/common"
import { AdminGuard } from "../common/admin-guard"
import {
  getStorage,
  getStorageStatus,
  registerStorageProviderResolver,
  type StorageProvider,
} from "../common/storage"
import { AdminCmsModule, AdminCmsService } from "./admin-cms.module"

// 1×1 transparent PNG used for the round-trip test upload.
const TEST_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
)

@Injectable()
export class StorageService implements OnModuleInit {
  constructor(
    @Inject(AdminCmsService) private readonly cms: AdminCmsService,
  ) {}

  onModuleInit(): void {
    registerStorageProviderResolver(() => {
      const v = this.cms.get("storage")?.value as { provider?: unknown } | undefined
      const p = v?.provider
      return p === "s3" || p === "cloudinary" || p === "local"
        ? (p as StorageProvider)
        : undefined
    })
  }

  status() {
    return getStorageStatus()
  }

  async test() {
    const status = getStorageStatus()
    try {
      const storage = getStorage()
      const r = await storage.put("storage-test", "test.png", TEST_PNG, "image/png")
      const back = await storage.read(r.key)
      // Best-effort cleanup; failure to delete must not fail the test result.
      await storage.delete(r.key).catch(() => undefined)
      return {
        ok: !!back,
        url: r.url,
        key: r.key,
        reason: back ? undefined : "Upload succeeded but read-back returned nothing",
        ...status,
      }
    } catch (err) {
      return {
        ok: false,
        reason: err instanceof Error ? err.message : "Storage test failed",
        ...status,
      }
    }
  }
}

@UseGuards(AdminGuard)
@Controller("admin/storage")
class StorageController {
  constructor(
    @Inject(StorageService) private readonly svc: StorageService,
  ) {}

  @Get("status")
  status() {
    return this.svc.status()
  }

  @Post("test")
  test() {
    return this.svc.test()
  }
}

@Module({
  imports: [AdminCmsModule],
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
