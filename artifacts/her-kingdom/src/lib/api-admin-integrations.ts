import { nestFetch } from "./api-nest"

export type IntegrationsChecklist = Record<
  string,
  { configured: boolean; vars: Array<{ key: string; configured: boolean; hint?: string }> }
>

export type ChannelTestResult = { ok: boolean; skipped?: boolean; reason?: string; id?: string }

export const apiAdminIntegrations = {
  checklist: () => nestFetch<IntegrationsChecklist>("/admin/integrations/checklist"),
  testEmail: (to: string) =>
    nestFetch<ChannelTestResult>("/admin/integrations/test/email", {
      method: "POST",
      body: JSON.stringify({ to }),
    }),
  testSms: (to: string, message?: string) =>
    nestFetch<ChannelTestResult>("/admin/integrations/test/sms", {
      method: "POST",
      body: JSON.stringify({ to, message }),
    }),
  testWhatsApp: (to: string, message?: string) =>
    nestFetch<ChannelTestResult>("/admin/integrations/test/whatsapp", {
      method: "POST",
      body: JSON.stringify({ to, message }),
    }),
}
