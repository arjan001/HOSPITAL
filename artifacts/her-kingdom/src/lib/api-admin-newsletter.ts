/**
 * Admin newsletter subscriber API (/api/v2/admin/newsletter/subscribers).
 */
import { nestFetch } from "./api-nest"

export type NewsletterSubscriberDto = {
  id: string
  email: string
  is_active: boolean
  subscribed_at: string
  source?: string
}

export const apiAdminNewsletter = {
  listSubscribers: () =>
    nestFetch<NewsletterSubscriberDto[]>("/admin/newsletter/subscribers"),
  patchSubscriber: (id: string, patch: { is_active?: boolean }) =>
    nestFetch<NewsletterSubscriberDto>(`/admin/newsletter/subscribers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteSubscriber: (id: string) =>
    nestFetch<{ ok: true }>(`/admin/newsletter/subscribers/${id}`, { method: "DELETE" }),
}
