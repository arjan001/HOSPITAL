/**
 * Postgres-backed newsletter subscribers for admin + campaigns audience resolution.
 */
import { useCallback, useEffect, useRef } from "react"
import useSWR from "swr"
import { apiAdminNewsletter, type NewsletterSubscriberDto } from "./api-admin-newsletter"

const SAVE_DEBOUNCE_MS = 300

export function useNewsletterSubscribers(defaults: NewsletterSubscriberDto[] = []) {
  const { data, error, isLoading, mutate } = useSWR(
    "/admin/newsletter/subscribers",
    apiAdminNewsletter.listSubscribers,
    { fallbackData: defaults, revalidateOnFocus: true },
  )
  const latest = useRef(defaults)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (data) latest.current = data
  }, [data])

  const setSubscribers = useCallback(
    (next: NewsletterSubscriberDto[] | ((prev: NewsletterSubscriberDto[]) => NewsletterSubscriberDto[])) => {
      const resolved = typeof next === "function" ? next(latest.current) : next
      latest.current = resolved
      void mutate(resolved, { revalidate: false })
    },
    [mutate],
  )

  const toggleActive = useCallback(
    (sub: NewsletterSubscriberDto) => {
      const nextActive = !sub.is_active
      setSubscribers((prev) =>
        prev.map((s) => (s.id === sub.id ? { ...s, is_active: nextActive } : s)),
      )
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        void apiAdminNewsletter
          .patchSubscriber(sub.id, { is_active: nextActive })
          .then((saved) => {
            setSubscribers((prev) => prev.map((s) => (s.id === sub.id ? saved : s)))
          })
          .catch(() => void mutate())
      }, SAVE_DEBOUNCE_MS)
    },
    [mutate, setSubscribers],
  )

  const remove = useCallback(
    (id: string) => {
      setSubscribers((prev) => prev.filter((s) => s.id !== id))
      void apiAdminNewsletter.deleteSubscriber(id).catch(() => void mutate())
    },
    [mutate, setSubscribers],
  )

  const errMsg = error instanceof Error ? error.message : error ? String(error) : null
  return {
    subscribers: data ?? defaults,
    loading: isLoading,
    error: errMsg,
    toggleActive,
    remove,
    refresh: () => mutate(),
  }
}

/** Module-level cache for sync audience resolution in campaigns.tsx */
let campaignSubscriberCache: NewsletterSubscriberDto[] = []

export function getCampaignNewsletterSubscribers(): NewsletterSubscriberDto[] {
  return campaignSubscriberCache
}

export function setCampaignNewsletterSubscribers(subs: NewsletterSubscriberDto[]) {
  campaignSubscriberCache = subs
}

export function useCampaignNewsletterAudience() {
  const { subscribers, loading } = useNewsletterSubscribers()
  useEffect(() => {
    setCampaignNewsletterSubscribers(subscribers)
  }, [subscribers])
  return { subscribers, loading }
}
