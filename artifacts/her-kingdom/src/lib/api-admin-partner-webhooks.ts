import { nestFetch } from "./api-nest"

export type PartnerWebhookEndpoint = {
  id: string
  partnerId: string
  partnerType: string
  url: string
  events: string[]
  isActive: boolean
  hasSecret: boolean
  createdAt: string
  updatedAt: string
}

export type PartnerWebhookDelivery = {
  id: string
  endpointId: string
  event: string
  status: string
  responseCode: number | null
  error: string | null
  createdAt: string
}

export const apiAdminPartnerWebhooks = {
  list: (partnerId?: string) =>
    nestFetch<PartnerWebhookEndpoint[]>(
      partnerId
        ? `/admin/partner-webhooks?partnerId=${encodeURIComponent(partnerId)}`
        : "/admin/partner-webhooks",
    ),
  register: (body: {
    id?: string
    partnerId: string
    partnerType?: string
    url: string
    secret?: string
    events?: string[]
    isActive?: boolean
  }) =>
    nestFetch<PartnerWebhookEndpoint>("/admin/partner-webhooks", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deliveries: (limit = 50) =>
    nestFetch<PartnerWebhookDelivery[]>(`/admin/partner-webhooks/deliveries?limit=${limit}`),
  test: (body: { partnerId: string; event?: string }) =>
    nestFetch<{ dispatched: number; delivered: number }>("/admin/partner-webhooks/test", {
      method: "POST",
      body: JSON.stringify(body),
    }),
}
