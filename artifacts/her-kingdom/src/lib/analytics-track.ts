/** Production-safe paths for analytics ingest + admin dashboard (api-nest /api/v2). */
const BASE = "/api/v2"

export const analyticsUrls = {
  trackView: `${BASE}/track-view`,
  trackEvent: `${BASE}/track-event`,
  trackAbandoned: `${BASE}/track-abandoned`,
  adminSummary: (days: number) => `${BASE}/admin/analytics?days=${days}`,
  adminRealtime: `${BASE}/admin/analytics/realtime`,
} as const
