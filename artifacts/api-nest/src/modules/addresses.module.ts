/**
 * Addresses module — customer delivery address book (Postgres-backed).
 *
 * Routes (all scoped to the session cookie / req.sessionId):
 *   GET    /api/v2/me/addresses          — list all addresses for the session
 *   POST   /api/v2/me/addresses          — create a new address
 *   PUT    /api/v2/me/addresses/:id      — update a specific address
 *   DELETE /api/v2/me/addresses/:id      — remove a specific address
 *
 * Data model:
 *   Rows in the `addresses` table keyed by `userId` (resolved from the session
 *   via common/session-user.ts). Creating an address with isDefault=true flips
 *   every other address for that user to isDefault=false.
 *
 * Note on @Inject(AddressesService):
 *   tsx/esbuild does not emit emitDecoratorMetadata — explicit @Inject(Token) on
 *   every controller constructor is a project-wide rule.
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Module,
  Param,
  Post,
  Put,
  Req,
} from "@nestjs/common"
import type { Request } from "express"
import { and, asc, eq } from "drizzle-orm"
import { db, addresses as addressesTable } from "@workspace/db"
import { ensureUserId } from "../common/session-user"
import { newId } from "../common/repository"

export type Address = {
  id: string
  label: string
  fullName: string
  phone: string
  line1: string
  line2: string
  city: string
  region: string
  isDefault: boolean
  createdAt: string
}

type AddressInput = Partial<Omit<Address, "id" | "createdAt">>

function toAddress(r: typeof addressesTable.$inferSelect): Address {
  return {
    id: r.id,
    label: r.label,
    fullName: r.fullName,
    phone: r.phone,
    line1: r.line1,
    line2: r.line2 ?? "",
    city: r.city,
    region: r.region,
    isDefault: r.isDefault,
    createdAt: r.createdAt.toISOString(),
  }
}

@Injectable()
class AddressesService {
  async list(sid: string): Promise<Address[]> {
    const uid = await ensureUserId(sid)
    const rows = await db
      .select()
      .from(addressesTable)
      .where(eq(addressesTable.userId, uid))
      .orderBy(asc(addressesTable.createdAt))
    return rows.map(toAddress)
  }

  async create(sid: string, data: AddressInput): Promise<Address> {
    const uid = await ensureUserId(sid)
    const existing = await db
      .select({ id: addressesTable.id })
      .from(addressesTable)
      .where(eq(addressesTable.userId, uid))
    const isDefault = existing.length === 0 || !!data.isDefault
    if (isDefault) {
      await db.update(addressesTable).set({ isDefault: false }).where(eq(addressesTable.userId, uid))
    }
    const rows = await db
      .insert(addressesTable)
      .values({
        id: newId("addr"),
        userId: uid,
        label: data.label?.trim() || "Home",
        fullName: data.fullName?.trim() || "",
        phone: data.phone?.trim() || "",
        line1: data.line1?.trim() || "",
        line2: data.line2?.trim() || null,
        city: data.city?.trim() || "",
        region: data.region?.trim() || "",
        isDefault,
      })
      .returning()
    return toAddress(rows[0])
  }

  async update(sid: string, id: string, patch: AddressInput): Promise<Address> {
    const uid = await ensureUserId(sid)
    if (patch.isDefault) {
      await db.update(addressesTable).set({ isDefault: false }).where(eq(addressesTable.userId, uid))
    }
    const set: Partial<typeof addressesTable.$inferInsert> = { updatedAt: new Date() }
    if (patch.label !== undefined) set.label = patch.label.trim() || "Home"
    if (patch.fullName !== undefined) set.fullName = patch.fullName
    if (patch.phone !== undefined) set.phone = patch.phone
    if (patch.line1 !== undefined) set.line1 = patch.line1
    if (patch.line2 !== undefined) set.line2 = patch.line2 || null
    if (patch.city !== undefined) set.city = patch.city
    if (patch.region !== undefined) set.region = patch.region
    if (patch.isDefault !== undefined) set.isDefault = patch.isDefault
    const rows = await db
      .update(addressesTable)
      .set(set)
      .where(and(eq(addressesTable.id, id), eq(addressesTable.userId, uid)))
      .returning()
    if (!rows[0]) throw new HttpException("Address not found", HttpStatus.NOT_FOUND)
    return toAddress(rows[0])
  }

  async remove(sid: string, id: string): Promise<{ ok: boolean }> {
    const uid = await ensureUserId(sid)
    const rows = await db
      .delete(addressesTable)
      .where(and(eq(addressesTable.id, id), eq(addressesTable.userId, uid)))
      .returning({ id: addressesTable.id })
    if (!rows[0]) throw new HttpException("Address not found", HttpStatus.NOT_FOUND)
    return { ok: true }
  }
}

@Controller("me/addresses")
class AddressesController {
  constructor(@Inject(AddressesService) private readonly svc: AddressesService) {}

  @Get()
  list(@Req() req: Request) {
    return this.svc.list(req.sessionId)
  }

  @Post()
  create(@Req() req: Request, @Body() body: AddressInput) {
    return this.svc.create(req.sessionId, body ?? {})
  }

  @Put(":id")
  update(@Req() req: Request, @Param("id") id: string, @Body() body: AddressInput) {
    return this.svc.update(req.sessionId, id, body ?? {})
  }

  @Delete(":id")
  remove(@Req() req: Request, @Param("id") id: string) {
    return this.svc.remove(req.sessionId, id)
  }
}

@Module({
  controllers: [AddressesController],
  providers: [AddressesService],
})
export class AddressesModule {}
