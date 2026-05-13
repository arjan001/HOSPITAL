"use client"

import { toast } from "sonner"

/**
 * Branded notification helper. Use this everywhere instead of calling `toast`
 * directly so that messages keep a consistent voice and styling. Wraps Sonner
 * with sensible defaults and a `promise` helper for async operations.
 */

type NotifyOpts = {
  description?: string
  duration?: number
  action?: { label: string; onClick: () => void }
}

function withOpts(opts?: NotifyOpts) {
  if (!opts) return undefined
  return {
    description: opts.description,
    duration: opts.duration,
    action: opts.action,
  }
}

export const notify = {
  success(message: string, opts?: NotifyOpts) {
    return toast.success(message, withOpts(opts))
  },
  error(message: string, opts?: NotifyOpts) {
    return toast.error(message, withOpts({ duration: 5000, ...opts }))
  },
  warning(message: string, opts?: NotifyOpts) {
    return toast.warning(message, withOpts(opts))
  },
  info(message: string, opts?: NotifyOpts) {
    return toast.info(message, withOpts(opts))
  },
  loading(message: string, opts?: NotifyOpts) {
    return toast.loading(message, withOpts(opts))
  },
  dismiss(id?: string | number) {
    toast.dismiss(id)
  },
  /** `notify.promise(fetchFoo(), { loading: "...", success: "...", error: "..." })` */
  promise<T>(
    promise: Promise<T>,
    msgs: {
      loading: string
      success: string | ((value: T) => string)
      error: string | ((err: unknown) => string)
    },
  ) {
    return toast.promise(promise, msgs)
  },
  /** Branded "saved" message — use after admin save flows. */
  saved(label = "Changes saved") {
    return toast.success(label, { duration: 2400 })
  },
}

export { toast }
