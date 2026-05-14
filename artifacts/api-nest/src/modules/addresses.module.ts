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
import { InMemoryRepository, newId } from "../common/repository"

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

@Injectable()
class AddressesService {
  private repo = new InMemoryRepository<Address>()

  list(sid: string): Address[] {
    return this.repo.listFor(sid)
  }

  create(sid: string, data: AddressInput): Address {
    const list = this.repo.listFor(sid)
    const isDefault = list.length === 0 || !!data.isDefault
    if (isDefault) {
      this.repo.setFor(
        sid,
        list.map((a) => ({ ...a, isDefault: false })),
      )
    }
    const addr: Address = {
      id: newId("addr"),
      label: data.label?.trim() || "Home",
      fullName: data.fullName?.trim() || "",
      phone: data.phone?.trim() || "",
      line1: data.line1?.trim() || "",
      line2: data.line2?.trim() || "",
      city: data.city?.trim() || "",
      region: data.region?.trim() || "",
      isDefault,
      createdAt: new Date().toISOString(),
    }
    return this.repo.add(sid, addr)
  }

  update(sid: string, id: string, patch: AddressInput): Address {
    if (patch.isDefault) {
      const list = this.repo.listFor(sid).map((a) =>
        a.id === id ? a : { ...a, isDefault: false },
      )
      this.repo.setFor(sid, list)
    }
    const updated = this.repo.update(sid, id, patch as Partial<Address>)
    if (!updated) throw new HttpException("Address not found", HttpStatus.NOT_FOUND)
    return updated
  }

  remove(sid: string, id: string): { ok: boolean } {
    const ok = this.repo.remove(sid, id)
    if (!ok) throw new HttpException("Address not found", HttpStatus.NOT_FOUND)
    return { ok }
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
