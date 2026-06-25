/**
 * Admin integrations checklist + channel test sends.
 *
 *   GET  /api/v2/admin/integrations/checklist
 *   POST /api/v2/admin/integrations/test/email
 *   POST /api/v2/admin/integrations/test/sms
 *   POST /api/v2/admin/integrations/test/whatsapp
 */
import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Module,
  Post,
  UseGuards,
} from "@nestjs/common"
import { AdminGuard, RequirePerm } from "../common/admin-guard"
import { EmailModule, EmailService } from "./email.module"
import { SmsModule, SmsService } from "./sms.module"
import { WhatsAppModule, WhatsAppService } from "./whatsapp.module"

type EnvRow = { key: string; configured: boolean; hint?: string }
type ChannelChecklist = {
  configured: boolean
  vars: EnvRow[]
}

function row(key: string, hint?: string): EnvRow {
  const val = process.env[key]
  return { key, configured: !!(val && String(val).trim()), hint }
}

@Controller("admin/integrations")
@UseGuards(AdminGuard)
@RequirePerm("integrations.manage")
class IntegrationsAdminController {
  constructor(
    @Inject(EmailService) private readonly email: EmailService,
    @Inject(SmsService) private readonly sms: SmsService,
    @Inject(WhatsAppService) private readonly whatsapp: WhatsAppService,
  ) {}

  @Get("checklist")
  checklist(): Record<string, ChannelChecklist> {
    const emailVars = [
      row("RESEND_API_KEY", "Resend API key"),
      row("RESEND_FROM_EMAIL", "Verified sender address"),
    ]
    const smsVars = [
      row("AFRICASTALKING_API_KEY"),
      row("AFRICASTALKING_USERNAME"),
      row("TWILIO_ACCOUNT_SID"),
      row("TWILIO_AUTH_TOKEN"),
    ]
    const waVars = [
      row("WHATSAPP_ACCESS_TOKEN"),
      row("WHATSAPP_PHONE_NUMBER_ID"),
      row("TWILIO_ACCOUNT_SID", "Twilio confirmations path"),
    ]
    const videoVars = [row("DAILY_API_KEY", "Daily.co video rooms")]

    return {
      email: {
        configured: emailVars.some((v) => v.configured),
        vars: emailVars,
      },
      sms: {
        configured: this.sms.status().configured,
        vars: smsVars,
      },
      whatsapp: {
        configured: this.whatsapp.isEnabled(),
        vars: waVars,
      },
      video: {
        configured: videoVars[0]!.configured,
        vars: videoVars,
      },
    }
  }

  @Post("test/email")
  async testEmail(@Body() body: { to?: string }) {
    const to = String(body?.to ?? "").trim()
    if (!to) throw new HttpException("`to` email required", HttpStatus.BAD_REQUEST)
    const r = await this.email.send({
      to,
      template: "generic",
      subject: "Shaniid RX — integration test",
      data: {
        message:
          "This is a test email from Admin → Integrations. If you received this, Resend is configured correctly.",
      },
    })
    return r
  }

  @Post("test/sms")
  async testSms(@Body() body: { to?: string; message?: string }) {
    const to = String(body?.to ?? "").trim()
    if (!to) throw new HttpException("`to` phone required (E.164)", HttpStatus.BAD_REQUEST)
    const message =
      String(body?.message ?? "").trim() ||
      "Shaniid RX test SMS — your SMS integration is working."
    return this.sms.send({ to, message })
  }

  @Post("test/whatsapp")
  async testWhatsApp(@Body() body: { to?: string; message?: string }) {
    const to = String(body?.to ?? "").trim()
    if (!to) throw new HttpException("`to` WhatsApp number required", HttpStatus.BAD_REQUEST)
    const message =
      String(body?.message ?? "").trim() ||
      "Shaniid RX test — your WhatsApp channel is configured."
    return this.whatsapp.send({ to, body: message })
  }
}

@Module({
  imports: [EmailModule, SmsModule, WhatsAppModule],
  controllers: [IntegrationsAdminController],
})
export class IntegrationsAdminModule {}
